
'use client';
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "../icons";
import { P2PAd, Trade, User, CryptoCurrency } from "@/lib/types";
import { formatDistanceToNowStrict } from 'date-fns';
import { toDate } from "@/lib/utils";

interface TradeHeaderProps {
  trade: Trade;
  ad: P2PAd | null | undefined;
  opponent: User | null | undefined;
  currentUserRole: 'buy' | 'sell';
}

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

export function TradeHeader({ trade, ad, opponent, currentUserRole }: TradeHeaderProps) {
  const isBuying = currentUserRole === 'buy';
  const expiresDate = toDate(trade.expiresAt);
  const timeRemaining = expiresDate ? formatDistanceToNowStrict(expiresDate) : '';

  const renderStatusLine = () => {
    switch (trade.status) {
      case 'active':
        return isBuying
          ? `You must pay ${opponent?.userId || 'the seller'} within ${timeRemaining}.`
          : `Waiting for ${opponent?.userId || 'the buyer'} to pay.`;
      case 'paid':
        return isBuying
          ? 'You have marked the trade as paid. Waiting for seller to confirm.'
          : `Buyer has paid. Please confirm receipt and release crypto.`;
      case 'released':
        return 'Trade complete. Funds have been released to the buyer.';
      default:
        return `This trade is now ${trade.status}.`;
    }
  };

  return (
    <div className="bg-primary/10 text-primary p-4 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <CryptoLogo crypto={trade.crypto} className="h-6 w-6" />
        <p className="font-bold text-lg">
          {isBuying ? 'You are buying' : 'You are selling'} {trade.amount} {trade.crypto} for {trade.fiatAmount.toLocaleString()} {trade.fiatCurrency}
        </p>
      </div>
      <p className="text-sm text-primary/80">{renderStatusLine()}</p>
    </div>
  );
}
