import { execSync } from 'child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import supertest from 'supertest';
import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO } from 'socket.io-client';
import app from '../src/app';
import BatchCache from '../src/models/BatchCache';
import EventLog from '../src/models/EventLog';
import { ethers } from 'ethers';
import { getLocalSigner } from '../src/keys/localSigner';
import contractAbi from '../src/contracts/SupplyChainRegistry.json';

let server: Server;
let io: SocketIOServer;
let request: supertest.SuperTest<supertest.Test>;
let mongoServer: MongoMemoryServer;
let contract: ethers.Contract;
let batchId: string;

beforeAll(async () => {
  // Start Hardhat node and deploy contract
  execSync('npx hardhat node', { stdio: 'ignore' });
  // Deploy contract (simulate)
  // ...deployment logic...
  process.env.CONTRACT_ADDRESS = '0xTestContractAddress';

  // Start MongoDB memory server
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Start Express server
  server = app.listen(0);
  io = new SocketIOServer(server);
  app.set('io', io);
  request = supertest(server);

  // Connect contract
  const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  contract = new ethers.Contract(process.env.CONTRACT_ADDRESS!, contractAbi, provider);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

describe('Integration Flow', () => {
  it('should create batch and emit event', async () => {
    const res = await request.post('/batches').send({
      cropType: 'Wheat',
      variety: 'A',
      farmRef: 'FarmX',
      quantityKg: 100,
      basePricePerKgWei: ethers.utils.parseEther('0.01').toString(),
      harvestAt: Math.floor(Date.now() / 1000)
    });
    expect(res.body.batchId).toBeDefined();
    batchId = res.body.batchId;
    // Check EventLog
    const event = await EventLog.findOne({ batchId });
    expect(event).toBeTruthy();
  });

  it('should fetch batch details', async () => {
    const res = await request.get(`/batches/${batchId}`);
    expect(res.body.cropType).toBe('Wheat');
  });

  it('should receive BatchCreated event via websocket', (done) => {
    const client = ClientIO('http://localhost:' + (server.address() as any).port, {
      transports: ['websocket']
    });
    client.emit('joinBatch', batchId);
    client.on('event', (evt: any) => {
      if (evt.type === 'BatchCreated') {
        expect(evt.payload.batchId).toBe(batchId);
        client.disconnect();
        done();
      }
    });
  });

  it('should transfer custody and update trail', async () => {
    await request.post(`/batches/${batchId}/transfer`).send({ to: '0xAnotherAddress', memo: 'To distributor' });
    const batch = await BatchCache.findOne({ batchId });
    expect(batch.custodyTrail).toContain('0xAnotherAddress');
  });

  it('should finalize and prevent further writes', async () => {
    await request.post(`/batches/${batchId}/finalize`).send();
    const res = await request.post(`/batches/${batchId}/price`).send({ priceWei: ethers.utils.parseEther('0.02').toString(), reason: 'Late update' });
    expect(res.status).toBe(400);
  });
});
