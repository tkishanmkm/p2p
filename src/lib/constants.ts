
import type { CryptoCurrency, SupportedCrypto } from './types';

export const APP_NAME = 'TradeFlow';

export const SUPPORTED_CRYPTOS: SupportedCrypto[] = [
  { name: 'USDT' },
  { name: 'BTC' },
  { name: 'ETH' },
  { name: 'LTC' },
];

export const CHAINS: Record<CryptoCurrency, string[]> = {
  BTC: ['BTC'],
  LTC: ['LTC'],
  ETH: ['ETH'],
  USDT: ['ERC20', 'TRC20', 'BEP20'],
};


export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: 'Simplified Chinese' },
  { code: 'zh-TW', name: 'Traditional Chinese' },
  { code: 'pt-BR', name: 'Brazilian Portuguese' },
  { code: 'ko', name: 'Korean' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'ru', name: 'Russian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'ar', name: 'Arabic' },
];

// In a real app, these would be in environment variables
export const ADMIN_ID = 'Narayanharihari';
export const ADMIN_PASS = 'XGY6ukm@5498';

export const SECURITY_QUESTIONS = [
    "What was your first pet's name?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "In what city were you born?",
    "What is your favorite book?",
];

