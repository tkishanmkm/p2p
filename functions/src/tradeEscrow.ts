
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { Wallet } from "./types";

const db = admin.firestore();

/**
 * Locks funds for a P2P trade. Moves from 'balance' to 'lockedBalance'.
 * @param userId The seller's user ID.
 * @param walletId The ID of the wallet to lock funds in.
 * @param amount The amount to lock.
 */
export async function lockFundsForTrade(userId: string, walletId: string, amount: number) {
    const walletRef = db.collection("users").doc(userId).collection("wallets").doc(walletId);

    try {
        await db.runTransaction(async (transaction) => {
            const walletDoc = await transaction.get(walletRef);
            if (!walletDoc.exists) {
                throw new Error("Wallet not found.");
            }
            const walletData = walletDoc.data() as Wallet;
            if (walletData.balance < amount) {
                throw new Error("Insufficient balance to start trade.");
            }

            transaction.update(walletRef, {
                balance: walletData.balance - amount,
                lockedBalance: walletData.lockedBalance + amount
            });
        });
        functions.logger.info(`Locked ${amount} in ${walletId} for user ${userId}.`);
    } catch (error: any) {
        functions.logger.error(`Failed to lock funds for user ${userId}:`, error);
        throw new functions.https.HttpsError("failed-precondition", error.message);
    }
}

/**
 * Releases funds from escrow to the buyer's wallet. (Internal ledger update)
 * @param sellerId The seller's user ID.
 * @param buyerId The buyer's user ID.
 * @param walletId The wallet ID for the transaction.
 * @param amount The amount to transfer.
 */
export async function releaseFundsFromEscrow(sellerId: string, buyerId: string, walletId: string, amount: number) {
    const sellerWalletRef = db.collection("users").doc(sellerId).collection("wallets").doc(walletId);
    const buyerWalletRef = db.collection("users").doc(buyerId).collection("wallets").doc(walletId);

     try {
        await db.runTransaction(async (transaction) => {
            const sellerWalletDoc = await transaction.get(sellerWalletRef);
            const buyerWalletDoc = await transaction.get(buyerWalletRef);

            if (!sellerWalletDoc.exists()) throw new Error("Seller wallet not found.");

            const sellerWallet = sellerWalletDoc.data() as Wallet;
            if(sellerWallet.lockedBalance < amount) throw new Error("Insufficient locked funds.");

            // Deduct from seller's locked balance
            transaction.update(sellerWalletRef, { lockedBalance: sellerWallet.lockedBalance - amount });

            // Add to buyer's available balance
            const buyerBalance = buyerWalletDoc.exists() ? (buyerWalletDoc.data()?.balance || 0) : 0;
            transaction.set(buyerWalletRef, { balance: buyerBalance + amount }, { merge: true });
        });
         functions.logger.info(`Released ${amount} from ${sellerId} to ${buyerId} in wallet ${walletId}.`);
    } catch (error: any) {
        functions.logger.error(`Failed to release funds from escrow:`, error);
        throw new functions.https.HttpsError("internal", error.message);
    }
}
