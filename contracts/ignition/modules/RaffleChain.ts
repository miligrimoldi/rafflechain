import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const SUBSCRIPTION_ID =
    8529824356532294884237634296013055411239031208551691137878603213910828910990n;

const VRF_COORDINATOR = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";

const KEY_HASH =
    "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";

const CALLBACK_GAS_LIMIT = 300000;

const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export default buildModule("RaffleChainUSDCModule", (m) => {
    const raffleChain = m.contract("RaffleChain", [
        SUBSCRIPTION_ID,
        VRF_COORDINATOR,
        KEY_HASH,
        CALLBACK_GAS_LIMIT,
        USDC_SEPOLIA,
    ]);

    return { raffleChain };
});