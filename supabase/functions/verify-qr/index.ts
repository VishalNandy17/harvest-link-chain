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

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get batch information with full supply chain data
    const { data: batch } = await supabase
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
      .eq('qr_code', qrCode)
      .single();

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
    const journey = [];

    // Farmer registration
    journey.push({
      step: 'Crop Registration',
      actor: `${batch.crops.farmer.first_name} ${batch.crops.farmer.last_name}`,
      role: 'Farmer',
      timestamp: batch.crops.created_at,
      location: batch.crops.location,
      details: {
        crop: batch.crops.name,
        quantity: `${batch.crops.quantity} ${batch.crops.unit}`,
        harvestDate: batch.crops.harvest_date,
        certifications: batch.crops.certifications
      },
      verified: true
    });

    // Add transactions to journey
    batch.transactions.forEach(transaction => {
      journey.push({
        step: 'Purchase',
        actor: `${transaction.buyer.first_name} ${transaction.buyer.last_name}`,
        role: transaction.buyer.role,
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
    const farmerPrice = batch.crops.price_per_unit;
    const predictedPrice = batch.crops.predicted_price;
    const fairPriceAchieved = predictedPrice ? (farmerPrice >= predictedPrice * 0.9) : true;

    // Blockchain verification
    const blockchainVerified = batch.blockchain_records.length > 0 && 
                              batch.blockchain_records.every(record => record.verified);

    const verificationResult = {
      success: true,
      batch: {
        id: batch.id,
        batchNumber: batch.batch_number,
        qrCode: batch.qr_code,
        status: batch.status
      },
      product: {
        name: batch.crops.name,
        quantity: `${batch.quantity} ${batch.unit}`,
        pricePerUnit: `₹${batch.price_per_unit}`,
        description: batch.crops.description,
        harvestDate: batch.crops.harvest_date,
        certifications: batch.crops.certifications || []
      },
      farmer: {
        name: `${batch.crops.farmer.first_name} ${batch.crops.farmer.last_name}`,
        location: batch.crops.location,
        contact: batch.crops.farmer.phone
      },
      verification: {
        blockchainVerified,
        fairPriceAchieved,
        recordsCount: batch.blockchain_records.length,
        lastVerified: batch.blockchain_records[0]?.timestamp
      },
      supplyChain: journey.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
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