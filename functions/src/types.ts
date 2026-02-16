
export type CryptoCurrency = "ETH" | "USDT" | "TRX";
export type SupportedChain = "ERC20" | "TRC20";

export interface Wallet {
    depositAddress: string;
    balance: number;
    lockedBalance: number;
    lastProcessedBlock: number;
    createdAt: FirebaseFirestore.Timestamp;
}

export interface ProcessedTx {
    txHash: string;
    processedAt: FirebaseFirestore.Timestamp;
}
