import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

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
    // Validate auth header but allow function to be called with anon key in some dev setups
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');

    // Initialize Supabase client using service role for server-side operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to resolve user from auth header if present
    let user: any = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (!userError && userData?.user) {
        user = userData.user;
      } else {
        // Log and continue — we'll still validate farmer profile from DB when possible
        console.warn('Could not resolve user from token:', userError?.message ?? 'unknown');
      }
    }

    const body = await req.json().catch(() => ({}));
    const cropData = body?.cropData ?? body;
    if (!cropData || !cropData.name) {
      return new Response(JSON.stringify({ error: 'Missing cropData or name' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get farmer profile by user_id if user resolved, otherwise attempt to find profile by farmer_wallet (fallback)
    let profile: any = null;
    if (user?.id) {
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!pErr) profile = p;
    }

    // If no profile via auth token, try to match by supplied farmerWallet
    if (!profile && cropData.farmerWallet) {
      const { data: p2, error: p2Err } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('wallet_address', cropData.farmerWallet)
        .limit(1)
        .maybeSingle();
      if (!p2Err) profile = p2;
    }

    if (!profile || profile.role !== 'farmer') {
      return new Response(JSON.stringify({ error: 'Only farmers can register crops' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate batch number
    const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Insert crop
    const { data: cropRows, error: cropError } = await supabase
      .from('crops')
      .insert([{
        farmer_id: profile.id,
        name: cropData.name,
        quantity: cropData.quantity,
        unit: cropData.unit || 'kg',
        price_per_unit: cropData.pricePerUnit,
        predicted_price: cropData.predictedPrice,
        description: cropData.description,
        harvest_date: cropData.harvestDate,
        location: cropData.location,
        certifications: cropData.certifications || [],
        msp_per_kg: cropData.mspPerKg || null,
        farmer_wallet: cropData.farmerWallet || null,
        image_hash: cropData.imageHash || null
      }])
      .select();

    if (cropError) {
      console.error('Crop insert error:', cropError);
      return new Response(JSON.stringify({ error: 'Failed to insert crop', detail: cropError.message ?? cropError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const crop = Array.isArray(cropRows) ? cropRows[0] : cropRows;

    // Create batch with temporary QR
    const { data: batchRows, error: batchError } = await supabase
      .from('batches')
      .insert([{
        crop_id: crop?.id ?? null,
        batch_number: batchNumber,
        qr_code: 'PENDING',
        quantity: cropData.quantity,
        unit: cropData.unit || 'kg',
        price_per_unit: cropData.pricePerUnit
      }])
      .select();

    if (batchError) {
      console.error('Batch insert error:', batchError);
      return new Response(JSON.stringify({ error: 'Failed to create batch', detail: batchError.message ?? batchError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const batch = Array.isArray(batchRows) ? batchRows[0] : batchRows;

    // Ensure batch exists before referencing id
    if (!batch || !batch.id) {
      console.error('Batch missing after insert:', batchRows);
      return new Response(JSON.stringify({ error: 'Batch creation returned unexpected result' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build public QR URL using our external site and update batch
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const qrCode = `https://krishtisetu.vercel.app/b/${encodeURIComponent(batch.id)}/${encodeURIComponent(unique)}`;

    const { error: updateErr } = await supabase
      .from('batches')
      .update({ qr_code: qrCode })
      .eq('id', batch.id);

    if (updateErr) {
      console.error('Failed to update batch qr_code:', updateErr);
    }

    // Create blockchain record (best-effort)
    try {
      const blockchainData = {
        farmer: profile.id,
        crop: crop.name,
        quantity: crop.quantity,
        price: crop.price_per_unit,
        msp_per_kg: crop.msp_per_kg,
        farmer_wallet: crop.farmer_wallet,
        ipfs_hash: crop.image_hash,
        timestamp: new Date().toISOString(),
        location: crop.location
      };

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(blockchainData));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { error: blockchainError } = await supabase
        .from('blockchain_records')
        .insert([{
          batch_id: batch.id,
          record_type: 'crop_registration',
          data: blockchainData,
          hash: hashHex,
          verified: true
        }]);

      if (blockchainError) {
        console.error('Blockchain record error:', blockchainError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          crop: crop,
          batch: { ...batch, qr_code: qrCode },
          qrCode: qrCode,
          blockchainHash: hashHex
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (e) {
      console.error('Error creating blockchain record:', e);
      return new Response(JSON.stringify({ success: true, crop: crop, batch: { ...batch, qr_code: qrCode }, qrCode }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error in register-crop function:', error);
    return new Response(
      JSON.stringify({ error: (error as any)?.message ?? String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});