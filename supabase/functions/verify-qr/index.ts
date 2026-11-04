import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { qrCode } = await req.json();

    // Normalize and attempt to extract batch id from new URLs like /b/:id/:unique
    let batchId: number | null = null;
    try {
      const url = new URL(qrCode);
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('b');
      if (idx >= 0 && parts[idx + 1]) {
        const parsed = parseInt(parts[idx + 1]);
        if (!Number.isNaN(parsed)) batchId = parsed;
      }
    } catch (_) {}

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get batch information with full supply chain data
    const baseSelect = supabase
      .from('batches')
      .select(`
        *,
        crops:crop_id (
          *,
          farmer:farmer_id (
            id,
            first_name,
            last_name,
            phone,
            location
          )
        ),
        transactions (
          *,
          buyer:buyer_id (
            id,
            first_name,
            last_name,
            role
          ),
          seller:seller_id (
            id,
            first_name,
            last_name
          )
        ),
        blockchain_records (
          *
        )
      `)
    
    const { data: batchById } = batchId
      ? await baseSelect.eq('id', batchId).maybeSingle()
      : { data: null } as any;
    
    const { data: batchByQr } = !batchById
      ? await baseSelect.eq('qr_code', qrCode).maybeSingle()
      : { data: null } as any;
    
    const batch = batchById || batchByQr;

    if (!batch) {
      return new Response(
        JSON.stringify({ error: 'QR code not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build supply chain journey
    const journey: any[] = [];

    // Farmer registration
    if (batch?.crops) {
      journey.push({
        step: 'Crop Registration',
        actor: 'Originating producer',
        role: 'Farmer',
        timestamp: batch.crops.created_at,
        location: batch.crops.region || 'Region not disclosed',
        details: {
          crop: batch.crops.name,
          quantity: `${batch.crops.quantity ?? batch.quantity} ${batch.crops.unit ?? batch.unit}`,
          harvestDate: batch.crops.harvest_date,
          certifications: batch.crops.certifications || []
        },
        verified: false
      });
    }

    // Add transactions to journey
    (batch.transactions || []).forEach((transaction: any) => {
      journey.push({
        step: 'Purchase',
        actor: 'Supply chain recipient',
        role: transaction?.buyer?.role || 'Distributor',
        timestamp: transaction.created_at,
        details: {
          quantity: `${transaction.quantity} ${batch.unit}`,
          price: `₹${transaction.total_price}`,
          status: transaction.status
        },
        verified: false
      });
    });

    // Calculate fair price verification
    const farmerPrice = batch?.crops?.price_per_unit ?? batch?.price_per_unit;
    const predictedPrice = batch?.crops?.predicted_price ?? null;
    const fairPriceAchieved = predictedPrice ? (farmerPrice >= predictedPrice * 0.9) : true;

    // A database flag alone is never proof. Recheck the confirmed receipt and event.
    const chainRecord = (batch.blockchain_records || []).find((record: any) =>
      record.record_type === 'crop_registration' && record.transaction_hash && record.contract_address
    );
    const canonicalLotData = batch.crops ? {
      schema: 'harvestlink.pds.lot.v1',
      lotId: String(batch.id),
      commodity: String(batch.crops.name).trim().toLowerCase(),
      quantity: Number(batch.crops.quantity).toFixed(3),
      unit: String(batch.crops.unit || 'kg').trim().toLowerCase(),
      description: String(batch.crops.description || ''),
      harvestDate: batch.crops.harvest_date || null,
      certifications: (Array.isArray(batch.crops.certifications) ? batch.crops.certifications : []).map((value: unknown) => String(value).trim()).sort(),
      pricePerUnit: Number(batch.crops.price_per_unit).toFixed(2),
      region: String(batch.crops.region || ''),
      createdAt: batch.crops.created_at,
    } : null;
    const recomputedDataHash = canonicalLotData
      ? ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(canonicalLotData)))
      : null;
    let blockchainVerified = false;
    let chainVerification: any = chainRecord
      ? { status: 'unavailable', transactionHash: chainRecord.transaction_hash }
      : { status: 'not_submitted' };
    const rpcUrl = Deno.env.get('ETHEREUM_RPC_URL');
    const expectedChainId = Deno.env.get('ETHEREUM_CHAIN_ID');
    const expectedContract = Deno.env.get('HARVESTLINK_CONTRACT_ADDRESS');
    if (chainRecord && rpcUrl && expectedChainId && expectedContract) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        const headBlock = await provider.getBlockNumber();
        const minimumConfirmations = Math.max(1, Number(Deno.env.get('ETHEREUM_CONFIRMATIONS') ?? '2'));
        const receipt = await provider.getTransactionReceipt(chainRecord.transaction_hash);
        const confirmations = receipt ? headBlock - receipt.blockNumber + 1 : 0;
        const iface = new ethers.Interface([
          'event LotRegistered(bytes32 indexed lotId, bytes32 indexed commodityCode, address indexed originator, address custodian, uint128 quantity, bytes32 unitCode, bytes32 dataHash, bytes32 parentId)',
        ]);
        const log = receipt?.logs.find((entry) => {
          if (ethers.getAddress(entry.address) !== ethers.getAddress(expectedContract)) return false;
          try { return iface.parseLog(entry)?.name === 'LotRegistered'; } catch { return false; }
        });
        const parsed = log ? iface.parseLog(log) : null;
        const expectedLot = ethers.id(String(batch.id));
        blockchainVerified = network.chainId.toString() === String(expectedChainId)
          && chainRecord.chain_id === String(expectedChainId)
          && ethers.getAddress(chainRecord.contract_address) === ethers.getAddress(expectedContract)
          && receipt?.status === 1
          && confirmations >= minimumConfirmations
          && Boolean(parsed)
          && String(parsed?.args.lotId).toLowerCase() === expectedLot.toLowerCase()
          && recomputedDataHash?.toLowerCase() === `0x${chainRecord.hash}`.toLowerCase()
          && String(parsed?.args.dataHash).toLowerCase() === `0x${chainRecord.hash}`.toLowerCase();
        chainVerification = {
          status: blockchainVerified ? 'confirmed' : (receipt?.status === 1 && confirmations < minimumConfirmations ? 'pending_confirmation' : 'unverified'),
          chainId: chainRecord.chain_id,
          contractAddress: chainRecord.contract_address,
          transactionHash: chainRecord.transaction_hash,
          blockNumber: chainRecord.block_number,
          explorerUrl: Deno.env.get('ETHEREUM_EXPLORER_URL')
            ? `${Deno.env.get('ETHEREUM_EXPLORER_URL')!.replace(/\/$/, '')}/tx/${chainRecord.transaction_hash}`
            : null,
        };
      } catch (chainError) {
        console.error('On-chain QR verification failed:', chainError);
        chainVerification = { status: 'unavailable' };
      }
    }
    if (journey.length > 0) journey[0].verified = blockchainVerified;

    const verificationResult = {
      success: true,
      batch: {
        id: batch.id,
        batchNumber: batch.batch_number,
        qrCode: batch.qr_code,
        status: batch.status
      },
      product: {
        name: batch?.crops?.name || 'Unknown',
        quantity: `${batch.quantity} ${batch.unit}`,
        pricePerUnit: `₹${batch.price_per_unit}`,
        description: batch?.crops?.description || '',
        harvestDate: batch?.crops?.harvest_date || null,
        certifications: (batch?.crops?.certifications as any) || []
      },
      farmer: {
        name: 'Verified producer',
        location: batch?.crops?.region || 'Region not disclosed',
        contact: ''
      },
      verification: {
        blockchainVerified,
        chain: chainVerification,
        fairPriceAchieved,
        recordsCount: batch.blockchain_records.length,
        lastVerified: batch.blockchain_records[0]?.timestamp
      },
      supplyChain: journey.sort((a: any, b: any) => new Date(a.timestamp as any) as any - new Date(b.timestamp as any) as any),
      analytics: {
        farmerPrice: farmerPrice,
        predictedPrice: predictedPrice,
        priceDeviation: predictedPrice ? ((farmerPrice - predictedPrice) / predictedPrice * 100).toFixed(1) : null,
        transactionCount: batch.transactions.length
      }
    };

    return new Response(
      JSON.stringify(verificationResult),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in verify-qr function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
