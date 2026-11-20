import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qjfzmbqqldyowgocqrqk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqZnptYnFxbGR5b3dnb2NxcnFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUwOTE5OTAsImV4cCI6MjExMDY2Nzk5MH0.5RxERC_hPT4-QGV9DrJdUj8BWOEGgbqLlmwI41Il9fU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🌱 Seeding IEEE Manuscript T4-2026-044 research tables in Supabase...');

// 1. Seed G1 Reconciliation Exceptions (Section V)
const reconExceptions = [
  {
    exception_type: 'facility_discrepancy',
    facility_id: 'DEPOT-MP-01',
    lot_id: 'LOT-2026-WHEAT-401',
    period: '2026-Q4',
    expected_qty: 100000,
    observed_qty: 99750,
    discrepancy: 250,
    tolerance: 500,
    status: 'INVESTIGATING',
    notes: 'Observed discrepancy is 0.25%, within normal tare range but requires reconciliation sign-off.'
  },
  {
    exception_type: 'sub_skimming',
    facility_id: 'FPS-DL-42',
    lot_id: 'LOT-2026-RICE-208',
    period: '2026-NOV',
    expected_qty: 25000,
    observed_qty: 24200,
    discrepancy: 800,
    tolerance: 125,
    status: 'PENDING',
    notes: 'Discrepancy 800kg exceeds allowable tolerance 125kg. Flagged for physical auditing.'
  }
];

const { data: insertedRecon, error: reconErr } = await supabase
  .from('reconciliation_exceptions')
  .insert(reconExceptions)
  .select('id, exception_type');

if (reconErr) {
  console.log('Reconciliation Error:', reconErr.message);
} else {
  console.log(`✅ Seeded ${insertedRecon?.length || 0} exceptions into 'reconciliation_exceptions'`);
}

// 2. Seed G2 Offline Event Queue (Section V)
const offlineEvents = [
  {
    event_id: 'EVT-OFFLINE-001',
    device_id: 'POS-FPS-MP-042',
    actor_wallet: '0x01a35D2A021D101A03C3d5f4bD4235A6643614D9',
    sequence_number: 1,
    captured_at: new Date().toISOString(),
    pred_hash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    payload_hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    chain_pi: '0x11155111',
    signature: '0x3a4b5c...',
    payload: { action: 'DISTRIBUTION_RECORDED', quantity_kg: 5, lot_id: 'LOT-2026-WHEAT-401' },
    sync_status: 'COMMITTED'
  },
  {
    event_id: 'EVT-OFFLINE-002',
    device_id: 'POS-FPS-MP-042',
    actor_wallet: '0x01a35D2A021D101A03C3d5f4bD4235A6643614D9',
    sequence_number: 2,
    captured_at: new Date().toISOString(),
    pred_hash: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    payload_hash: '0x8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    chain_pi: '0x11155111',
    signature: '0x4b5c6d...',
    payload: { action: 'DISTRIBUTION_RECORDED', quantity_kg: 5, lot_id: 'LOT-2026-WHEAT-401' },
    sync_status: 'VALIDATED'
  }
];

const { data: insertedQueue, error: queueErr } = await supabase
  .from('offline_event_queue')
  .insert(offlineEvents)
  .select('id, event_id');

if (queueErr) {
  console.log('Offline Queue Error:', queueErr.message);
} else {
  console.log(`✅ Seeded ${insertedQueue?.length || 0} events into 'offline_event_queue'`);
}

// 3. Seed G3 Handover Evidence (Section V)
const handoverEvidence = [
  {
    shipment_id: 'SHP-2026-MP-01',
    lot_id: 'LOT-2026-WHEAT-401',
    sender_address: 'FCI Central Silo (Bhopal)',
    receiver_address: 'District Buffer Depot (Indore)',
    vehicle_carrier_ref: 'MP-04-HE-2931',
    seal_id: 'SEAL-2026-08941',
    dispatch_qty: 50000,
    receipt_qty: 49850,
    weighment_slip_ref: 'WB-SLIP-89102',
    inspection_status: 'passed',
    moisture_pct: 11.2,
    pest_infestation: false,
    hygiene_passed: true,
    document_hash: '0x6e7f8a9b0c1d2e3f4a5b6c7d8e9f0123456789abcdef0123456789abcdef01'
  },
  {
    shipment_id: 'SHP-2026-DL-02',
    lot_id: 'LOT-2026-RICE-208',
    sender_address: 'State Seed Hub (Karnal)',
    receiver_address: 'Fair Price Shop #18 (Delhi)',
    vehicle_carrier_ref: 'DL-01-AB-1029',
    seal_id: 'SEAL-2026-11042',
    dispatch_qty: 25000,
    receipt_qty: 24200,
    weighment_slip_ref: 'WB-SLIP-99213',
    inspection_status: 'flagged',
    moisture_pct: 14.8,
    pest_infestation: false,
    hygiene_passed: true,
    document_hash: '0x123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0'
  }
];

const { data: insertedEvidence, error: evErr } = await supabase
  .from('handover_evidence')
  .insert(handoverEvidence)
  .select('id, shipment_id');

if (evErr) {
  console.log('Handover Evidence Error:', evErr.message);
} else {
  console.log(`✅ Seeded ${insertedEvidence?.length || 0} records into 'handover_evidence'`);
}

console.log('\n🚀 ALL IEEE Manuscript T4-2026-044 RESEARCH EXTENSION TABLES SEEDED!');
