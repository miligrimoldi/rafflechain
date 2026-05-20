// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract RaffleChain is ReentrancyGuard {
    // Tipos

    // WAITING_RANDOMNESS queda reservado para la futura integración con Chainlink VRF.
    // Cuando se agregue el oráculo, drawWinnerForTesting() será reemplazada por:
    //   requestWinner()       → cambia el estado a WAITING_RANDOMNESS y solicita random al coordinador VRF
    //   fulfillRandomWords()  → callback que recibe el número aleatorio y define el ganador
    enum RaffleStatus {
        ACTIVE,
        WAITING_RANDOMNESS,
        WINNER_SELECTED
    }

    struct Raffle {
        uint256 id;
        address organizer;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 endTime;
        uint256 amountCollected;
        address winner;
        uint256 randomNumber;
        RaffleStatus status;
        bool fundsWithdrawn;
        bool prizeClaimed;
    }

    // Estados

    uint256 private _nextRaffleId;
    mapping(uint256 => Raffle) private _raffles;
    mapping(uint256 => address[]) private _tickets;

    // Eventos

    event RaffleCreated(
        uint256 indexed raffleId,
        address indexed organizer,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 endTime
    );
    event TicketsPurchased(uint256 indexed raffleId, address indexed buyer, uint256 quantity);
    event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 randomNumber);
    event FundsWithdrawn(uint256 indexed raffleId, address indexed organizer, uint256 amount);
    event PrizeClaimed(uint256 indexed raffleId, address indexed winner);

    // Modifier

    modifier raffleExists(uint256 raffleId) {
        require(_raffles[raffleId].organizer != address(0), "RaffleChain: raffle does not exist");
        _;
    }

    // Funciones externas

    function createRaffle(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 endTime
    ) external returns (uint256) {
        require(ticketPrice > 0, "RaffleChain: ticket price must be > 0");
        require(maxTickets > 0, "RaffleChain: max tickets must be > 0");
        require(endTime > block.timestamp, "RaffleChain: end time must be in the future");

        uint256 raffleId = _nextRaffleId++;
        _raffles[raffleId] = Raffle({
            id: raffleId,
            organizer: msg.sender,
            ticketPrice: ticketPrice,
            maxTickets: maxTickets,
            endTime: endTime,
            amountCollected: 0,
            winner: address(0),
            randomNumber: 0,
            status: RaffleStatus.ACTIVE,
            fundsWithdrawn: false,
            prizeClaimed: false
        });

        emit RaffleCreated(raffleId, msg.sender, ticketPrice, maxTickets, endTime);
        return raffleId;
    }

    function buyTickets(uint256 raffleId, uint256 quantity) external payable raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];
        require(raffle.status == RaffleStatus.ACTIVE, "RaffleChain: raffle is not active");
        require(block.timestamp < raffle.endTime, "RaffleChain: raffle has ended");
        require(quantity > 0, "RaffleChain: quantity must be > 0");
        require(
            _tickets[raffleId].length + quantity <= raffle.maxTickets,
            "RaffleChain: would exceed max tickets"
        );
        require(msg.value == raffle.ticketPrice * quantity, "RaffleChain: incorrect ETH amount");

        for (uint256 i = 0; i < quantity; i++) {
            _tickets[raffleId].push(msg.sender);
        }
        raffle.amountCollected += msg.value;

        emit TicketsPurchased(raffleId, msg.sender, quantity);
    }

    // Función temporal para testing local.
    // Más adelante será reemplazada por requestWinner() + fulfillRandomWords()
    // al integrar Chainlink
    function drawWinnerForTesting(uint256 raffleId, uint256 fakeRandomNumber) external raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];
        require(msg.sender == raffle.organizer, "RaffleChain: only organizer");
        require(raffle.status == RaffleStatus.ACTIVE, "RaffleChain: raffle is not active");
        require(
            block.timestamp >= raffle.endTime || _tickets[raffleId].length == raffle.maxTickets,
            "RaffleChain: raffle has not ended yet"
        );
        require(_tickets[raffleId].length > 0, "RaffleChain: no tickets sold");

        address[] storage tickets = _tickets[raffleId];
        uint256 winnerIndex = fakeRandomNumber % tickets.length;
        address winner = tickets[winnerIndex];

        raffle.randomNumber = fakeRandomNumber;
        raffle.winner = winner;
        raffle.status = RaffleStatus.WINNER_SELECTED;

        emit WinnerSelected(raffleId, winner, fakeRandomNumber);
    }

    function withdrawFunds(uint256 raffleId) external nonReentrant raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];
        require(msg.sender == raffle.organizer, "RaffleChain: only organizer");
        require(raffle.status == RaffleStatus.WINNER_SELECTED, "RaffleChain: winner not selected yet");
        require(!raffle.fundsWithdrawn, "RaffleChain: funds already withdrawn");
        require(raffle.amountCollected > 0, "RaffleChain: no funds to withdraw");

        // CEI: update state before external call
        raffle.fundsWithdrawn = true;
        uint256 amount = raffle.amountCollected;
        raffle.amountCollected = 0;

        (bool success, ) = raffle.organizer.call{value: amount}("");
        require(success, "RaffleChain: transfer failed");

        emit FundsWithdrawn(raffleId, raffle.organizer, amount);
    }

    function claimPrize(uint256 raffleId) external raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];
        require(raffle.status == RaffleStatus.WINNER_SELECTED, "RaffleChain: winner not selected yet");
        require(msg.sender == raffle.winner, "RaffleChain: only winner can claim");
        require(!raffle.prizeClaimed, "RaffleChain: prize already claimed");

        raffle.prizeClaimed = true;

        emit PrizeClaimed(raffleId, msg.sender);
    }

    // Funciones de consulta

    function getTickets(uint256 raffleId) external view raffleExists(raffleId) returns (address[] memory) {
        return _tickets[raffleId];
    }

    function getTicketsSold(uint256 raffleId) external view raffleExists(raffleId) returns (uint256) {
        return _tickets[raffleId].length;
    }

    function isRaffleEnded(uint256 raffleId) external view raffleExists(raffleId) returns (bool) {
        Raffle storage raffle = _raffles[raffleId];
        return block.timestamp >= raffle.endTime || _tickets[raffleId].length == raffle.maxTickets;
    }

    function getRaffle(uint256 raffleId) external view raffleExists(raffleId) returns (Raffle memory) {
        return _raffles[raffleId];
    }
}
