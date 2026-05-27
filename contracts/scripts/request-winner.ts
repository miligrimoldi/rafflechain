import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const contractAddress = "0xd746fc3d97102Fc22bB78C57ec0E6BC2DEA7548E";
    const raffle = await ethers.getContractAt("RaffleChain", contractAddress);

    console.log("Requesting winner...");
    const tx = await raffle.requestWinner(0);
    const receipt = await tx.wait();

    console.log("requestWinner tx:", receipt?.hash);
    console.log("Now wait for Chainlink VRF fulfillment...");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});