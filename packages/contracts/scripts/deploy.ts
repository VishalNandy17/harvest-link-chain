import { ethers } from "hardhat";

async function main() {
  // Example deploy script
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  // Add contract deployment logic here
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
