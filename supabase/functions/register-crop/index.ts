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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { cropData } = await req.json();
    
    // Get farmer profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'farmer') {
      throw new Error('Only farmers can register crops');
    }

    // Generate batch number
    const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Insert crop
    const { data: crop, error: cropError } = await supabase
      .from('crops')
      .insert({
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
      })
      .select()
      .single();

    if (cropError) {
      throw cropError;
    }

    // Create batch with temporary QR
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        crop_id: crop.id,
        batch_number: batchNumber,
        qr_code: 'PENDING',
        quantity: cropData.quantity,
        unit: cropData.unit || 'kg',
        price_per_unit: cropData.pricePerUnit
      })
      .select()
      .single();
    // Build public QR URL using our external site and update batch
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const qrCode = `https://krishtisetu.vercel.app/b/${encodeURIComponent(batch.id)}/${encodeURIComponent(unique)}`;
    await supabase
      .from('batches')
      .update({ qr_code: qrCode })
      .eq('id', batch.id);

    if (batchError) {
      throw batchError;
    }

    // Create blockchain record
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
      .insert({
        batch_id: batch.id,
        record_type: 'crop_registration',
        data: blockchainData,
        hash: hashHex,
        verified: true
      });

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
  } catch (error) {
    console.error('Error in register-crop function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});