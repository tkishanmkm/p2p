
import { NextResponse } from 'next/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import { getEVMAddress, getTRONAddress } from '@/lib/blockchain-server';
import { CHAINS, SUPPORTED_CRYPTOS } from '@/lib/constants';
import type { User } from '@/lib/types';

export async function POST(req: Request) {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const idToken = authorization.split('Bearer ')[1];

  try {
    const decodedToken = await authAdmin.verifyIdToken(idToken);
    const adminDoc = await firestoreAdmin.collection('admins').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
        return NextResponse.json({ error: 'Forbidden: User is not an admin.' }, { status: 403 });
    }
    
    // --- Backfill Logic ---
    const usersSnapshot = await firestoreAdmin.collection('users').get();
    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    let walletsCreated = 0;

    for (const user of allUsers) {
      if (user.isAdminAccount || typeof user.walletIndex !== 'number') continue;

      const batch = firestoreAdmin.batch();
      let batchHasWrites = false;

      const evmAddress = getEVMAddress(user.walletIndex);
      const tronAddress = getTRONAddress(user.walletIndex);

      for (const crypto of SUPPORTED_CRYPTOS) {
        for (const chain of CHAINS[crypto.name]) {
          const walletId = `${crypto.name}-${chain}`;
          const walletRef = firestoreAdmin.collection('users').doc(user.id).collection('wallets').doc(walletId);
          
          const walletDoc = await walletRef.get();

          if (!walletDoc.exists()) {
            let address = '';
            if (['ERC20', 'BEP20', 'Polygon', 'Arbitrum', 'Base'].includes(chain) || ['ETH', 'BNB', 'MATIC'].includes(crypto.name)) {
                address = evmAddress;
            } else if (chain === 'TRC20' || crypto.name === 'TRX') {
                address = tronAddress;
            } else if (chain === 'Bitcoin' || crypto.name === 'BTC') {
                // Add your BTC address derivation logic here if implemented
                address = 'bc1...placeholder'; // Placeholder
            } else if (chain === 'Litecoin' || crypto.name === 'LTC') {
                // Add your LTC address derivation logic here if implemented
                address = 'ltc1...placeholder'; // Placeholder
            }
            
            if (address) {
                batch.set(walletRef, {
                  id: walletId,
                  userId: user.id,
                  crypto: crypto.name,
                  chain: chain,
                  balance: 0,
                  lockedBalance: 0,
                  depositAddress: address,
                  updatedAt: new Date().toISOString(),
                });
                batchHasWrites = true;
                walletsCreated++;
            }
          }
        }
      }
      if (batchHasWrites) {
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true, message: `Backfill complete. Created ${walletsCreated} new wallets across ${allUsers.length} users.` });

  } catch (err: any) {
    console.error('Admin backfill API error:', err);
    return NextResponse.json({ error: err.message || 'An internal error occurred.' }, { status: 500 });
  }
}
