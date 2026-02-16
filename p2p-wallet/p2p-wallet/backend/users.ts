import { firestore } from './firebase-admin';
import { getEVMAddress, getTRONAddress } from './blockchain';

export async function createUserWallets(userId: string) {

  // Step 1: Assign unique index
  const counterRef = firestore.collection("system").doc("walletCounter");

  const index = await firestore.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const current = doc.exists ? (doc.data()!.value || 0) : 0;
    tx.set(counterRef, { value: current + 1 });
    return current;
  });

  // Save index to user
  await firestore.collection("users").doc(userId).update({
    walletIndex: index
  });

  const walletsRef = firestore
    .collection("users")
    .doc(userId)
    .collection("wallets");

  const evmAddress = getEVMAddress(index);
  const tronAddress = getTRONAddress(index);

  const walletsToCreate = [
    { coin: 'ETH', chain: 'ERC20', address: evmAddress },
    { coin: 'BNB', chain: 'BEP20', address: evmAddress },
    { coin: 'MATIC', chain: 'Polygon', address: evmAddress },
    { coin: 'USDT', chain: 'ERC20', address: evmAddress },
    { coin: 'USDT', chain: 'BEP20', address: evmAddress },
    { coin: 'USDT', chain: 'Polygon', address: evmAddress },
    { coin: 'USDT', chain: 'Arbitrum', address: evmAddress },
    { coin: 'USDT', chain: 'Base', address: evmAddress },
    { coin: 'TRX', chain: 'TRC20', address: tronAddress },
    { coin: 'USDT', chain: 'TRC20', address: tronAddress },
    // BTC/LTC are optional and need different logic
    // { coin: 'BTC', chain: 'Bitcoin', address: '...'},
    // { coin: 'LTC', chain: 'Litecoin', address: '...'}
  ];

  const batch = firestore.batch();
  for (const wallet of walletsToCreate) {
      const walletId = `${wallet.coin}-${wallet.chain}`;
      const docRef = walletsRef.doc(walletId);
      batch.set(docRef, {
          id: walletId,
          userId,
          crypto: wallet.coin,
          chain: wallet.chain,
          depositAddress: wallet.address,
          balance: 0,
          lockedBalance: 0,
          updatedAt: new Date().toISOString()
      });
  }

  await batch.commit();
  console.log(`Wallets created for user ${userId} with index ${index}`);
}
