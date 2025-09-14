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
    const { cropName, currentPrice, quantity, location, season } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Simple AI prediction logic (can be enhanced with ML models)
    const marketFactors = {
      rice: { baseDemand: 1.2, seasonality: season === 'harvest' ? 0.9 : 1.1 },
      wheat: { baseDemand: 1.1, seasonality: season === 'harvest' ? 0.85 : 1.15 },
      corn: { baseDemand: 1.0, seasonality: season === 'harvest' ? 0.8 : 1.2 },
    };

    const cropFactor = marketFactors[cropName.toLowerCase()] || { baseDemand: 1.0, seasonality: 1.0 };
    const quantityFactor = quantity > 1000 ? 0.95 : 1.05; // Bulk discount/premium
    const locationFactor = Math.random() * 0.2 + 0.9; // Random location factor (0.9-1.1)
    
    const predictedPrice = currentPrice * cropFactor.baseDemand * cropFactor.seasonality * quantityFactor * locationFactor;
    const confidenceScore = Math.min(0.95, Math.max(0.6, Math.random() * 0.4 + 0.6));

    // Store prediction in database
    const { error } = await supabase
      .from('price_predictions')
      .insert({
        crop_name: cropName,
        current_price: currentPrice,
        predicted_price: Math.round(predictedPrice * 100) / 100,
        confidence_score: Math.round(confidenceScore * 100) / 100,
        factors: {
          baseDemand: cropFactor.baseDemand,
          seasonality: cropFactor.seasonality,
          quantity: quantityFactor,
          location: locationFactor
        },
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000) // Valid for 24 hours
      });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        predictedPrice: Math.round(predictedPrice * 100) / 100,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        factors: {
          marketDemand: cropFactor.baseDemand,
          seasonalEffect: cropFactor.seasonality,
          quantityBonus: quantityFactor,
          locationFactor: locationFactor
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-price-prediction function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});