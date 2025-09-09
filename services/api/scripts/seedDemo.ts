import { getLocalSigner } from '../src/keys/localSigner';
import { contract } from '../src/contracts';
import QRCode from 'qrcode';
import BatchCache from '../src/models/BatchCache';
import { config } from '../src/config';

export async function seedDemo() {
  const signer = getLocalSigner();
  const contractWithSigner = contract.connect(signer);

  // Grant roles to demo addresses
  const farmer = signer.address;
  const distributor = '0x000000000000000000000000000000000000d1s7';
  const retailer = '0x000000000000000000000000000000000000r371';
  await contractWithSigner.grantRole(await contractWithSigner.FARMER_ROLE(), farmer);
  await contractWithSigner.grantRole(await contractWithSigner.DISTRIBUTOR_ROLE(), distributor);
  await contractWithSigner.grantRole(await contractWithSigner.RETAILER_ROLE(), retailer);

  // Create demo batches
  const batchId1 = '0x' + Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  const batchId2 = '0x' + Math.random().toString(16).slice(2, 10).padEnd(8, '0');
  await contractWithSigner.createBatch(batchId1, 'Wheat', 'FarmA', 1000, '10000000000000000', Math.floor(Date.now() / 1000));
  await contractWithSigner.createBatch(batchId2, 'Rice', 'FarmB', 500, '20000000000000000', Math.floor(Date.now() / 1000));

  // Generate QR codes
  const url1 = `https://${config.API_BASE_URL}/trace/${batchId1}`;
  const url2 = `https://${config.API_BASE_URL}/trace/${batchId2}`;
  const qrPath1 = `public/qr/${batchId1}.png`;
  const qrPath2 = `public/qr/${batchId2}.png`;
  await QRCode.toFile(qrPath1, url1, { width: 400 });
  await QRCode.toFile(qrPath2, url2, { width: 400 });

  // Save to BatchCache
  await BatchCache.findOneAndUpdate({ batchId: batchId1 }, { $set: { batchId: batchId1, qrUrl: `/api/${qrPath1}` } }, { upsert: true });
  await BatchCache.findOneAndUpdate({ batchId: batchId2 }, { $set: { batchId: batchId2, qrUrl: `/api/${qrPath2}` } }, { upsert: true });

  return [
    { batchId: batchId1, qrUrl: `/api/${qrPath1}` },
    { batchId: batchId2, qrUrl: `/api/${qrPath2}` }
  ];
}
