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

    const { batchId, quantity } = await req.json();
    
    // Get buyer profile
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('user_id', user.id)
      .single();

    if (!buyerProfile) {
      throw new Error('Buyer profile not found');
    }

    // Get batch with crop and farmer info
    const { data: batch } = await supabase
      .from('batches')
      .select(`
        *,
        crops:crop_id (
          *,
          profiles:farmer_id (id, first_name, last_name)
        )
      `)
      .eq('id', batchId)
      .single();

    if (!batch || batch.status !== 'available') {
      throw new Error('Batch not available for purchase');
    }

    if (quantity > batch.quantity) {
      throw new Error('Requested quantity exceeds available quantity');
    }

    const totalPrice = quantity * batch.price_per_unit;

    // Create transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .insert({
        batch_id: batchId,
        buyer_id: buyerProfile.id,
        seller_id: batch.crops.farmer_id,
        quantity: quantity,
        total_price: totalPrice,
        status: 'completed'
      })
      .select()
      .single();

    if (transactionError) {
      throw transactionError;
    }

    // Update batch status and quantity
    const newQuantity = batch.quantity - quantity;
    const newStatus = newQuantity === 0 ? 'purchased' : 'available';

    const { error: updateError } = await supabase
      .from('batches')
      .update({
        quantity: newQuantity,
        status: newStatus
      })
      .eq('id', batchId);

    if (updateError) {
      throw updateError;
    }

    // Update crop status if all batches are sold
    if (newQuantity === 0) {
      await supabase
        .from('crops')
        .update({ status: 'sold' })
        .eq('id', batch.crop_id);
    }

    // Create blockchain record for transaction
    const blockchainData = {
      transaction_id: transaction.id,
      buyer: buyerProfile.id,
      seller: batch.crops.farmer_id,
      batch: batchId,
      quantity: quantity,
      price: totalPrice,
      timestamp: new Date().toISOString()
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(blockchainData));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const { error: blockchainError } = await supabase
      .from('blockchain_records')
      .insert({
        transaction_id: transaction.id,
        batch_id: batchId,
        record_type: 'transaction',
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
        transaction: transaction,
        blockchainHash: hashHex,
        message: 'Purchase completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in purchase-batch function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});