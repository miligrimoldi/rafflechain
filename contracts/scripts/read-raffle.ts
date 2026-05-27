// scripts/read-raffle.ts
import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const contractAddress = "0xd746fc3d97102Fc22bB78C57ec0E6BC2DEA7548E";
    const raffle = await ethers.getContractAt("RaffleChain", contractAddress);

    const data = await raffle.getRaffle(0);

    console.log("Raffle:");
    console.log("id:", data.id.toString());
    console.log("organizer:", data.organizer);
    console.log("ticketsSold:", data.ticketsSold.toString());
    console.log("winningTicketNumber:", data.winningTicketNumber.toString());
    console.log("winner:", data.winner);
    console.log("randomNumber:", data.randomNumber.toString());
    console.log("status:", data.status.toString());
    console.log("fundsWithdrawn:", data.fundsWithdrawn);
    console.log("prizeClaimed:", data.prizeClaimed);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});