import type { SupportedCrypto } from './types';

export const APP_NAME = 'TradeFlow';

export const SUPPORTED_CRYPTOS: SupportedCrypto[] = [
  { name: 'USDT', icon: 'usdt' },
  { name: 'BTC', icon: 'btc' },
  { name: 'ETH', icon: 'eth' },
  { name: 'LTC', icon: 'ltc' },
];

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
  { code: 'hi', name: 'Hindi' },
];

// In a real app, these would be in environment variables
export const ADMIN_ID = 'NARAYANHARIHARI';
export const ADMIN_PASS = 'XFT7ukm@5498';
