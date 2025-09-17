import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Invalid user token');

    const { batchId, distributorUserId, route, vehicleCode } = await req.json();
    if (!batchId || !distributorUserId) throw new Error('batchId and distributorUserId are required');

    // Get distributor profile
    const { data: distributor } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('user_id', distributorUserId)
      .single();

    if (!distributor || distributor.role !== 'distributor') {
      throw new Error('Distributor profile not found or invalid role');
    }

    // Update batch status to in_transit
    await supabase
      .from('batches')
      .update({ status: 'in_transit' })
      .eq('id', batchId);

    // Record assignment in blockchain_records
    const record = {
      batch_id: batchId,
      record_type: 'assigned_distributor',
      data: {
        distributor_id: distributor.id,
        distributor_name: `${distributor.first_name} ${distributor.last_name}`.trim(),
        route: route || null,
        vehicle_code: vehicleCode || null,
        timestamp: new Date().toISOString(),
      },
      verified: true,
    };

    const { error: recError } = await supabase.from('blockchain_records').insert(record);
    if (recError) throw recError;

    return new Response(
      JSON.stringify({ success: true, message: 'Distributor assigned', assignment: record }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('assign-distributor error:', error);
    return new Response(
      JSON.stringify({ error: (error as any).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});


