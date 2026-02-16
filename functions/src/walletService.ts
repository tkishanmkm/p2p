
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { getEVMAddress, getTRONAddress } from "./blockchain";

const db = admin.firestore();

/**
 * Creates a full suite of wallets for a new user. Triggered by `onUserCreate`.
 * @param user The Firebase Auth user record.
 */
export async function createUserWallets(user: admin.auth.UserRecord): Promise<void> {
  const userId = user.uid;
  const userRef = db.collection("users").doc(userId);
  const counterRef = db.collection("system").doc("walletCounter");

  try {
    // Atomically get and increment the wallet index counter
    const index = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const current = counterDoc.exists ? (counterDoc.data()?.value || 0) : 0;
      transaction.set(counterRef, { value: current + 1 }, { merge: true });
      return current;
    });

    // Save the assigned index to the user's document
    await userRef.set({ walletIndex: index }, { merge: true });

    const walletsRef = userRef.collection("wallets");
    const batch = db.batch();

    const evmAddress = getEVMAddress(index);
    const tronAddress = getTRONAddress(index);

    const initialBlockMainnet = await admin.firestore().runTransaction(async () => {
        const block = await (await import('./blockchain')).ethProvider.getBlockNumber();
        return block;
    });

    // Define all wallets to be created
    const walletConfigs = [
      { id: "ETH-ERC20", address: evmAddress, lastBlock: initialBlockMainnet },
      { id: "USDT-ERC20", address: evmAddress, lastBlock: initialBlockMainnet },
      // { id: "TRX-TRC20", address: tronAddress, lastBlock: 0 }, // Removed as per request
      { id: "USDT-TRC20", address: tronAddress, lastBlock: 0 },
    ];

    // Batch write wallet documents
    for (const config of walletConfigs) {
      const docRef = walletsRef.doc(config.id);
      batch.set(docRef, {
        depositAddress: config.address,
        balance: 0,
        lockedBalance: 0,
        lastProcessedBlock: config.lastBlock,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    functions.logger.info(`Successfully created wallets for user ${userId} with index ${index}.`);
  } catch (error) {
    functions.logger.error(`Failed to create wallets for user ${userId}:`, error);
  }
}
