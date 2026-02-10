import type { User, P2PAd, Trade, TradeChatMessage, SupportTicket, Feedback } from './types';
import { add, sub } from 'date-fns';

const now = new Date();

export const mockUsers: User[] = [
  {
    id: 'user-001',
    userId: 'AliceTrader',
    fullName: 'Alice Wonder',
    country: 'US',
    dob: '1990-01-01',
    isBanned: false,
    isOnHold: false,
    tradeVolume: 250000,
    completedTrades: 152,
    usernameChanged: false,
    createdAt: sub(now, { years: 2 }).toISOString(),
    lastActive: sub(now, { minutes: 5 }).toISOString(),
    feedbackScore: 98,
    positiveFeedback: 150,
    negativeFeedback: 2,
    avgPaymentTime: 5,
    avgReleaseTime: 3,
    photoURL: 'https://images.unsplash.com/photo-1598625873873-52f9aefd7d9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHx3b21hbiUyMHNtaWxpbmd8ZW58MHx8fHwxNzcwMDc4NTE3fDA&ixlib=rb-4.1.0&q=80&w=1080',
    badges: ['power', 'verified'],
    securityAnswer: 'dummy',
    securityQuestion: 'dummy',
  },
  {
    id: 'user-002',
    userId: 'BobBuyer',
    fullName: 'Bob Builder',
    country: 'CA',
    dob: '1985-05-10',
    isBanned: false,
    isOnHold: false,
    tradeVolume: 80000,
    completedTrades: 75,
    usernameChanged: true,
    oldUserId: 'BobTheTrader',
    createdAt: sub(now, { months: 18 }).toISOString(),
    lastActive: sub(now, { hours: 1 }).toISOString(),
    feedbackScore: 99.5,
    positiveFeedback: 74,
    negativeFeedback: 0,
    avgPaymentTime: 8,
    avgReleaseTime: 5,
    photoURL: 'https://images.unsplash.com/photo-1619678309629-23bb8fa744cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxtYW4lMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzcwMTAxNDE4fDA&ixlib=rb-4.1.0&q=80&w=1080',
    badges: ['verified'],
    securityAnswer: 'dummy',
    securityQuestion: 'dummy',
  },
];

const alice = mockUsers[0];
const bob = mockUsers[1];

export const mockP2PAds: P2PAd[] = [
  {
    id: 'ad-001',
    publicAdId: 'AD-SELLBTC1',
    userId: alice.id,
    adType: 'sell',
    crypto: 'BTC',
    fiatCurrency: 'USD',
    paymentMethods: ['Zelle', 'Cash App'],
    rateType: 'market',
    ratePercent: 1.5,
    minAmount: 50,
    maxAmount: 500,
    paymentTimeLimit: 30,
    terms: 'Please pay from an account with your own name. No 3rd party payments. Release will be fast.',
    tags: ['No third party'],
    offerLabel: 'Fast and reliable!',
    active: true,
    createdAt: sub(now, { days: 5 }).toISOString(),
    user: {
      userId: alice.userId,
      country: alice.country,
      feedbackScore: alice.feedbackScore,
      completedTrades: alice.completedTrades,
      photoURL: alice.photoURL,
      badges: alice.badges,
      lastActive: alice.lastActive,
    },
  },
  {
    id: 'ad-002',
    publicAdId: 'AD-BUYETH1',
    userId: bob.id,
    adType: 'buy',
    crypto: 'ETH',
    fiatCurrency: 'CAD',
    paymentMethods: ['Interac e-Transfer'],
    rateType: 'market',
    ratePercent: -0.5,
    minAmount: 100,
    maxAmount: 1000,
    paymentTimeLimit: 60,
    terms: 'Looking for fast Interac transfers. I am online most of the day.',
    active: true,
    createdAt: sub(now, { days: 2 }).toISOString(),
    user: {
      userId: bob.userId,
      country: bob.country,
      feedbackScore: bob.feedbackScore,
      completedTrades: bob.completedTrades,
      photoURL: bob.photoURL,
      badges: bob.badges,
      lastActive: bob.lastActive,
    },
  },
  {
    id: 'ad-003',
    publicAdId: 'AD-SELLUSDT1',
    userId: alice.id,
    adType: 'sell',
    crypto: 'USDT',
    fiatCurrency: 'EUR',
    paymentMethods: ['SEPA Transfer', 'Revolut'],
    rateType: 'fixed',
    fixedRate: 0.95,
    minAmount: 200,
    maxAmount: 2000,
    paymentTimeLimit: 60,
    terms: 'SEPA only. Fast release after confirmation.',
    active: true,
    createdAt: sub(now, { hours: 10 }).toISOString(),
    user: {
      userId: alice.userId,
      country: alice.country,
      feedbackScore: alice.feedbackScore,
      completedTrades: alice.completedTrades,
      photoURL: alice.photoURL,
      badges: alice.badges,
      lastActive: alice.lastActive,
    },
  },
];

export const mockTrade: Trade | null = null;

export const mockTradeChatMessages: TradeChatMessage[] = [];

export const mockSupportTickets: SupportTicket[] = [];

export const mockFeedbacks: Feedback[] = [];
