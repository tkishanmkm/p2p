
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
  crypto: CryptoCurrency;
  amount: number;
  txId: string;
  status: string;
  createdAt: number;
};

export type Withdrawal = {
  id: string;
  userId: string;
  crypto: CryptoCurrency;
  amount: number;
  address: string;
  status: string;
  createdAt: number;
};
