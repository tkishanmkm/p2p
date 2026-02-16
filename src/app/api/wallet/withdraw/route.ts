import { NextResponse } from 'next/server';
import { authAdmin } from '@/lib/firebase-admin';
import { withdraw } from '@/lib/wallet-server';
import type { CryptoCurrency } from '@/lib/types';

export async function POST(req: Request) {
  const { idToken, crypto, chain, amount, address } = await req.json();

  if (!idToken || !crypto || !chain || !amount || !address) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    if (!userId) {
         return NextResponse.json({ error: 'Authentication failed.' }, { status: 401 });
    }

    const txHash = await withdraw(userId, crypto as CryptoCurrency, chain, amount, address);

    return NextResponse.json({ success: true, txHash });
  } catch (err: any) {
    console.error('Withdrawal API error:', err);
    return NextResponse.json({ error: err.message || 'An internal error occurred.' }, { status: 500 });
  }
}
