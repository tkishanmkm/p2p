export interface SupportedCurrency {
  code: string
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "AED" }, { code: "AFN" }, { code: "ALL" }, { code: "AMD" }, { code: "ANG" },
  { code: "AOA" }, { code: "ARS" }, { code: "AUD" }, { code: "AWG" }, { code: "AZN" },

  { code: "BAM" }, { code: "BBD" }, { code: "BDT" }, { code: "BGN" }, { code: "BHD" },
  { code: "BIF" }, { code: "BMD" }, { code: "BND" }, { code: "BOB" }, { code: "BRL" },
  { code: "BSD" }, { code: "BTN" }, { code: "BYN" }, { code: "BZD" },

  { code: "CAD" }, { code: "CDF" }, { code: "CHF" }, { code: "CLP" }, { code: "CNY" },
  { code: "COP" }, { code: "CRC" }, { code: "CUP" }, { code: "CVE" }, { code: "CZK" },

  { code: "DKK" }, { code: "DOP" }, { code: "DZD" },

  { code: "EGP" }, { code: "ERN" }, { code: "ETB" }, { code: "EUR" },

  { code: "FJD" },

  { code: "GBP" }, { code: "GEL" }, { code: "GHS" }, { code: "GIP" }, { code: "GMD" },
  { code: "GNF" }, { code: "GTQ" }, { code: "GYD" },

  { code: "HKD" }, { code: "HNL" }, { code: "HRK" }, { code: "HTG" }, { code: "HUF" },

  { code: "IDR" }, { code: "ILS" }, { code: "INR" }, { code: "IQD" }, { code: "IRR" },
  { code: "ISK" },

  { code: "JMD" }, { code: "JOD" }, { code: "JPY" },

  { code: "KES" }, { code: "KGS" }, { code: "KHR" }, { code: "KMF" }, { code: "KRW" },
  { code: "KWD" }, { code: "KZT" },

  { code: "LAK" }, { code: "LBP" }, { code: "LKR" }, { code: "LRD" }, { code: "LSL" },
  { code: "LYD" },

  { code: "MAD" }, { code: "MDL" }, { code: "MGA" }, { code: "MKD" }, { code: "MMK" },
  { code: "MNT" }, { code: "MOP" }, { code: "MRU" }, { code: "MUR" }, { code: "MVR" },
  { code: "MWK" }, { code: "MXN" }, { code: "MYR" }, { code: "MZN" },

  { code: "NAD" }, { code: "NGN" }, { code: "NIO" }, { code: "NOK" },
  { code: "NPR" }, { code: "NZD" },

  { code: "OMR" },

  { code: "PAB" }, { code: "PEN" }, { code: "PHP" }, { code: "PKR" },
  { code: "PLN" }, { code: "PYG" },

  { code: "QAR" },

  { code: "RON" }, { code: "RSD" }, { code: "RUB" }, { code: "RWF" },

  { code: "SAR" }, { code: "SBD" }, { code: "SCR" }, { code: "SDG" }, { code: "SEK" },
  { code: "SGD" }, { code: "SLL" }, { code: "SOS" }, { code: "SRD" }, { code: "SSP" },
  { code: "STN" }, { code: "SYP" }, { code: "SZL" },

  { code: "THB" }, { code: "TJS" }, { code: "TMT" }, { code: "TND" },
  { code: "TOP" }, { code: "TRY" }, { code: "TTD" }, { code: "TWD" }, { code: "TZS" },

  { code: "UAH" }, { code: "UGX" }, { code: "USD" }, { code: "UYU" }, { code: "UZS" },

  { code: "VES" }, { code: "VND" }, { code: "VUV" },

  { code: "WST" },

  { code: "XAF" }, { code: "XCD" }, { code: "XOF" },

  { code: "YER" },

  { code: "ZAR" }, { code: "ZMW" }, { code: "ZWL" },
] as const

export const currencies = SUPPORTED_CURRENCIES.map(c => c.code);

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"]
