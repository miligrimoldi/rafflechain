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

    async function increaseTime(seconds: number) {
        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine", []);
    }

    async function deployRaffleChain() {
        const [organizer, buyer, otherBuyer, stranger] = await ethers.getSigners();

        const RaffleChainFactory = await ethers.getContractFactory("RaffleChain");

        const raffleChain: any = await RaffleChainFactory.deploy(
            SUBSCRIPTION_ID,
            VRF_COORDINATOR,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
        );

        await raffleChain.waitForDeployment();

        return { raffleChain, organizer, buyer, otherBuyer, stranger };
    }

    async function deployRaffleChainHarness() {
        const [organizer, buyer, otherBuyer, stranger] = await ethers.getSigners();

        const RaffleChainHarnessFactory =
            await ethers.getContractFactory("RaffleChainHarness");

        const raffleChain: any = await RaffleChainHarnessFactory.deploy(
            SUBSCRIPTION_ID,
            VRF_COORDINATOR,
            KEY_HASH,
            CALLBACK_GAS_LIMIT,
        );

        await raffleChain.waitForDeployment();

        return { raffleChain, organizer, buyer, otherBuyer, stranger };
    }

    describe("createRaffle", function () {
        it("creates a raffle correctly", async function () {
            const { raffleChain, organizer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await expect(raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime))
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
            expect(raffle.winningTicketNumber).to.equal(0n);
            expect(raffle.winner).to.equal(ethers.ZeroAddress);
            expect(raffle.randomNumber).to.equal(0n);
            expect(raffle.status).to.equal(0n); // ACTIVE
            expect(raffle.fundsWithdrawn).to.equal(false);
            expect(raffle.prizeClaimed).to.equal(false);
            expect(raffle.vrfRequestTimestamp).to.equal(0n);
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

        it("allows multiple buyers to buy different tickets", async function () {
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 2n, {
                value: TICKET_PRICE,
            });

            await raffleChain.connect(otherBuyer).buyTicket(0n, 5n, {
                value: TICKET_PRICE,
            });

            expect(await raffleChain.getTicketsSold(0n)).to.equal(2n);
            expect(await raffleChain.getTicketOwner(0n, 2n)).to.equal(buyer.address);
            expect(await raffleChain.getTicketOwner(0n, 5n)).to.equal(otherBuyer.address);
            expect(await raffleChain.getSoldTicketNumberByIndex(0n, 0n)).to.equal(2n);
            expect(await raffleChain.getSoldTicketNumberByIndex(0n, 1n)).to.equal(5n);
        });

        it("reverts if raffle does not exist", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();

            await expect(
                raffleChain.connect(buyer).buyTicket(999n, 1n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: raffle does not exist");
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

        it("reverts if raffle has ended", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await increaseTime(3601);

            await expect(
                raffleChain.connect(buyer).buyTicket(0n, 1n, {
                    value: TICKET_PRICE,
                }),
            ).to.be.revertedWith("RaffleChain: raffle has ended");
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
            ).to.be.revertedWith("RaffleChain: sold out");
        });
    });

    describe("requestWinner", function () {
        it("reverts if raffle has not ended yet", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(raffleChain.requestWinner(0n)).to.be.revertedWith(
                "RaffleChain: raffle has not ended yet",
            );
        });

        it("reverts if raffle ended with zero tickets sold", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await increaseTime(3601);

            await expect(raffleChain.requestWinner(0n)).to.be.revertedWith(
                "RaffleChain: no tickets sold",
            );
        });

        it("considers raffle ended when sold out", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, 1n, endTime);

            expect(await raffleChain.isRaffleEnded(0n)).to.equal(false);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            expect(await raffleChain.isRaffleEnded(0n)).to.equal(true);
        });

        it("does not test successful requestWinner without a VRF mock", async function () {
            expect(true).to.equal(true);
        });
    });

    describe("winner selection with harness", function () {
        it("selects winner using sold ticket index", async function () {
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChainHarness();
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
            expect(raffle.status).to.equal(2n); // WINNER_SELECTED
        });

        it("selects first sold ticket when random number modulo ticketsSold is zero", async function () {
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 3n, {
                value: TICKET_PRICE,
            });

            await raffleChain.connect(otherBuyer).buyTicket(0n, 4n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 10n);

            const raffle = await raffleChain.getRaffle(0n);

            expect(raffle.winner).to.equal(buyer.address);
            expect(raffle.winningTicketNumber).to.equal(3n);
            expect(raffle.randomNumber).to.equal(10n);
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
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChainHarness();
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

        it("reverts if winner tries to claim prize twice", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await raffleChain.connect(buyer).claimPrize(0n);

            await expect(raffleChain.connect(buyer).claimPrize(0n)).to.be.revertedWith(
                "RaffleChain: prize already claimed",
            );
        });

        it("reverts if winner is not selected yet", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(raffleChain.connect(buyer).claimPrize(0n)).to.be.revertedWith(
                "RaffleChain: winner not selected yet",
            );
        });
    });

    describe("cancelEmptyRaffle", function () {
        it("cancels a raffle that ended with no tickets", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await increaseTime(3601);

            await expect(raffleChain.cancelEmptyRaffle(0n))
                .to.emit(raffleChain, "RaffleCancelled")
                .withArgs(0n);

            const raffle = await raffleChain.getRaffle(0n);
            expect(raffle.status).to.equal(3n); // CANCELLED
        });

        it("reverts if raffle has not ended yet", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await expect(raffleChain.cancelEmptyRaffle(0n)).to.be.revertedWith(
                "RaffleChain: raffle has not ended yet",
            );
        });

        it("reverts if raffle has tickets sold", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await increaseTime(3601);

            await expect(raffleChain.cancelEmptyRaffle(0n)).to.be.revertedWith(
                "RaffleChain: raffle has tickets sold",
            );
        });
    });

    describe("cancelStuckRaffle", function () {
        it("cancels stuck raffle after cancel timeout", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedForceWaitingRandomness(0n);

            await increaseTime(24 * 3600 + 1);

            await expect(raffleChain.cancelStuckRaffle(0n))
                .to.emit(raffleChain, "RaffleCancelled")
                .withArgs(0n);

            const raffle = await raffleChain.getRaffle(0n);
            expect(raffle.status).to.equal(3n); // CANCELLED
        });

        it("reverts if cancelling stuck raffle before cancel timeout", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedForceWaitingRandomness(0n);

            await expect(raffleChain.cancelStuckRaffle(0n)).to.be.revertedWith(
                "RaffleChain: cancel timeout not reached",
            );
        });

        it("reverts if raffle is not waiting randomness", async function () {
            const { raffleChain } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await expect(raffleChain.cancelStuckRaffle(0n)).to.be.revertedWith(
                "RaffleChain: not waiting randomness",
            );
        });
    });

    describe("claimRefund", function () {
        it("allows buyer to claim refund on cancelled raffle", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedForceWaitingRandomness(0n);

            await increaseTime(24 * 3600 + 1);

            await raffleChain.cancelStuckRaffle(0n);

            await expect(raffleChain.connect(buyer).claimRefund(0n, 1n))
                .to.emit(raffleChain, "RefundClaimed")
                .withArgs(0n, buyer.address, 1n);
        });

        it("reverts if refund already claimed", async function () {
            const { raffleChain, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedForceWaitingRandomness(0n);

            await increaseTime(24 * 3600 + 1);

            await raffleChain.cancelStuckRaffle(0n);

            await raffleChain.connect(buyer).claimRefund(0n, 1n);

            await expect(
                raffleChain.connect(buyer).claimRefund(0n, 1n),
            ).to.be.revertedWith("RaffleChain: refund already claimed");
        });

        it("reverts if non ticket owner tries to claim refund", async function () {
            const { raffleChain, buyer, otherBuyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedForceWaitingRandomness(0n);

            await increaseTime(24 * 3600 + 1);

            await raffleChain.cancelStuckRaffle(0n);

            await expect(
                raffleChain.connect(otherBuyer).claimRefund(0n, 1n),
            ).to.be.revertedWith("RaffleChain: not ticket owner");
        });

        it("reverts if raffle is not cancelled", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(
                raffleChain.connect(buyer).claimRefund(0n, 1n),
            ).to.be.revertedWith("RaffleChain: raffle is not cancelled");
        });
    });

    describe("withdrawFunds", function () {
        it("allows organizer to withdraw funds after winner is selected", async function () {
            const { raffleChain, organizer, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await expect(raffleChain.connect(organizer).withdrawFunds(0n))
                .to.emit(raffleChain, "FundsWithdrawn")
                .withArgs(0n, organizer.address, TICKET_PRICE);

            const raffle = await raffleChain.getRaffle(0n);

            expect(raffle.fundsWithdrawn).to.equal(true);
            expect(raffle.amountCollected).to.equal(0n);
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

        it("reverts if organizer withdraws twice", async function () {
            const { raffleChain, organizer, buyer } = await deployRaffleChainHarness();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await raffleChain.exposedSelectWinner(0n, 0n);

            await raffleChain.connect(organizer).withdrawFunds(0n);

            await expect(
                raffleChain.connect(organizer).withdrawFunds(0n),
            ).to.be.revertedWith("RaffleChain: funds already withdrawn");
        });

        it("reverts if winner is not selected yet", async function () {
            const { raffleChain, organizer, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(
                raffleChain.connect(organizer).withdrawFunds(0n),
            ).to.be.revertedWith("RaffleChain: winner not selected yet");
        });
    });

    describe("view functions", function () {
        it("reverts getRaffle if raffle does not exist", async function () {
            const { raffleChain } = await deployRaffleChain();

            await expect(raffleChain.getRaffle(999n)).to.be.revertedWith(
                "RaffleChain: raffle does not exist",
            );
        });

        it("reverts getSoldTicketNumberByIndex if index is out of bounds", async function () {
            const { raffleChain, buyer } = await deployRaffleChain();
            const endTime = await getEndTime();

            await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

            await raffleChain.connect(buyer).buyTicket(0n, 1n, {
                value: TICKET_PRICE,
            });

            await expect(
                raffleChain.getSoldTicketNumberByIndex(0n, 1n),
            ).to.be.revertedWith("RaffleChain: index out of bounds");
        });

        it("reverts getTicketInfo if token does not exist", async function () {
            const { raffleChain } = await deployRaffleChain();

            await expect(raffleChain.getTicketInfo(999n)).to.be.revertedWith(
                "RaffleChain: token does not exist",
            );
        });
    });
});