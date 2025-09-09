import { ethers } from "hardhat";
import "mocha";
import { expect } from "chai";

describe("SupplyChainRegistry", function () {
  let registry: any;
  let deployer: any, farmer: any, distributor: any, retailer: any;

  beforeEach(async () => {
    [deployer, farmer, distributor, retailer] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("SupplyChainRegistry");
    registry = await Registry.deploy();
    await registry.deployed();
    await registry.grantRole(await registry.FARMER_ROLE(), farmer.address);
    await registry.grantRole(await registry.DISTRIBUTOR_ROLE(), distributor.address);
    await registry.grantRole(await registry.RETAILER_ROLE(), retailer.address);
  });

  it("should only allow farmer to create batch", async () => {
  const batchId = ethers.utils.formatBytes32String("BATCH1");
    await expect(
      registry.connect(farmer).createBatch(batchId, "Wheat", "FarmA", 1000, ethers.utils.parseEther("0.01"), Math.floor(Date.now() / 1000))
    ).to.emit(registry, "BatchCreated");
    await expect(
      registry.connect(distributor).createBatch(batchId, "Wheat", "FarmA", 1000, ethers.utils.parseEther("0.01"), Math.floor(Date.now() / 1000))
    ).to.be.revertedWithCustomError(registry, "NotAuthorized");
  });

  it("should record custody flow and custodyTrail", async () => {
  const batchId = ethers.utils.formatBytes32String("BATCH2");
  await registry.connect(farmer).createBatch(batchId, "Rice", "FarmB", 500, ethers.utils.parseEther("0.02"), Math.floor(Date.now() / 1000));
  await registry.connect(farmer).transferCustody(batchId, distributor.address, "To distributor");
  await registry.connect(distributor).transferCustody(batchId, retailer.address, "To retailer");
  const trail = await registry.getCustodyTrail(batchId);
  expect(trail).to.include.members([farmer.address, distributor.address, retailer.address]);
  });

  it("should record price and quality updates", async () => {
  const batchId = ethers.utils.formatBytes32String("BATCH3");
  await registry.connect(farmer).createBatch(batchId, "Corn", "FarmC", 200, ethers.utils.parseEther("0.03"), Math.floor(Date.now() / 1000));
  await registry.connect(deployer).updateQuality(batchId, "Moisture", "10%", "ipfs://cert2");
  await registry.connect(deployer).updatePrice(batchId, ethers.utils.parseEther("0.031"), "Market adj");
  const qualities = await registry.getQualities(batchId);
  expect(qualities.length).to.equal(1);
  const prices = await registry.getPriceHistory(batchId);
  expect(prices.length).to.equal(1);
  });

  it("should prevent writes after finalize", async () => {
  const batchId = ethers.utils.formatBytes32String("BATCH4");
    await registry.connect(farmer).createBatch(batchId, "Barley", "FarmD", 300, ethers.utils.parseEther("0.04"), Math.floor(Date.now() / 1000));
    await registry.connect(farmer).finalizeBatch(batchId);
    await expect(
      registry.connect(deployer).updatePrice(batchId, ethers.utils.parseEther("0.041"), "Late adj")
    ).to.be.revertedWithCustomError(registry, "AlreadyFinalized");
  });

  it("should set dispute flag and emit event", async () => {
  const batchId = ethers.utils.formatBytes32String("BATCH5");
    await registry.connect(farmer).createBatch(batchId, "Soy", "FarmE", 400, ethers.utils.parseEther("0.05"), Math.floor(Date.now() / 1000));
    await expect(
      registry.connect(deployer).dispute(batchId, "Suspect quality")
    ).to.emit(registry, "Disputed");
    const batch = await registry.getBatch(batchId);
    expect(batch.disputed).to.be.true;
  });
});
