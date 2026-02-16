
import { NextResponse } from 'next/server';
import { getEstimatedFee } from '@/lib/wallet-server';
import type { CryptoCurrency } from '@/lib/types';

export async function POST(req: Request) {
  const { crypto, chain } = await req.json();

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
