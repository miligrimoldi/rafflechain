export const RAFFLECHAIN_ABI = [
  // createRaffle
  "function createRaffle(uint256 ticketPrice, uint256 maxTickets, uint256 endTime) external returns (uint256)",
  // buyTicket
  "function buyTicket(uint256 raffleId, uint256 ticketNumber) external payable",
  // requestWinner
  "function requestWinner(uint256 raffleId) external returns (uint256 requestId)",
  // retryWinnerRequest
  "function retryWinnerRequest(uint256 raffleId) external returns (uint256 requestId)",
  // cancelEmptyRaffle
  "function cancelEmptyRaffle(uint256 raffleId) external",
  // cancelStuckRaffle
  "function cancelStuckRaffle(uint256 raffleId) external",
  // claimRefund
  "function claimRefund(uint256 raffleId, uint256 ticketNumber) external",
  // withdrawFunds
  "function withdrawFunds(uint256 raffleId) external",
  // claimPrize
  "function claimPrize(uint256 raffleId) external",
  // getRaffle — vrfRequestTimestamp added at end of struct
  "function getRaffle(uint256 raffleId) external view returns (tuple(uint256 id, address organizer, uint256 ticketPrice, uint256 maxTickets, uint256 endTime, uint256 ticketsSold, uint256 amountCollected, uint256 winningTicketNumber, address winner, uint256 randomNumber, uint8 status, bool fundsWithdrawn, bool prizeClaimed, uint256 vrfRequestTimestamp))",
  // getTicketsSold
  "function getTicketsSold(uint256 raffleId) external view returns (uint256)",
  // getTicketOwner
  "function getTicketOwner(uint256 raffleId, uint256 ticketNumber) external view returns (address)",
  // isRaffleEnded
  "function isRaffleEnded(uint256 raffleId) external view returns (bool)",
  // Events
  "event RaffleCreated(uint256 indexed raffleId, address indexed organizer, uint256 ticketPrice, uint256 maxTickets, uint256 endTime)",
  "event TicketPurchased(uint256 indexed raffleId, address indexed buyer, uint256 indexed ticketNumber, uint256 tokenId)",
  "event WinnerSelected(uint256 indexed raffleId, address indexed winner, uint256 indexed winningTicketNumber, uint256 randomNumber)",
  "event FundsWithdrawn(uint256 indexed raffleId, address indexed organizer, uint256 amount)",
  "event PrizeClaimed(uint256 indexed raffleId, address indexed winner)",
  "event WinnerRequestRetried(uint256 indexed raffleId, uint256 indexed newRequestId)",
  "event RaffleCancelled(uint256 indexed raffleId)",
  "event RefundClaimed(uint256 indexed raffleId, address indexed buyer, uint256 ticketNumber)",
] as const;
