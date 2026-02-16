export type CryptoCurrency = "BTC" | "ETH" | "USDT" | "LTC";

export type UserWallet = {
  crypto: CryptoCurrency;
  balance: number;
  lockedBalance: number;
};

export type CryptoDepositAddress = {
  crypto: CryptoCurrency;
  address: string;
};

export type Deposit = {
  id: string;
  userId: string;
  userDisplayName: string;
  crypto: CryptoCurrency;
  chain: string;
  amount: number;
  txId?: string;
  walletAddress: string;
  qrCodeUrl: string;
  status: 'pending' | 'awaiting_confirmation' | 'approved' | 'declined' | 'expired';
  finalAmount?: number;
  adminId?: string;
  createdAt: string;
  timerEnd: string;
};

export type Withdrawal = {
  id: string;
  userId: string;
  userDisplayName: string;
  crypto: CryptoCurrency;
  chain: string;
  address: string;
  amount: number;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  adminId?: string;
  createdAt: string;
};
