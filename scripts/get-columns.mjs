import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://qjfzmbqqldyowgocqrqk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnptYnFxbGR5b3dnb2NxcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTE5OTAsImV4cCI6MjExMDY2Nzk5MH0.5RxERC_hPT4-QGV9DrJdUj8BWOEGgbqLlmwI41Il9fU'
);

// Get column names by selecting with limit 0 trick via introspection
const tables = ['crops','batches','transactions','blockchain_records','gat_anomaly_alerts','reconciliation_exceptions','procedures','price_predictions','facility_stock_ledger'];
for (const t of tables) {
  // Use pg information_schema via RPC if available, else try insert with bad data to get column error
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: t }).catch(() => ({data:null,error:{message:'no rpc'}}));
  if (data) { console.log(`${t}:`, data); continue; }
  // Fallback: just show the error to understand structure
  const r = await supabase.from(t).insert({}).select();
  console.log(`${t} insert error:`, r.error?.message?.substring(0,200) ?? 'ok');
}
