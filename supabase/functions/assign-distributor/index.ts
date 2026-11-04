import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: "Database-only distributor assignment is retired. Submit transferCustody from an authorized wallet through the PDS Operations page.",
  }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
