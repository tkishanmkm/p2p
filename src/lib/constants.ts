
import type { CryptoCurrency, SupportedCrypto, Language } from './types';

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


export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Simplified Chinese', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文' },
  { code: 'pt-BR', name: 'Brazilian Portuguese', nativeName: 'Português brasileiro' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    dialects: [
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'en-IN', name: 'Hinglish', nativeName: 'Hinglish' },
        { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी' },
    ]
  },
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

export const BLOCK_LIMIT = 10000;

export const AD_TAGS = [
  "No third party",
  "No receipt required",
  "No verification",
  "Invoice accepted",
];
