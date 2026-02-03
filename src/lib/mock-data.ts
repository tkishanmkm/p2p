import type { User, P2PAd, Trade, TradeChatMessage, SupportTicket, Feedback } from './types';
import { add, sub } from 'date-fns';

const now = new Date();

export const mockUsers: User[] = [];

export const mockP2PAds: P2PAd[] = [];

export const mockTrade: Trade | null = null;

export const mockTradeChatMessages: TradeChatMessage[] = [];

export const mockSupportTickets: SupportTicket[] = [];

export const mockFeedbacks: Feedback[] = [];
