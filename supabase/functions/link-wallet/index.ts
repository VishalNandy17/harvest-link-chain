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
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: authData, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !authData.user) return response({ error: "Invalid session" }, 401);

    const body = await req.json();
    const walletAddress = ethers.getAddress(String(body?.walletAddress ?? ""));
    const issuedAt = Number(body?.issuedAt);
    const nonce = String(body?.nonce ?? "");
    const signature = String(body?.signature ?? "");
    if (!Number.isFinite(issuedAt) || Math.abs(Date.now() - issuedAt) > 5 * 60 * 1000 || !/^[0-9a-f-]{36}$/i.test(nonce)) {
      return response({ error: "Wallet proof expired or malformed" }, 400);
    }
    const message = `HarvestLink wallet link\nuser:${authData.user.id}\naddress:${walletAddress}\nissuedAt:${issuedAt}\nnonce:${nonce}`;
    if (ethers.verifyMessage(message, signature) !== walletAddress) return response({ error: "Wallet signature does not match" }, 403);

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("id, wallet_address").eq("user_id", authData.user.id).maybeSingle();
    if (profileError || !profile) return response({ error: "Profile not found" }, 404);
    const { error: updateError } = await supabase.from("profiles")
      .update({ wallet_address: walletAddress }).eq("id", profile.id);
    if (updateError) {
      if (updateError.code === "23505") return response({ error: "This wallet is already linked to another profile" }, 409);
      throw updateError;
    }
    return response({ linked: true, walletAddress });
  } catch (error) {
    console.error("link-wallet error:", error);
    return response({ error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
