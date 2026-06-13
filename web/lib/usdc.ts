import { ethers } from "ethers";

export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS!;
export const USDC_DECIMALS = 6;

export const USDC_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
] as const;

export function getUsdcContract(signer: ethers.Signer): ethers.Contract {
    return new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
}

export function parseUsdc(value: string): bigint {
    return ethers.parseUnits(value, USDC_DECIMALS);
}

export function formatUsdc(value: bigint): string {
    return ethers.formatUnits(value, USDC_DECIMALS);
}