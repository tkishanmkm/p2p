
import * as functions from "firebase-functions";

// Mainnet Contract Addresses
export const ERC20_USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
export const TRC20_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

// Confirmation thresholds for security
export const ETH_CONFIRMATIONS = 12;
export const TRON_CONFIRMATIONS = 20;
export const BTC_CONFIRMATIONS = 3;
export const LTC_CONFIRMATIONS = 6;


export const ERC20_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function balanceOf(address) view returns (uint256)"
];

// Securely access environment variables from Firebase Functions config
export const getEnv = () => {
    const config = functions.config();
    return {
        ADMIN_MASTER_SEED: config.keys.admin_master_seed,
        INFURA_API_KEY: config.keys.infura_api_key,
        TRONGRID_API_KEY: config.keys.trongrid_api_key,
        BLOCKCYPHER_TOKEN: config.keys.blockcypher_token,
        AES_SECRET: config.keys.aes_secret,
        ETH_RPC: config.rpc.eth_url,
        TRON_RPC: config.rpc.tron_url,
    };
};
