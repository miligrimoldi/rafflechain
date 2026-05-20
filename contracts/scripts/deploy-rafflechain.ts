import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const RaffleChain = await ethers.getContractFactory("RaffleChain");
  const raffleChain = await RaffleChain.deploy();

  await raffleChain.waitForDeployment();

  const address = await raffleChain.getAddress();

  console.log("RaffleChain deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});