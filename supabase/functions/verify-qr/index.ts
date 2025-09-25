import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
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
    const farmerFirst = batch?.crops?.farmer?.first_name || '';
    const farmerLast = batch?.crops?.farmer?.last_name || '';
    if (batch?.crops) {
      journey.push({
        step: 'Crop Registration',
        actor: `${farmerFirst} ${farmerLast}`.trim() || 'Unknown Farmer',
        role: 'Farmer',
        timestamp: batch.crops.created_at,
        location: batch.crops.location,
        details: {
          crop: batch.crops.name,
          quantity: `${batch.crops.quantity ?? batch.quantity} ${batch.crops.unit ?? batch.unit}`,
          harvestDate: batch.crops.harvest_date,
          certifications: batch.crops.certifications || []
        },
        verified: true
      });
    }

    // Add transactions to journey
    (batch.transactions || []).forEach((transaction: any) => {
      journey.push({
        step: 'Purchase',
        actor: `${transaction?.buyer?.first_name ?? ''} ${transaction?.buyer?.last_name ?? ''}`.trim() || 'Unknown Buyer',
        role: transaction?.buyer?.role || 'Distributor',
        timestamp: transaction.created_at,
        details: {
          quantity: `${transaction.quantity} ${batch.unit}`,
          price: `₹${transaction.total_price}`,
          status: transaction.status
        },
        verified: true
      });
    });

    // Calculate fair price verification
    const farmerPrice = batch?.crops?.price_per_unit ?? batch?.price_per_unit;
    const predictedPrice = batch?.crops?.predicted_price ?? null;
    const fairPriceAchieved = predictedPrice ? (farmerPrice >= predictedPrice * 0.9) : true;

    // Blockchain verification
    const blockchainVerified = (batch.blockchain_records || []).length > 0 && 
                              (batch.blockchain_records || []).every((record: any) => record.verified);

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
        name: `${farmerFirst} ${farmerLast}`.trim() || 'Unknown Farmer',
        location: batch?.crops?.location || '',
        contact: batch?.crops?.farmer?.phone || ''
      },
      verification: {
        blockchainVerified,
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