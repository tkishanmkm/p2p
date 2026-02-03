// All IDs are string (UUID)
// Amounts are string to handle DECIMAL(36,18) precision

export type User = {
  id: string;
  userId: string; // Public username
  oldUserId?: string;
  fullName: string; // Encrypted
  dob: string; // Encrypted, DATE
  photoURL?: string;
  isBanned: boolean;
  isOnHold: boolean;
  tradeVolume: string; // DECIMAL
  completedTrades: number; // INT
  usernameChanged: boolean;
  createdAt: string; // TIMESTAMP
  lastLoginIp: string;
  feedbackScore: number; // Calculated from 0-100
  accountAge: string; // Calculated, e.g., "2 years"
};

export type UserWallet = {
  id: string; // crypto ticker e.g. 'BTC'
  userId: string;
  crypto: CryptoCurrency;
  balance: number;
  lockedBalance: number;
  updatedAt: string; // TIMESTAMP
};

export type Deposit = {
  id: string;
  userId: string;
  crypto: CryptoCurrency;
  chain: string;
  txId?: string;
  receipt?: string; // file path
  amount: string; // DECIMAL
  status: 'pending' | 'approved' | 'declined' | 'expired';
  timerEnd: string; // TIMESTAMP
  adminId?: string;
  createdAt: string; // TIMESTAMP
};

export type Withdrawal = {
  id: string;
  userId: string;
  crypto: CryptoCurrency;
  chain: string;
  address: string;
  amount: string; // DECIMAL
  status: 'pending' | 'approved' | 'declined';
  adminId?: string;
  createdAt: string; // TIMESTAMP
};

export type P2PAd = {
  id: string;
  userId: string;
  adType: 'buy' | 'sell';
  crypto: CryptoCurrency;
  fiatCurrency: string;
  paymentMethods: string[];
  rateType: 'fixed' | 'market';
  ratePercent?: number;
  fixedRate?: number;
  minAmount: number;
  maxAmount: number;
  terms: string;
  active: boolean;
  createdAt: string; // TIMESTAMP
  user: Pick<User, 'userId' | 'feedbackScore' | 'completedTrades'>;
};

export type TradeStatus = 'active' | 'paid' | 'released' | 'expired' | 'disputed' | 'cancelled';

export type Trade = {
  id: string;
  tradeId: string; // Public
  adId: string;
  buyerId: string;
  sellerId: string;
  crypto: CryptoCurrency;
  amount: number; // Crypto amount
  fiatCurrency: string;
  fiatAmount: number;
  price: number; // Price per crypto
  status: TradeStatus;
  claimedByBuyer: boolean;
  expiresAt: string; // TIMESTAMP
  paidAt?: string; // TIMESTAMP
  releasedAt?: string; // TIMESTAMP
  createdAt: string; // TIMESTAMP;
  buyer: Pick<User, 'userId'>;
  seller: Pick<User, 'userId'>;
};

export type TradeChatMessage = {
  id: string;
  tradeId: string;
  senderId: string;
  senderUsername: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  isModerator: boolean;
  createdAt: string; // TIMESTAMP
  isHarmful?: boolean;
  harmfulReasoning?: string;
};

export type Dispute = {
  id: string;
  tradeId: string;
  openedBy: string;
  reason: string;
  status: 'open' | 'resolved' | 'cancelled';
  adminId?: string;
  resolutionNote?: string;
  createdAt: string; // TIMESTAMP
};

export type Feedback = {
  id: string;
  tradeId: string;
  fromUser: string;
  toUser: string;
  rating: 'positive' | 'negative';
  comment: string;
  createdAt: string; // TIMESTAMP
  fromUsername: string;
};

export type AdminLog = {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  createdAt: string; // TIMESTAMP
};

export type SupportTicket = {
  id: string;
  userId: string;
  email: string;
  message: string;
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
};

export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH' | 'LTC';

export type SupportedCrypto = {
  name: CryptoCurrency;
};

    