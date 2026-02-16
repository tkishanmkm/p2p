
export type CryptoCurrency = "BTC" | "ETH" | "LTC" | "USDT" | "BNB" | "MATIC" | "TRX";

export type UserWallet = {
  id: string; // e.g., USDT-ERC20
  userId: string;
  crypto: CryptoCurrency;
  chain: string; // e.g., ERC20, TRC20
  balance: number;
  lockedBalance: number;
  updatedAt: string; // ISO String
  depositAddress: string;
};

export type Deposit = {
  id?: string;
  userId: string;
  crypto: CryptoCurrency;
  chain: string;
  amount: number;
  txId?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any; // Firestore Timestamp
};

export type Withdrawal = {
  id?: string;
  userId: string;
  crypto: CryptoCurrency;
  chain: string;
  amount: number;
  address: string;
  fee?: number;
  txHash?: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: any; // Firestore Timestamp
};
