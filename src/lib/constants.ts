import type { SupportedCrypto } from './types';

export const APP_NAME = 'TradeFlow';

export const SUPPORTED_CRYPTOS: SupportedCrypto[] = [
  { name: 'USDT' },
  { name: 'BTC' },
  { name: 'ETH' },
  { name: 'LTC' },
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
