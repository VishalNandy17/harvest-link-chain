import { ethers, deployments, getNamedAccounts } from "hardhat";

async function main() {
  const { deployer } = await getNamedAccounts();
  const SupplyChainRegistry = await deployments.deploy("SupplyChainRegistry", {
    from: deployer,
    args: [],
    log: true,
  });
  console.log("SupplyChainRegistry deployed at:", SupplyChainRegistry.address);
  // DEFAULT_ADMIN_ROLE is set to deployer in constructor
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
