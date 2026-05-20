import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.create();

const TICKET_PRICE = ethers.parseEther("0.1");
const MAX_TICKETS = 10n;
const ONE_HOUR = 3600;

async function getEndTime(offsetSeconds = ONE_HOUR): Promise<bigint> {
  const block = await ethers.provider.getBlock("latest");
  return BigInt(block!.timestamp) + BigInt(offsetSeconds);
}

async function advanceTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("RaffleChain", function () {
  // ============ createRaffle ============

  describe("createRaffle", function () {
    it("crea una rifa correctamente", async function () {
      const [organizer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
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
      expect(raffle.amountCollected).to.equal(0n);
      expect(raffle.winner).to.equal("0x0000000000000000000000000000000000000000");
      expect(raffle.status).to.equal(0n); // RaffleStatus.ACTIVE
      expect(raffle.fundsWithdrawn).to.equal(false);
      expect(raffle.prizeClaimed).to.equal(false);
    });

    it("rechaza rifa con precio 0", async function () {
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();

      await expect(
        raffleChain.createRaffle(0n, MAX_TICKETS, endTime)
      ).to.be.revertedWith("RaffleChain: ticket price must be > 0");
    });

    it("rechaza rifa con maxTickets 0", async function () {
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();

      await expect(
        raffleChain.createRaffle(TICKET_PRICE, 0n, endTime)
      ).to.be.revertedWith("RaffleChain: max tickets must be > 0");
    });

    it("rechaza rifa con endTime en el pasado", async function () {
      const raffleChain = await ethers.deployContract("RaffleChain");
      const block = await ethers.provider.getBlock("latest");
      const pastTime = BigInt(block!.timestamp) - 1n;

      await expect(
        raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, pastTime)
      ).to.be.revertedWith("RaffleChain: end time must be in the future");
    });
  });

  // ============ buyTickets ============

  describe("buyTickets", function () {
    it("permite comprar 1 ticket", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      await expect(
        raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE })
      )
        .to.emit(raffleChain, "TicketsPurchased")
        .withArgs(0n, buyer.address, 1n);

      expect(await raffleChain.getTicketsSold(0n)).to.equal(1n);

      const tickets = await raffleChain.getTickets(0n);
      expect(tickets[0]).to.equal(buyer.address);
    });

    it("permite comprar varios tickets", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      const quantity = 3n;
      await raffleChain.connect(buyer).buyTickets(0n, quantity, {
        value: TICKET_PRICE * quantity,
      });

      const tickets = await raffleChain.getTickets(0n);
      expect(tickets.length).to.equal(3);
      // same address must appear 3 times
      expect(tickets[0]).to.equal(buyer.address);
      expect(tickets[1]).to.equal(buyer.address);
      expect(tickets[2]).to.equal(buyer.address);
    });

    it("rechaza compra si se manda ETH incorrecto", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      await expect(
        raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE / 2n })
      ).to.be.revertedWith("RaffleChain: incorrect ETH amount");
    });

    it("rechaza compra si quantity = 0", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      await expect(
        raffleChain.connect(buyer).buyTickets(0n, 0n, { value: 0n })
      ).to.be.revertedWith("RaffleChain: quantity must be > 0");
    });

    it("rechaza compra si supera maxTickets", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, 5n, endTime);

      await expect(
        raffleChain.connect(buyer).buyTickets(0n, 6n, { value: TICKET_PRICE * 6n })
      ).to.be.revertedWith("RaffleChain: would exceed max tickets");
    });

    it("rechaza compra si la rifa terminó", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      await advanceTime(ONE_HOUR + 2);

      await expect(
        raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE })
      ).to.be.revertedWith("RaffleChain: raffle has ended");
    });
  });

  // ============ drawWinnerForTesting ============

  describe("drawWinnerForTesting", function () {
    it("permite sortear con fakeRandomNumber", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);

      await expect(raffleChain.drawWinnerForTesting(0n, 42n))
        .to.emit(raffleChain, "WinnerSelected")
        .withArgs(0n, buyer.address, 42n);

      const raffle = await raffleChain.getRaffle(0n);
      expect(raffle.winner).to.equal(buyer.address);
      expect(raffle.randomNumber).to.equal(42n);
      expect(raffle.status).to.equal(2n); // RaffleStatus.WINNER_SELECTED
    });

    it("verifica que winnerIndex = fakeRandomNumber % tickets.length", async function () {
      const signers = await ethers.getSigners();
      const [, buyer1, buyer2, buyer3] = signers;
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      // tickets = [buyer1, buyer2, buyer3]
      await raffleChain.connect(buyer1).buyTickets(0n, 1n, { value: TICKET_PRICE });
      await raffleChain.connect(buyer2).buyTickets(0n, 1n, { value: TICKET_PRICE });
      await raffleChain.connect(buyer3).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);

      const fakeRandomNumber = 7n; // 7 % 3 = 1 → index 1 → buyer2
      await raffleChain.drawWinnerForTesting(0n, fakeRandomNumber);

      const tickets = await raffleChain.getTickets(0n);
      const expectedWinnerIndex = Number(fakeRandomNumber) % tickets.length;
      const expectedWinner = tickets[expectedWinnerIndex];

      const raffle = await raffleChain.getRaffle(0n);
      expect(raffle.winner).to.equal(expectedWinner);
      expect(raffle.winner).to.equal(buyer2.address);
    });

    it("rechaza sortear si no hay tickets vendidos", async function () {
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);

      await advanceTime(ONE_HOUR + 2);

      await expect(
        raffleChain.drawWinnerForTesting(0n, 42n)
      ).to.be.revertedWith("RaffleChain: no tickets sold");
    });

    it("rechaza sortear antes de que termine la rifa", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      // time not advanced — raffle has not ended
      await expect(
        raffleChain.drawWinnerForTesting(0n, 42n)
      ).to.be.revertedWith("RaffleChain: raffle has not ended yet");
    });

    it("rechaza sortear dos veces", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);
      await raffleChain.drawWinnerForTesting(0n, 42n);

      await expect(
        raffleChain.drawWinnerForTesting(0n, 99n)
      ).to.be.revertedWith("RaffleChain: raffle is not active");
    });
  });

  // ============ withdrawFunds ============

  describe("withdrawFunds", function () {
    it("permite retirar fondos solo al organizador después de seleccionar ganador", async function () {
      const [organizer, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);
      await raffleChain.drawWinnerForTesting(0n, 0n);

      await expect(raffleChain.withdrawFunds(0n))
        .to.emit(raffleChain, "FundsWithdrawn")
        .withArgs(0n, organizer.address, TICKET_PRICE);

      const raffle = await raffleChain.getRaffle(0n);
      expect(raffle.fundsWithdrawn).to.equal(true);
      expect(raffle.amountCollected).to.equal(0n);
    });

    it("rechaza retirar fondos antes de seleccionar ganador", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      // no winner selected yet
      await expect(raffleChain.withdrawFunds(0n)).to.be.revertedWith(
        "RaffleChain: winner not selected yet"
      );
    });

    it("rechaza retirar fondos dos veces", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);
      await raffleChain.drawWinnerForTesting(0n, 0n);
      await raffleChain.withdrawFunds(0n);

      await expect(raffleChain.withdrawFunds(0n)).to.be.revertedWith(
        "RaffleChain: funds already withdrawn"
      );
    });
  });

  // ============ claimPrize ============

  describe("claimPrize", function () {
    it("permite reclamar premio solo al ganador", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);
      // fakeRandomNumber=0 → winnerIndex = 0 % 1 = 0 → tickets[0] = buyer
      await raffleChain.drawWinnerForTesting(0n, 0n);

      await expect(raffleChain.connect(buyer).claimPrize(0n))
        .to.emit(raffleChain, "PrizeClaimed")
        .withArgs(0n, buyer.address);

      const raffle = await raffleChain.getRaffle(0n);
      expect(raffle.prizeClaimed).to.equal(true);
    });

    it("rechaza reclamar premio dos veces", async function () {
      const [, buyer] = await ethers.getSigners();
      const raffleChain = await ethers.deployContract("RaffleChain");
      const endTime = await getEndTime();
      await raffleChain.createRaffle(TICKET_PRICE, MAX_TICKETS, endTime);
      await raffleChain.connect(buyer).buyTickets(0n, 1n, { value: TICKET_PRICE });

      await advanceTime(ONE_HOUR + 2);
      await raffleChain.drawWinnerForTesting(0n, 0n);
      await raffleChain.connect(buyer).claimPrize(0n);

      await expect(raffleChain.connect(buyer).claimPrize(0n)).to.be.revertedWith(
        "RaffleChain: prize already claimed"
      );
    });
  });
});
