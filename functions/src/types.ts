
export type CryptoCurrency = "BTC" | "ETH" | "LTC" | "USDT" | "BNB" | "MATIC" | "TRX";

export interface Wallet {
    address: string;
    encryptedPrivateKey: string; // Encrypted with AES
    balance: number;
    lockedBalance: number;
    lastProcessedBlock?: number; // For ETH/EVM chains
    lastProcessedTxId?: string; // For polling-based chains like BTC/TRON
    createdAt: FirebaseFirestore.Timestamp;
}

export interface Balance {
    available: number;
    updatedAt: FirebaseFirestore.Timestamp;
}

export interface Transaction {
    id?: string;
    type: "deposit" | "withdrawal";
    amount: number;
    txHash: string;
    status: 'pending' | 'completed' | 'failed';
    createdAt: FirebaseFirestore.Timestamp;
}

export interface ProcessedTx {
    txHash: string;
    processedAt: FirebaseFirestore.Timestamp;
}
