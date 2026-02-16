
import { NextResponse } from 'next/server';
import { getEstimatedFee, setupUserWallets } from '@/lib/wallet-server';
import type { CryptoCurrency } from '@/lib/types';

export async function POST(req: Request) {
  const body = await req.json();

  if (body.setup && body.userId) {
    try {
      await setupUserWallets(body.userId);
      return NextResponse.json({ success: true, message: "Wallets configured successfully." });
    } catch (err: any) {
      console.error('Wallet setup API error:', err);
      return NextResponse.json({ error: err.message || 'An internal error occurred during wallet setup.' }, { status: 500 });
    }
  }

  const { crypto, chain } = body;

  if (!crypto || !chain) {
    return NextResponse.json({ error: 'Missing parameters: crypto and chain are required.' }, { status: 400 });
  }

  try {
    const fees = await getEstimatedFee(crypto as CryptoCurrency, chain);
    return NextResponse.json(fees);
  } catch (err: any) {
    console.error('Fee estimation API error:', err);
    return NextResponse.json({ error: err.message || 'An internal error occurred while estimating fees.' }, { status: 500 });
  }
}
