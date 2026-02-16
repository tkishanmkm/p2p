
import * as functions from "firebase-functions";

export const ERC20_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
export const TRC20_USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

export const ETH_CONFIRMATIONS = 12;
export const TRON_CONFIRMATIONS = 20;

export const ERC20_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function balanceOf(address) view returns (uint256)"
];

// Securely access environment variables
export const getEnv = () => {
    const config = functions.config();
    return {
        ADMIN_MASTER_SEED: config.keys.admin_master_seed,
        INFURA_API_KEY: config.keys.infura_api_key,
        TRONGRID_API_KEY: config.keys.trongrid_api_key,
        ETH_RPC: config.rpc.eth_url,
        TRON_RPC: config.rpc.tron_url,
    };
};
