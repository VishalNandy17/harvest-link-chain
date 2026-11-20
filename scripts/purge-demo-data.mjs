import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://qjfzmbqqldyowgocqrqk.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnptYnFxbGR5b3dnb2NxcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTE5OTAsImV4cCI6MjExMDY2Nzk5MH0.5RxERC_hPT4-QGV9DrJdUj8BWOEGgbqLlmwI41Il9fU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🧹 HarvestLink Production Purge Utility');
console.log('Target Database:', SUPABASE_URL);

async function purgeTable(tableName, idCol = 'id') {
  try {
    const { data, error } = await supabase.from(tableName).select(idCol);
    if (error) {
      console.warn(`⚠️ Could not query ${tableName}:`, error.message);
      return;
    }
    if (!data || data.length === 0) {
      console.log(`✅ Table '${tableName}' is already clean (0 rows).`);
      return;
    }
    console.log(`Clearing ${data.length} records from '${tableName}'...`);
    const ids = data.map(r => r[idCol]);
    const { error: delError } = await supabase.from(tableName).delete().in(idCol, ids);
    if (delError) {
      console.error(`❌ Failed to delete from ${tableName}:`, delError.message);
    } else {
      console.log(`✅ Successfully purged '${tableName}'.`);
    }
  } catch (err) {
    console.error(`Error purging ${tableName}:`, err);
  }
}

async function main() {
  console.log('\n--- Purging Demo / Synthetic Research Records ---');
  // Order respects foreign keys
  await purgeTable('gat_anomaly_alerts');
  await purgeTable('reconciliation_exceptions');
  await purgeTable('offline_event_queue');
  await purgeTable('handover_evidence');
  await purgeTable('facility_stock_ledger');
  await purgeTable('blockchain_records');
  await purgeTable('transactions');
  await purgeTable('batches');
  await purgeTable('crops');
  
  console.log('\n✨ Database is now pristine and ready for Day-1 real operational input!');
  console.log('User profiles and security triggers remain untouched.');
}

main().catch(console.error);
