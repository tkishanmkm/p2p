export type CryptoCurrency = 'BTC' | 'ETH' | 'LTC' | 'USDT' | 'TRC20' | 'BEP20';

export interface UserWallet {
  crypto: CryptoCurrency;
  balance: number;
  lockedBalance: number;
}

export interface Deposit {
  id?: string;
  userId: string;
  crypto: CryptoCurrency;
  amount: number;
  txId?: string;
  tokenContract?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: any;
}

export interface Withdrawal {
  id?: string;
  userId: string;
  crypto: CryptoCurrency;
  amount: number;
  address: string;
  status: 'pending' | 'approved' | 'declined';
  createdAt: any;
}