
import { ethers } from "hardhat";

async function main() {
  const [deployer, farmer, distributor, retailer] = await ethers.getSigners();
  const Registry = await ethers.getContractFactory("SupplyChainRegistry");
  const registry = await Registry.attach((await Registry.deploy()).address);

  // Grant roles
  await registry.grantRole(await registry.FARMER_ROLE(), farmer.address);
  await registry.grantRole(await registry.DISTRIBUTOR_ROLE(), distributor.address);
  await registry.grantRole(await registry.RETAILER_ROLE(), retailer.address);

  // Create two sample batches
  const batchId1 = ethers.utils.formatBytes32String("BATCH1");
  const batchId2 = ethers.utils.formatBytes32String("BATCH2");
  await registry.connect(farmer).createBatch(batchId1, "Wheat", "FarmA", 1000, ethers.utils.parseEther("0.01"), Math.floor(Date.now() / 1000));
  await registry.connect(farmer).createBatch(batchId2, "Rice", "FarmB", 500, ethers.utils.parseEther("0.02"), Math.floor(Date.now() / 1000));

  // Add quality check and price update to batch1
  await registry.connect(deployer).updateQuality(batchId1, "Moisture", "12%", "ipfs://cert1");
  await registry.connect(deployer).updatePrice(batchId1, ethers.utils.parseEther("0.012"), "Market adjustment");

  // Transfer custody farmer -> distributor -> retailer -> finalize
  await registry.connect(farmer).transferCustody(batchId1, distributor.address, "To distributor");
  await registry.connect(distributor).transferCustody(batchId1, retailer.address, "To retailer");
  await registry.connect(retailer).finalizeBatch(batchId1);

  console.log("Seeded registry with sample data.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
