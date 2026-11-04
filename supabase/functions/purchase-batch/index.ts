import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return new Response(JSON.stringify({
    error: "Database-only purchase records are retired. Execute the required custody or distribution transition on the configured Ethereum contract.",
  }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
