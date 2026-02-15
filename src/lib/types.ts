
// All IDs are string (UUID)
// Amounts are string to handle DECIMAL(36,18) precision

export interface WalletAddresses {
  ETH: string
  ERC20: string
  BEP20: string
  BTC: string
  LTC: string
  TRC20: string
}

export interface UserBalances {
  ETH: number
  USDT_ERC20: number
  USDT_BEP20: number
  USDT_TRC20: number
  BTC: number
  LTC: number
}

export type User = {
  id: string;
  userId: string; // Public username
  oldUserId?: string;
  fullName: string; // Encrypted
  dob: string; // Encrypted, DATE
  country?: string; // Country code, e.g., 'US'
  ipBasedCountry?: string; // Country code, e.g., 'US'
  photoURL?: string;
  isBanned: boolean;
  isOnHold: boolean;
  tradeVolume: number; // DECIMAL
  completedTrades: number; // INT
  usernameChanged: boolean;
  createdAt: string; // TIMESTAMP
  feedbackScore: number; // Calculated from 0-100
  positiveFeedback: number;
  negativeFeedback: number;
  avgPaymentTime: number; // In minutes
  avgReleaseTime: number; // In minutes
  preferredCurrency?: string;
  lastTradeAt?: string;
  lastActive?: string;
  securityQuestion?: string;
  securityAnswer?: string;
  seedPhrase?: string; // 12-word mnemonic
  isAdminAccount?: boolean;
  blockedUsers?: string[];
  badges?: string[];
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
  userDisplayName: string;
  crypto: CryptoCurrency;
  chain: string;
  txId?: string;
  walletAddress: string;
  qrCodeUrl: string;
  amount: number; // Requested amount
  finalAmount?: number; // The final amount approved by an admin
  status: 'pending' | 'awaiting_confirmation' | 'approved' | 'declined' | 'expired';
  timerEnd: string; // TIMESTAMP
  adminId?: string;
  createdAt: string; // TIMESTAMP
};

export type CryptoDepositAddress = {
    id: string;
    crypto: CryptoCurrency;
    chain: string;
    address: string;
    qrCodeUrl: string;
}

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
  createdAt: string; // TIMESTAMP
};

export type P2PAd = {
  id: string;
  publicAdId: string;
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
  paymentTimeLimit: number;
  terms: string;
  tags?: string[];
  offerLabel?: string;
  active: boolean;
  deletedAt?: string; // for soft deletes
  createdAt: string; // TIMESTAMP
  targetedCountries?: string[];
  blockedCountries?: string[];
  minCompletedTrades?: number;
  user: {
      username: string;
      country?: string;
      feedbackScore?: number;
      positiveFeedback?: number;
      negativeFeedback?: number;
      completedTrades?: number;
      photoURL?: string;
      badges?: string[];
      lastActive?: string;
  };
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
  escrowFee?: number;
  fiatCurrency: string;
  fiatAmount: number;
  fiatAmountInUSD: number;
  paymentMethod: string;
  price: number; // Price per crypto
  status: TradeStatus;
  cancellationReason?: string;
  claimedByBuyer: boolean;
  paymentReceiptUrl?: string;
  expiresAt: string; // TIMESTAMP
  paidAt?: string; // TIMESTAMP
  releasedAt?: string; // TIMESTAMP
  createdAt: string; // TIMESTAMP;
  buyer: { username: string; country?: string; };
  seller: { username: string; country?: string; };
};

export type EscrowLedger = {
  id: string;
  tradeId: string;
  feeAmount: number;
  crypto: CryptoCurrency;
  createdAt: string; // TIMESTAMP
};

export type CoinTransfer = {
  id: string;
  publicId: string;
  senderId: string;
  recipientId: string;
  senderUsername: string;
  recipientUsername: string;
  crypto: CryptoCurrency;
  amount: number;
  createdAt: string; // TIMESTAMP
};

export type TradeChatMessage = {
  id: string;
  tradeId: string;
  senderId: string;
  senderUsername: string;
  message: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  isModerator: boolean;
  createdAt: string; // TIMESTAMP
};

export type Dispute = {
  id: string;
  tradeId: string;
  openedBy: string;
  reason: string;
  explanation: string;
  status: 'open' | 'resolved' | 'cancelled';
  resolvedBy?: string;
  winnerId?: string;
  resolutionNote?: string;
  createdAt: string; // TIMESTAMP
  // Denormalized for easier querying in admin panel
  trade?: Trade;
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
  message: string;
  status: 'Open' | 'In Progress' | 'Closed';
  createdAt: string;
};

export type Notification = {
    id: string;
    userId: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string; // TIMESTAMP
};

export type Session = {
  id: string;
  userId: string;
  userAgent: string;
  ipAddress: string;
  lastLogin: string; // TIMESTAMP
  isActive: boolean;
};


export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH' | 'LTC';

export type SupportedCrypto = {
  name: CryptoCurrency;
};

export type Language = {
  code: string;
  name: string;
  nativeName: string;
  dialects?: Language[];
};
