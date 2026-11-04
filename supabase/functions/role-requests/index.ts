import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return respond({ error: "Authentication required" }, 401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: auth, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
  if (authError || !auth.user) return respond({ error: "Invalid session" }, 401);
  const { data: admin } = await supabase.from("profiles").select("role").eq("user_id", auth.user.id).maybeSingle();
  if (admin?.role !== "admin") return respond({ error: "Administrator role required" }, 403);
  const { data, error } = await supabase.from("profiles")
    .select("id, first_name, last_name, email, requested_role, wallet_address, created_at")
    .neq("requested_role", "consumer").eq("role", "consumer").order("created_at", { ascending: true });
  if (error) return respond({ error: "Unable to load role applications" }, 500);
  return respond({ requests: data ?? [] });
});
