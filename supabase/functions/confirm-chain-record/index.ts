import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ethers } from "npm:ethers@6.15.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return response({ error: "Authentication required" }, 401);

    const rpcUrl = Deno.env.get("ETHEREUM_RPC_URL");
    const contractAddress = Deno.env.get("HARVESTLINK_CONTRACT_ADDRESS");
    const configuredChainId = Deno.env.get("ETHEREUM_CHAIN_ID");
    if (!rpcUrl || !contractAddress || !configuredChainId) {
      return response({ error: "Ethereum verification is not configured on the server" }, 503);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.slice("Bearer ".length);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return response({ error: "Invalid session" }, 401);

    const body = await req.json();
    const batchId = String(body?.batchId ?? "");
    const transactionHash = String(body?.transactionHash ?? "");
    const lotId = String(body?.lotId ?? "");
    const submittedChainId = String(body?.chainId ?? "");
    if (!batchId || !ethers.isHexString(transactionHash, 32) || !ethers.isHexString(lotId, 32)) {
      return response({ error: "Invalid batch ID or transaction parameters" }, 400);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (network.chainId.toString() !== configuredChainId || submittedChainId !== configuredChainId) {
      return response({ error: "Transaction was submitted to a different chain" }, 409);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("id, role, wallet_address").eq("user_id", authData.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "farmer") return response({ error: "Farmer profile required" }, 403);

    const { data: batch, error: batchError } = await supabase
      .from("batches").select("id, crop_id, crops!inner(farmer_id, farmer_wallet, name, quantity, unit, description, harvest_date, certifications, price_per_unit, region, created_at)").eq("id", batchId).maybeSingle();
    if (batchError || !batch || (batch.crops as any)?.farmer_id !== profile.id) return response({ error: "Batch not found for this farmer" }, 404);

    const { data: record, error: recordError } = await supabase
      .from("blockchain_records").select("id, hash, data, verified")
      .eq("batch_id", batchId).eq("record_type", "crop_registration").maybeSingle();
    if (recordError || !record) return response({ error: "Pending crop commitment not found" }, 404);
    if (record.verified) return response({ error: "Chain record was already confirmed" }, 409);

    const crop = (batch.crops as any);
    const canonicalLotData = {
      schema: "harvestlink.pds.lot.v1",
      lotId: String(batch.id),
      commodity: String(crop.name).trim().toLowerCase(),
      quantity: Number(crop.quantity).toFixed(3),
      unit: String(crop.unit || "kg").trim().toLowerCase(),
      description: String(crop.description || ""),
      harvestDate: crop.harvest_date || null,
      certifications: (Array.isArray(crop.certifications) ? crop.certifications : []).map((value: unknown) => String(value).trim()).sort(),
      pricePerUnit: Number(crop.price_per_unit).toFixed(2),
      region: String(crop.region || ""),
      createdAt: crop.created_at,
    };
    const recomputedHash = ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(canonicalLotData)));
    if (recomputedHash.toLowerCase() !== `0x${record.hash}`.toLowerCase()) {
      return response({ error: "The crop details no longer match the submitted commitment" }, 409);
    }

    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt || receipt.status !== 1) return response({ error: "Transaction is not mined successfully" }, 409);
    const requiredConfirmations = Math.max(1, Number(Deno.env.get("ETHEREUM_CONFIRMATIONS") ?? "2"));
    const currentBlock = await provider.getBlockNumber();
    if (currentBlock - receipt.blockNumber + 1 < requiredConfirmations) {
      return response({ error: `Transaction is pending confirmation (${currentBlock - receipt.blockNumber + 1}/${requiredConfirmations})` }, 409);
    }
    if (!receipt.to || ethers.getAddress(receipt.to) !== ethers.getAddress(contractAddress)) {
      return response({ error: "Transaction targeted an unexpected contract" }, 400);
    }

    const expectedLotId = ethers.id(batchId);
    if (lotId.toLowerCase() !== expectedLotId.toLowerCase()) return response({ error: "Lot identifier does not match the batch" }, 400);
    const iface = new ethers.Interface([
      "event LotRegistered(bytes32 indexed lotId, bytes32 indexed commodityCode, address indexed originator, address custodian, uint128 quantity, bytes32 unitCode, bytes32 dataHash, bytes32 parentId)",
    ]);
    const eventLog = receipt.logs.find((log) => {
      if (ethers.getAddress(log.address) !== ethers.getAddress(contractAddress)) return false;
      try { return iface.parseLog(log)?.name === "LotRegistered"; } catch { return false; }
    });
    if (!eventLog) return response({ error: "Expected LotRegistered event was not found" }, 400);
    const parsed = iface.parseLog(eventLog)!;
    if (String(parsed.args.lotId).toLowerCase() !== expectedLotId.toLowerCase()) return response({ error: "On-chain lot ID does not match" }, 400);
    if (String(parsed.args.dataHash).toLowerCase() !== `0x${record.hash}`.toLowerCase()) return response({ error: "On-chain commitment does not match the crop record" }, 400);
    if (ethers.getAddress(parsed.args.originator) !== ethers.getAddress(receipt.from)) return response({ error: "Event originator does not match the transaction signer" }, 400);
    const wallet = (batch.crops as any)?.farmer_wallet;
    if (wallet && ethers.getAddress(wallet) !== ethers.getAddress(receipt.from)) return response({ error: "Transaction signer does not match the crop wallet" }, 403);
    if (!profile.wallet_address || ethers.getAddress(profile.wallet_address) !== ethers.getAddress(receipt.from)) {
      return response({ error: "Transaction signer is not the verified wallet linked to this profile" }, 403);
    }

    const { error: updateError } = await supabase.from("blockchain_records").update({
      verified: true,
      transaction_hash: transactionHash,
      chain_id: network.chainId.toString(),
      contract_address: ethers.getAddress(contractAddress),
      event_name: "LotRegistered",
      block_number: receipt.blockNumber,
      log_index: eventLog.index,
      verified_at: new Date().toISOString(),
    }).eq("id", record.id);
    if (updateError) throw updateError;

    return response({
      verified: true,
      chainId: network.chainId.toString(),
      contractAddress: ethers.getAddress(contractAddress),
      transactionHash,
      blockNumber: receipt.blockNumber,
      lotId: expectedLotId,
      dataHash: record.hash,
    });
  } catch (error) {
    console.error("confirm-chain-record error:", error);
    return response({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
