import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const allowedRoles = new Set(["farmer", "distributor", "retailer", "procurement", "warehouse", "transporter", "auditor"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: auth, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !auth.user) return respond({ error: "Invalid session" }, 401);
    const { data: admin } = await supabase.from("profiles").select("role").eq("user_id", auth.user.id).maybeSingle();
    if (admin?.role !== "admin") return respond({ error: "Administrator role required" }, 403);
    const body = await req.json();
    const profileId = String(body?.profileId ?? "");
    const role = String(body?.role ?? "");
    if (!profileId || !allowedRoles.has(role)) return respond({ error: "Invalid profile or requested role" }, 400);
    const { data: applicant, error: applicantError } = await supabase.from("profiles")
      .select("id, requested_role, role").eq("id", profileId).maybeSingle();
    if (applicantError || !applicant || applicant.role !== "consumer" || applicant.requested_role !== role) {
      return respond({ error: "Role request was not found or no longer matches" }, 409);
    }
    const { error: updateError } = await supabase.from("profiles").update({ role }).eq("id", profileId);
    if (updateError) throw updateError;
    return respond({ approved: true, profileId, role, walletAddress: null });
  } catch (error) {
    console.error("approve-role error:", error);
    return respond({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
