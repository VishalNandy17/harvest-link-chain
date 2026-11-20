// Verify Supabase table columns exist for dashboard queries
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qjfzmbqqldyowgocqrqk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnptYnFxbGR5b3dnb2NxcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTE5OTAsImV4cCI6MjExMDY2Nzk5MH0.5RxERC_hPT4-QGV9DrJdUj8BWOEGgbqLlmwI41Il9fU'
);

const tables = ['profiles', 'crops', 'batches', 'transactions', 'blockchain_records', 'gat_anomaly_alerts', 'reconciliation_exceptions', 'offline_event_queue', 'handover_evidence'];

console.log('=== Verifying table columns ===\n');

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.log(`❌ ${table}: ${error.message}`);
  } else {
    const cols = data && data.length > 0 ? Object.keys(data[0]).join(', ') : '(empty table)';
    console.log(`✅ ${table}: ${cols}`);
  }
}
