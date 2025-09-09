import { Router } from 'express';
import { contract } from '../contracts';
import BatchCache from '../models/BatchCache';

const router = Router();

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  // Read on-chain
  const batch = await contract.getBatch(id);
  // Merge cached qualities/prices
  const cache = await BatchCache.findOne({ batchId: id });
  res.json({ ...batch, cache });
});


import { z } from 'zod';
import QRCode from 'qrcode';
import { config } from '../config';
import { Server } from 'socket.io';
import { ethers } from 'ethers';

const batchSchema = z.object({
  cropType: z.string(),
  variety: z.string(),
  farmRef: z.string(),
  quantityKg: z.number().int().positive(),
  basePricePerKgWei: z.string(),
  harvestAt: z.number().int().positive()
});

router.post('/', async (req, res) => {
  try {
    const parsed = batchSchema.parse(req.body);
    // Call contract.createBatch using API signer
    const provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
    const signer = provider.getSigner();
    const contractWithSigner = contract.connect(signer);
    const tx = await contractWithSigner.createBatch(
      ethers.utils.formatBytes32String(ethers.utils.hexlify(ethers.utils.randomBytes(8))),
      parsed.cropType,
      parsed.farmRef,
      parsed.quantityKg,
      parsed.basePricePerKgWei,
      parsed.harvestAt
    );
    const receipt = await tx.wait();
    // Find BatchCreated event
    const event = receipt.events?.find(e => e.event === 'BatchCreated');
    const batchId = event?.args?.id;
    // Generate QR
    const url = `https://${config.API_BASE_URL}/trace/${batchId}`;
    const qrPath = `public/qr/${batchId}.png`;
    await QRCode.toFile(qrPath, url, { width: 400 });
    // Save to BatchCache
    await BatchCache.findOneAndUpdate(
      { batchId },
      { $set: { ...parsed, batchId, qrUrl: `/api/${qrPath}` } },
      { upsert: true }
    );
    // Emit socket update
    if (req.app.get('io')) {
      const io: Server = req.app.get('io');
      io.to(`batch:${batchId}`).emit('event', { type: 'BatchCreated', payload: { batchId, ...parsed } });
    }
    res.json({ batchId, qrUrl: `/api/${qrPath}` });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// POST endpoints for transfer, receive, quality, price, finalize, dispute
['transfer', 'receive', 'quality', 'price', 'finalize', 'dispute'].forEach(action => {
  router.post('/:id/' + action, async (req, res) => {
    // TODO: implement contract call for each action
    res.json({ status: 'not implemented', action });
  });
});

if (process.env.NODE_ENV !== 'production') {
  router.post('/dev/seed-demo', async (req, res) => {
    try {
      const { seedDemo } = await import('../../scripts/seedDemo');
      const demoBatches = await seedDemo();
      res.json({ demoBatches });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}

export default router;
