
// This file would contain the logic for the withdrawal function.
// A full implementation is complex; this is a conceptual outline.

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { ethers } from "ethers";
import { getEVMPrivateKey } from "./blockchain";
import { Wallet } from "./types";

const db = admin.firestore();

interface WithdrawalRequest {
    crypto: "ETH" | "USDT";
    chain: "ERC20";
    amount: number;
    toAddress: string;
}

/**
 * HTTPS Callable function to initiate a user withdrawal.
 */
export const initiateWithdrawal = functions.https.onCall(async (data: WithdrawalRequest, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { crypto, chain, amount, toAddress } = data;
    const userId = context.auth.uid;
    const walletId = `${crypto}-${chain}`;
    const userWalletRef = db.collection("users").doc(userId).collection("wallets").doc(walletId);
    const userRef = db.collection("users").doc(userId);

    // Basic validation
    if (amount <= 0) {
        throw new functions.https.HttpsError("invalid-argument", "Withdrawal amount must be positive.");
    }

    try {
        const txHash = await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const walletDoc = await transaction.get(userWalletRef);

            if (!userDoc.exists() || !walletDoc.exists()) {
                throw new functions.https.HttpsError("not-found", "User or wallet not found.");
            }

            const walletData = walletDoc.data() as Wallet;
            const userData = userDoc.data();
            const walletIndex = userData?.walletIndex;

            if (typeof walletIndex !== "number") {
                 throw new functions.https.HttpsError("internal", "User wallet index is not configured.");
            }

            if (walletData.balance < amount) {
                throw new functions.https.HttpsError("failed-precondition", "Insufficient balance.");
            }

            // Move funds to lockedBalance to prevent double-spending during processing
            transaction.update(userWalletRef, {
                balance: walletData.balance - amount,
                lockedBalance: walletData.lockedBalance + amount
            });
            
            // --- On-Chain Logic ---
            const privateKey = getEVMPrivateKey(walletIndex);
            const signer = new ethers.Wallet(privateKey, (await import('./blockchain')).ethProvider);
            
            let onChainTx;
            if(crypto === 'ETH') {
                 onChainTx = await signer.sendTransaction({
                    to: toAddress,
                    value: ethers.parseEther(amount.toString())
                });
            } else if (crypto === 'USDT' && chain === 'ERC20') {
                 const contract = new ethers.Contract((await import('./config')).ERC20_USDT_CONTRACT, (await import('./config')).ERC20_ABI, signer);
                 const decimals = 6;
                 onChainTx = await contract.transfer(toAddress, ethers.parseUnits(amount.toString(), decimals));
            } else {
                throw new functions.https.HttpsError("invalid-argument", "Unsupported crypto/chain combination.");
            }

            await onChainTx.wait(); // Wait for transaction to be mined
            
            // On success, create withdrawal record and deduct from locked balance
            const withdrawalRef = db.collection("users").doc(userId).collection("withdrawals").doc();
            transaction.set(withdrawalRef, {
                status: 'completed',
                txHash: onChainTx.hash,
                amount,
                crypto,
                chain,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            transaction.update(userWalletRef, {
                 lockedBalance: walletData.lockedBalance // Funds are now gone
            });

            return onChainTx.hash;
        });

        return { success: true, txHash };

    } catch (error: any) {
        functions.logger.error(`Withdrawal failed for user ${userId}:`, error);
        // Optionally, logic to revert the lockedBalance could be added here if the on-chain part fails.
        throw new functions.https.HttpsError("internal", error.message || "An internal error occurred during withdrawal.");
    }
});
