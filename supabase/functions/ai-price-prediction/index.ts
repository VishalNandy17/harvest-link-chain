import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parse } from "https://deno.land/std@0.168.0/csv/parse.ts";

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, anonKey);

    // Attempt to load dataset from Supabase Storage bucket 'ml/indian_agri_prices.csv'
    // The Kaggle dataset should be exported/uploaded to this path (CSV)
    let datasetPrices: number[] = [];
    let matchedRows = 0;
    let totalRows = 0;
    try {
      const { data: signed } = await supabase
        .storage
        .from('ml')
        .createSignedUrl('indian_agri_prices.csv', 60);

      if (signed?.signedUrl) {
        const resp = await fetch(signed.signedUrl);
        if (resp.ok) {
          const csvText = await resp.text();
          const records = await parse(csvText, { skipFirstRow: false });
          // Records may be array of arrays (no header). Infer columns by common Kaggle headers.
          // Expected headers like: State, District, Market, Commodity, Variety, Arrival_Date, Min_Price, Max_Price, Modal_Price
          // We'll map indices by locating header row
          let rows: any[] = records as any[];
          if (!Array.isArray(rows) || rows.length === 0) throw new Error('Empty CSV');

          const header = rows[0].map((h: string) => String(h).trim().toLowerCase());
          const dataRows = rows.slice(1);
          const idxCommodity = header.findIndex((h: string) => h.includes('commodity') || h.includes('crop') || h === 'commodityname');
          const idxState = header.findIndex((h: string) => h.includes('state'));
          const idxDistrict = header.findIndex((h: string) => h.includes('district'));
          const idxMarket = header.findIndex((h: string) => h.includes('market'));
          const idxModal = header.findIndex((h: string) => h.includes('modal') && h.includes('price'));
          const idxMax = header.findIndex((h: string) => h === 'max_price' || h.includes('max'));
          const idxMin = header.findIndex((h: string) => h === 'min_price' || h.includes('min'));

          const tokens = String(location || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
          const cropLc = String(cropName || '').toLowerCase();

          for (const r of dataRows) {
            totalRows++;
            const commodity = idxCommodity >= 0 ? String(r[idxCommodity] || '').toLowerCase() : '';
            if (!commodity || !commodity.includes(cropLc)) continue;
            const state = idxState >= 0 ? String(r[idxState] || '').toLowerCase() : '';
            const district = idxDistrict >= 0 ? String(r[idxDistrict] || '').toLowerCase() : '';
            const market = idxMarket >= 0 ? String(r[idxMarket] || '').toLowerCase() : '';
            const rowMatchesLocation = tokens.length === 0 || tokens.some(t => state.includes(t) || district.includes(t) || market.includes(t));
            if (!rowMatchesLocation) continue;
            let price: number | null = null;
            if (idxModal >= 0) price = Number(r[idxModal]);
            if ((price == null || Number.isNaN(price)) && idxMax >= 0 && idxMin >= 0) {
              const max = Number(r[idxMax]);
              const min = Number(r[idxMin]);
              if (!Number.isNaN(max) && !Number.isNaN(min)) price = (max + min) / 2;
            }
            if (price != null && !Number.isNaN(price)) {
              datasetPrices.push(price);
              matchedRows++;
            }
          }
        }
      }
    } catch (_) {
      // ignore dataset load errors, will fall back to heuristic
    }

    // Compute prediction
    let predictedPrice = Number(currentPrice) || 0;
    let confidenceScore = 0.65;
    let factors: Record<string, number> = {};
    if (datasetPrices.length >= 5) {
      datasetPrices.sort((a, b) => a - b);
      const mid = Math.floor(datasetPrices.length / 2);
      const median = datasetPrices.length % 2 ? datasetPrices[mid] : (datasetPrices[mid - 1] + datasetPrices[mid]) / 2;
      // Adjust with simple seasonal factor if provided
      const seasonality = season === 'harvest' ? 0.92 : season === 'lean' ? 1.08 : 1.0;
      const quantityFactor = Number(quantity) > 1000 ? 0.97 : 1.03;
      predictedPrice = Math.max(0, median * seasonality * quantityFactor);
      confidenceScore = Math.min(0.98, 0.6 + Math.log10(datasetPrices.length + 1) / 3);
      factors = { median, seasonality, quantity: quantityFactor, samples: datasetPrices.length } as any;
    } else {
      // Fallback heuristic if dataset not available
      const baseDemand = 1.05;
      const seasonality = season === 'harvest' ? 0.9 : 1.1;
      const quantityFactor = Number(quantity) > 1000 ? 0.95 : 1.05;
      predictedPrice = (Number(currentPrice) || 100) * baseDemand * seasonality * quantityFactor;
      confidenceScore = 0.6;
      factors = { baseDemand, seasonality, quantity: quantityFactor, samples: datasetPrices.length } as any;
    }

    // Store prediction in database
    await supabase
      .from('price_predictions')
      .insert({
        crop_name: cropName,
        current_price: Number(currentPrice) || 0,
        predicted_price: Math.round(predictedPrice * 100) / 100,
        confidence_score: Math.round(confidenceScore * 100) / 100,
        factors,
        valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });

    return new Response(
      JSON.stringify({
        success: true,
        predictedPrice: Math.round(predictedPrice * 100) / 100,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        factors,
        stats: { matchedRows, totalRows }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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