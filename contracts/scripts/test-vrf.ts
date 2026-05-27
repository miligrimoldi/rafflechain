import { network } from "hardhat";
import { parseEther } from "ethers";

async function main() {
    const { ethers } = await network.connect();

    const contractAddress = "0xd746fc3d97102Fc22bB78C57ec0E6BC2DEA7548E";
    const raffle = await ethers.getContractAt("RaffleChain", contractAddress);

    const now = Math.floor(Date.now() / 1000);
    const endTime = now + 60; // termina en 1 minuto

    console.log("Creating raffle...");
    const tx = await raffle.createRaffle(
        parseEther("0.001"),
        3,
        endTime
    );
    const receipt = await tx.wait();

    console.log("Raffle created:", receipt?.hash);

    console.log("Buying ticket 1...");
    await (await raffle.buyTicket(0, 1, { value: parseEther("0.001") })).wait();

    console.log("Buying ticket 2...");
    await (await raffle.buyTicket(0, 2, { value: parseEther("0.001") })).wait();

    console.log("Wait until raffle ends, then run requestWinner manually.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});