import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("RaffleChain", function () {
    const SUBSCRIPTION_ID = 1n;
    const VRF_COORDINATOR = "0x0000000000000000000000000000000000000001";
    const KEY_HASH =
        "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
    const CALLBACK_GAS_LIMIT = 500000;

    const TICKET_PRICE = ethers.parseEther("0.01");
    const MAX_TICKETS = 5n;

    async function getEndTime() {
        const latestBlock = await ethers.provider.getBlock("latest");
        return BigInt(latestBlock!.timestamp + 3600);
    }

    async function deployRaffleChain() {
        const [organizer, buyer, otherBuyer] = await ethers.getSigners();

        const RaffleChainFactory = await ethers.getContractFactory("RaffleChain");

        const raffleChain: any = await RaffleChainFactory.deploy(
            SUBSCRIPTION_ID,
            VRF_COORDINATOR,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
        );

        await raffleChain.waitForDeployment();

        return { raffleChain, organizer, buyer, otherBuyer };
    }

    async function deployRaffleChainHarness() {
        const [organizer, buyer, otherBuyer] = await ethers.getSigners();

        const RaffleChainHarnessFactory =
            await ethers.getContractFactory("RaffleChainHarness");

        const raffleChain: any = await RaffleChainHarnessFactory.deploy(
            SUBSCRIPTION_ID,
            VRF_COORDINATOR,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
        );

        await raffleChain.waitForDeployment();

        return { raffleChain, organizer, buyer, otherBuyer };
    }

    describe("createRaffle", function () {
        it("creates a raffle correctly", async function () {
            const { raffleChain, organizer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await expect(
                raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime),
            )
                .to.emit(raffleChain, "RaffleCreated")
                .withArgs(0n, organizer.address, TICKET_PRICE, MAX_TICKETS, endTime);

            const raffle = await raffleChain.getRaffle(0n);

            expect(raffle.id).to.equal(0n);
            expect(raffle.organizer).to.equal(organizer.address);
            expect(raffle.ticketPrice).to.equal(TICKET_PRICE);
            expect(raffle.maxTickets).to.equal(MAX_TICKETS);
            expect(raffle.endTime).to.equal(endTime);
            expect(raffle.ticketsSold).to.equal(0n);
            expect(raffle.amountCollected).to.equal(0n);
            expect(raffle.status).to.equal(0n);
            expect(raffle.fundsWithdrawn).to.equal(false);
            expect(raffle.prizeClaimed).to.equal(false);
        });

        it("reverts if ticket price is zero", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await expect(
                raffleChain.createRaffle(0n, MAX_TICKETS, endTime),
            ).to.be.revertedWith("RaffleChain: ticket price must be > 0");
        });

        it("reverts if max tickets is zero", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await expect(
                raffleChain.createRaffle(TICKET_PRICE, 0n, endTime),
            ).to.be.revertedWith("RaffleChain: max tickets must be > 0");
        });

        it("reverts if end time is not in the future", async function () {
            const { raffleChain } = await deployRaffleChain();

            await expect(
                raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, 1n),
            ).to.be.revertedWith("RaffleChain: end time must be in the future");
        });
    });

    describe("buyTicket", function () {
        it("allows a buyer to buy a selected ticket and mints NFT", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 1n, {
                    value: TICKET_PRICE,
                }),
            )
                .to.emit(raffleChain, "TicketPurchased")
                .withArgs(0n, buyer.address, 1n, 0n);

            expect(await raffleChain.getTicketsSold(0n)).to.equal(1n);
            expect(await raffleChain.getTicketOwner(0n, 1n)).to.equal(buyer.address);
            expect(await raffleChain.getSoldTicketNumberByIndex(0n, 0n)).to.equal(1n);
            expect(await raffleChain.ownerOf(0n)).to.equal(buyer.address);

            const [raffleId, ticketNumber] = await raffleChain.getTicketInfo(0n);
            expect(raffleId).to.equal(0n);
            expect(ticketNumber).to.equal(1n);
        });

        it("reverts if ticket is already sold", async function () {
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(
                raffleChain.connect(otherBuyer).buyTicket(0n, 1n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: ticket already sold");
        });

        it("reverts if ticket number is invalid", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 0n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: invalid ticket number");

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 6n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: invalid ticket number");
        });

        it("reverts if ETH amount is incorrect", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 1n, {
                    value: ethers.parseEther("0.02"),
                }),
            ).to.be.revertedWith("RaffleChain: incorrect ETH amount");
        });

        it("reverts if raffle is sold out", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, 1n, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 1n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: ticket already sold");
        });
    });

    describe("winner selection", function () {
        it("selects winner using sold ticket index", async function () {
            const { raffleChain, buyer, otherBuyer } =
                await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 2n, {
                value: TICKET_PRICE,
            });

            await raffleChain.connect(otherBuyer).buyTicket(0n, 5n, {
                value: TICKET_PRICE,
            });

            await expect(raffleChain.exposedSelectWinner(0n, 1n))
                .to.emit(raffleChain, "WinnerSelected")
                .withArgs(0n, otherBuyer.address, 5n, 1n);

            const raffle = await raffleChain.getRaffle(0n);

            expect(raffle.winner).to.equal(otherBuyer.address);
            expect(raffle.winningTicketNumber).to.equal(5n);
            expect(raffle.randomNumber).to.equal(1n);
            expect(raffle.status).to.equal(2n);
        });
    });

    describe("claimPrize", function () {
        it("allows winner to claim prize", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await expect(raffleChain.connect(buyer).claimPrize(0n))
                .to.emit(raffleChain, "PrizeClaimed")
                .withArgs(0n, buyer.address);

            const raffle = await raffleChain.getRaffle(0n);
            expect(raffle.prizeClaimed).to.equal(true);
        });

        it("reverts if non winner tries to claim prize", async function () {
            const { raffleChain, buyer, otherBuyer } =
                await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await expect(
                raffleChain.connect(otherBuyer).claimPrize(0n),
            ).to.be.revertedWith("RaffleChain: only winner can claim");
        });
    });

    describe("withdrawFunds", function () {
        it("allows organizer to withdraw funds after winner is selected", async function () {
            const { raffleChain, organizer, buyer } =
                await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            const organizerBalanceBefore = await ethers.provider.getBalance(
                organizer.address,
            );

            await raffleChain.connect(organizer).withdrawFunds(0n);

            const organizerBalanceAfter = await ethers.provider.getBalance(
                organizer.address,
            );

            const raffle = await raffleChain.getRaffle(0n);

            expect(raffle.fundsWithdrawn).to.equal(true);
            expect(raffle.amountCollected).to.equal(0n);
            expect(organizerBalanceAfter).to.be.greaterThan(organizerBalanceBefore);
        });

        it("reverts if non organizer tries to withdraw", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await expect(
                raffleChain.connect(buyer).withdrawFunds(0n),
            ).to.be.revertedWith("RaffleChain: only organizer");
        });
    });
});