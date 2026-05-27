// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../RaffleChain.sol";

contract RaffleChainHarness is RaffleChain {
    constructor(
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 keyHash,
        uint32 callbackGasLimit
    )
        RaffleChain(
            subscriptionId,
            vrfCoordinator,
            keyHash,
            callbackGasLimit
        )
    {}

    function exposedSelectWinner(
        uint256 raffleId,
        uint256 randomNumber
    ) external {
        _selectWinner(raffleId, randomNumber);
    }
}