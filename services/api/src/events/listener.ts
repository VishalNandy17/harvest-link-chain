import { contract } from '../contracts';
import BatchCache from '../models/BatchCache';
import EventLog from '../models/EventLog';
import { Server } from 'socket.io';

export function setupEventListener(io: Server) {
  contract.on('BatchCreated', async (id: string, farmer: string, eventObj: any) => {
    const batch = await contract.getBatch(id);
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $set: {
        batchId: id,
        cropType: batch.cropType,
        farmRef: batch.farmRef,
        harvestAt: batch.harvestAt,
        quantityKg: batch.quantityKg,
        currentHolder: batch.currentHolder,
        status: batch.status,
        qualities: [],
        priceHistory: [],
        custodyTrail: [batch.currentHolder],
        disputed: false,
        finalized: false,
        updatedAt: new Date()
      } },
      { upsert: true }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'BatchCreated',
      batchId: id,
      payload: { id, farmer },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'BatchCreated', payload: { id, farmer } });
  });

  contract.on('CustodyTransferred', async (id: string, from: string, to: string, eventObj: any) => {
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $push: { custodyTrail: to }, $set: { currentHolder: to, updatedAt: new Date() } }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'CustodyTransferred',
      batchId: id,
      payload: { id, from, to },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'CustodyTransferred', payload: { id, from, to } });
  });

  contract.on('QualityUpdated', async (id: string, idx: number, eventObj: any) => {
    const quality = await contract.getQualities(id);
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $push: { qualities: quality[quality.length - 1] }, $set: { updatedAt: new Date() } }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'QualityUpdated',
      batchId: id,
      payload: { id, idx, quality: quality[quality.length - 1] },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'QualityUpdated', payload: { id, idx, quality: quality[quality.length - 1] } });
  });

  contract.on('PriceUpdated', async (id: string, idx: number, eventObj: any) => {
    const prices = await contract.getPriceHistory(id);
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $push: { priceHistory: prices[prices.length - 1] }, $set: { updatedAt: new Date() } }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'PriceUpdated',
      batchId: id,
      payload: { id, idx, price: prices[prices.length - 1] },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'PriceUpdated', payload: { id, idx, price: prices[prices.length - 1] } });
  });

  contract.on('Finalized', async (id: string, eventObj: any) => {
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $set: { finalized: true, status: 3, updatedAt: new Date() } }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'Finalized',
      batchId: id,
      payload: { id },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'Finalized', payload: { id } });
  });

  contract.on('Disputed', async (id: string, reason: string, eventObj: any) => {
    await BatchCache.findOneAndUpdate(
      { batchId: id },
      { $set: { disputed: true, disputeReason: reason, updatedAt: new Date() } }
    );
    await EventLog.create({
      chainTxHash: eventObj.transactionHash,
      eventName: 'Disputed',
      batchId: id,
      payload: { id, reason },
      timestamp: new Date()
    });
    io.to(`batch:${id}`).emit('update', { type: 'Disputed', payload: { id, reason } });
  });
}
