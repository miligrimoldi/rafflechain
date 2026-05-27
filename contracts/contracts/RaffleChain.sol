// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract RaffleChain is ERC721, ReentrancyGuard, VRFConsumerBaseV2Plus {
    enum RaffleStatus {
        ACTIVE,
        WAITING_RANDOMNESS,
        WINNER_SELECTED,
        CANCELLED
    }

    struct Raffle {
        uint256 id;
        address organizer;
        uint256 ticketPrice;
        uint256 maxTickets;
        uint256 endTime;
        uint256 ticketsSold;
        uint256 amountCollected;
        uint256 winningTicketNumber;
        address winner;
        uint256 randomNumber;
        RaffleStatus status;
        bool fundsWithdrawn;
        bool prizeClaimed;
        uint256 vrfRequestTimestamp;
    }

    uint256 private _nextRaffleId;
    uint256 private _nextTokenId;

    uint256 private immutable i_subscriptionId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;

    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint256 private constant VRF_TIMEOUT = 1 hours;
    uint256 private constant CANCEL_TIMEOUT = 24 hours;

    mapping(uint256 => Raffle) internal _raffles;
    mapping(uint256 => uint256) private _requestToRaffleId;

    mapping(uint256 => mapping(uint256 => address)) private _ticketOwner;
    mapping(uint256 => mapping(uint256 => uint256)) private _soldTicketNumbers;
    mapping(uint256 => mapping(uint256 => bool)) private _ticketRefunded;

    mapping(uint256 => uint256) private _tokenRaffleId;
    mapping(uint256 => uint256) private _tokenTicketNumber;

    event RaffleCreated(
        uint256 indexed raffleId,
        address indexed organizer,
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 endTime
    );

    event TicketPurchased(
        uint256 indexed raffleId,
        address indexed buyer,
        uint256 indexed ticketNumber,
        uint256 tokenId
    );

    event RandomnessRequested(
        uint256 indexed raffleId,
        uint256 indexed requestId
    );

    event WinnerSelected(
        uint256 indexed raffleId,
        address indexed winner,
        uint256 indexed winningTicketNumber,
        uint256 randomNumber
    );

    event FundsWithdrawn(
        uint256 indexed raffleId,
        address indexed organizer,
        uint256 amount
    );

    event PrizeClaimed(
        uint256 indexed raffleId,
        address indexed winner
    );

    event WinnerRequestRetried(
        uint256 indexed raffleId,
        uint256 indexed newRequestId
    );

    event RaffleCancelled(
        uint256 indexed raffleId
    );

    event RefundClaimed(
        uint256 indexed raffleId,
        address indexed buyer,
        uint256 ticketNumber
    );

    constructor(
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit
    )
        ERC721("RaffleChain Ticket", "RCT")
        VRFConsumerBaseV2Plus(vrfCoordinator)
    {
        i_subscriptionId = subscriptionId;
        i_keyHash = keyHash;
        i_callbackGasLimit = callbackGasLimit;
    }

    modifier raffleExists(uint256 raffleId) {
        require(
            _raffles[raffleId].organizer != address(0),
            "RaffleChain: raffle does not exist"
        );
        _;
    }

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
            ticketsSold: 0,
            amountCollected: 0,
            winningTicketNumber: 0,
            winner: address(0),
            randomNumber: 0,
            status: RaffleStatus.ACTIVE,
            fundsWithdrawn: false,
            prizeClaimed: false,
            vrfRequestTimestamp: 0
        });

        emit RaffleCreated(raffleId, msg.sender, ticketPrice, maxTickets, endTime);

        return raffleId;
    }

    function buyTicket(
        uint256 raffleId,
        uint256 ticketNumber
    ) external payable nonReentrant raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.ACTIVE, "RaffleChain: raffle is not active");
        require(block.timestamp < raffle.endTime, "RaffleChain: raffle has ended");
        require(raffle.ticketsSold < raffle.maxTickets, "RaffleChain: sold out");
        require(ticketNumber >= 1 && ticketNumber <= raffle.maxTickets, "RaffleChain: invalid ticket number");
        require(_ticketOwner[raffleId][ticketNumber] == address(0), "RaffleChain: ticket already sold");
        require(msg.value == raffle.ticketPrice, "RaffleChain: incorrect ETH amount");

        uint256 tokenId = _nextTokenId++;

        _ticketOwner[raffleId][ticketNumber] = msg.sender;
        _soldTicketNumbers[raffleId][raffle.ticketsSold] = ticketNumber;

        raffle.ticketsSold += 1;
        raffle.amountCollected += msg.value;

        _tokenRaffleId[tokenId] = raffleId;
        _tokenTicketNumber[tokenId] = ticketNumber;

        _safeMint(msg.sender, tokenId);

        emit TicketPurchased(raffleId, msg.sender, ticketNumber, tokenId);
    }

    function requestWinner(
        uint256 raffleId
    ) external nonReentrant raffleExists(raffleId) returns (uint256 requestId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.ACTIVE, "RaffleChain: raffle is not active");
        require(_isRaffleEnded(raffleId), "RaffleChain: raffle has not ended yet");
        require(raffle.ticketsSold > 0, "RaffleChain: no tickets sold");

        raffle.status = RaffleStatus.WAITING_RANDOMNESS;
        raffle.vrfRequestTimestamp = block.timestamp;

        requestId = _requestVRF();
        _requestToRaffleId[requestId] = raffleId;

        emit RandomnessRequested(raffleId, requestId);
    }

    function retryWinnerRequest(
        uint256 raffleId
    ) external nonReentrant raffleExists(raffleId) returns (uint256 requestId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.WAITING_RANDOMNESS, "RaffleChain: not waiting randomness");
        require(
            block.timestamp >= raffle.vrfRequestTimestamp + VRF_TIMEOUT,
            "RaffleChain: VRF timeout not reached"
        );

        raffle.vrfRequestTimestamp = block.timestamp;

        requestId = _requestVRF();
        _requestToRaffleId[requestId] = raffleId;

        emit WinnerRequestRetried(raffleId, requestId);
    }

    // Cancels a raffle that ended with zero tickets sold, leaving no closure otherwise.
    function cancelEmptyRaffle(
        uint256 raffleId
    ) external raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.ACTIVE, "RaffleChain: raffle is not active");
        require(_isRaffleEnded(raffleId), "RaffleChain: raffle has not ended yet");
        require(raffle.ticketsSold == 0, "RaffleChain: raffle has tickets sold");

        raffle.status = RaffleStatus.CANCELLED;

        emit RaffleCancelled(raffleId);
    }

    // Cancels a raffle stuck in WAITING_RANDOMNESS after CANCEL_TIMEOUT, enabling buyer refunds.
    function cancelStuckRaffle(
        uint256 raffleId
    ) external raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.WAITING_RANDOMNESS, "RaffleChain: not waiting randomness");
        require(
            block.timestamp >= raffle.vrfRequestTimestamp + CANCEL_TIMEOUT,
            "RaffleChain: cancel timeout not reached"
        );

        raffle.status = RaffleStatus.CANCELLED;

        emit RaffleCancelled(raffleId);
    }

    function claimRefund(
        uint256 raffleId,
        uint256 ticketNumber
    ) external nonReentrant raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.CANCELLED, "RaffleChain: raffle is not cancelled");
        require(_ticketOwner[raffleId][ticketNumber] == msg.sender, "RaffleChain: not ticket owner");
        require(!_ticketRefunded[raffleId][ticketNumber], "RaffleChain: refund already claimed");

        _ticketRefunded[raffleId][ticketNumber] = true;

        (bool success, ) = msg.sender.call{value: raffle.ticketPrice}("");
        require(success, "RaffleChain: refund transfer failed");

        emit RefundClaimed(raffleId, msg.sender, ticketNumber);
    }

    function withdrawFunds(
        uint256 raffleId
    ) external nonReentrant raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(msg.sender == raffle.organizer, "RaffleChain: only organizer");
        require(raffle.status == RaffleStatus.WINNER_SELECTED, "RaffleChain: winner not selected yet");
        require(!raffle.fundsWithdrawn, "RaffleChain: funds already withdrawn");
        require(raffle.amountCollected > 0, "RaffleChain: no funds to withdraw");

        uint256 amount = raffle.amountCollected;

        raffle.fundsWithdrawn = true;
        raffle.amountCollected = 0;

        (bool success, ) = raffle.organizer.call{value: amount}("");
        require(success, "RaffleChain: transfer failed");

        emit FundsWithdrawn(raffleId, raffle.organizer, amount);
    }

    function claimPrize(
        uint256 raffleId
    ) external raffleExists(raffleId) {
        Raffle storage raffle = _raffles[raffleId];

        require(raffle.status == RaffleStatus.WINNER_SELECTED, "RaffleChain: winner not selected yet");
        require(msg.sender == raffle.winner, "RaffleChain: only winner can claim");
        require(!raffle.prizeClaimed, "RaffleChain: prize already claimed");

        raffle.prizeClaimed = true;

        emit PrizeClaimed(raffleId, msg.sender);
    }

    function getRaffle(
        uint256 raffleId
    ) external view raffleExists(raffleId) returns (Raffle memory) {
        return _raffles[raffleId];
    }

    function getTicketsSold(
        uint256 raffleId
    ) external view raffleExists(raffleId) returns (uint256) {
        return _raffles[raffleId].ticketsSold;
    }

    function getTicketOwner(
        uint256 raffleId,
        uint256 ticketNumber
    ) external view raffleExists(raffleId) returns (address) {
        return _ticketOwner[raffleId][ticketNumber];
    }

    function getSoldTicketNumberByIndex(
        uint256 raffleId,
        uint256 index
    ) external view raffleExists(raffleId) returns (uint256) {
        require(index < _raffles[raffleId].ticketsSold, "RaffleChain: index out of bounds");
        return _soldTicketNumbers[raffleId][index];
    }

    function getTicketInfo(
        uint256 tokenId
    ) external view returns (uint256 raffleId, uint256 ticketNumber) {
        require(_ownerOf(tokenId) != address(0), "RaffleChain: token does not exist");

        return (_tokenRaffleId[tokenId], _tokenTicketNumber[tokenId]);
    }

    function isRaffleEnded(
        uint256 raffleId
    ) external view raffleExists(raffleId) returns (bool) {
        return _isRaffleEnded(raffleId);
    }

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        uint256 raffleId = _requestToRaffleId[requestId];
        Raffle storage raffle = _raffles[raffleId];

        // If the raffle was cancelled while waiting (e.g. via cancelStuckRaffle),
        // a late VRF response should be ignored rather than reverting.
        if (raffle.status != RaffleStatus.WAITING_RANDOMNESS) return;

        _selectWinner(raffleId, randomWords[0]);
    }

    function _selectWinner(
        uint256 raffleId,
        uint256 randomNumber
    ) internal {
        Raffle storage raffle = _raffles[raffleId];

        uint256 winnerIndex = randomNumber % raffle.ticketsSold;
        uint256 winningTicketNumber = _soldTicketNumbers[raffleId][winnerIndex];
        address winner = _ticketOwner[raffleId][winningTicketNumber];

        raffle.randomNumber = randomNumber;
        raffle.winningTicketNumber = winningTicketNumber;
        raffle.winner = winner;
        raffle.status = RaffleStatus.WINNER_SELECTED;

        emit WinnerSelected(raffleId, winner, winningTicketNumber, randomNumber);
    }

    function _isRaffleEnded(
        uint256 raffleId
    ) internal view returns (bool) {
        Raffle storage raffle = _raffles[raffleId];

        return block.timestamp >= raffle.endTime || raffle.ticketsSold == raffle.maxTickets;
    }

    function _requestVRF() internal returns (uint256 requestId) {
        return s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_keyHash,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({
                        nativePayment: true
                    })
                )
            })
        );
    }
}
