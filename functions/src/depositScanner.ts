
// This file would contain the logic for the deposit scanner.
// Due to the complexity and length, a full implementation is provided conceptually.
// The core logic would be implemented here and called by a scheduled function in index.ts.

import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { ethers } from "ethers";
import { ethProvider, tronWeb } from "./blockchain";
import { ERC20_ABI, ERC20_USDT_CONTRACT, TRC20_USDT_CONTRACT, ETH_CONFIRMATIONS } from "./config";
import { Wallet } from "./types";

const db = admin.firestore();

/**
 * Main function for the scheduled deposit scanner.
 * Iterates through all users with wallets and scans for new deposits.
 */
export async function scanForDeposits() {
    functions.logger.info("Starting deposit scan...");
    const usersSnapshot = await db.collection("users").where("walletIndex", ">=", 0).get();

    if (usersSnapshot.empty) {
        functions.logger.info("No users with wallets to scan.");
        return;
    }

    for (const userDoc of usersSnapshot.docs) {
        try {
            await scanUserWallets(userDoc.id);
        } catch (error) {
            functions.logger.error(`Error scanning wallets for user ${userDoc.id}:`, error);
        }
    }

    functions.logger.info("Deposit scan finished.");
}

/**
 * Scans all wallets for a specific user.
 * @param userId The ID of the user to scan.
 */
async function scanUserWallets(userId: string) {
    const walletsSnapshot = await db.collection("users").doc(userId).collection("wallets").get();
    if (walletsSnapshot.empty) return;

    for (const walletDoc of walletsSnapshot.docs) {
        const walletId = walletDoc.id;
        const walletData = walletDoc.data() as Wallet;

        if (walletId.includes("ERC20")) {
            await scanEVMWallet(userId, walletId, walletData);
        } else if (walletId.includes("TRC20")) {
            // Tron scanning logic would go here
        }
    }
}

/**
 * Scans an EVM-based wallet for native and token deposits.
 * @param userId The user ID.
 * @param walletId The wallet ID (e.g., 'ETH-ERC20').
 * @param walletData The current wallet data from Firestore.
 */
async function scanEVMWallet(userId: string, walletId: string, walletData: Wallet) {
    const latestBlock = await ethProvider.getBlockNumber();
    const fromBlock = walletData.lastProcessedBlock + 1;
    const toBlock = latestBlock - ETH_CONFIRMATIONS;

    if (fromBlock > toBlock) {
        return; // Not enough confirmations yet
    }

    if (walletId === "USDT-ERC20") {
        const contract = new ethers.Contract(ERC20_USDT_CONTRACT, ERC20_ABI, ethProvider);
        const filter = contract.filters.Transfer(null, walletData.depositAddress);
        const events = await contract.queryFilter(filter, fromBlock, toBlock);

        for (const event of events) {
            if (Array.isArray(event.args) && event.args.length === 3) {
                const amount = ethers.formatUnits(event.args[2], 6); // USDT has 6 decimals
                await creditUserBalance(userId, walletId, parseFloat(amount), event.transactionHash);
            }
        }
    }
    // Add similar logic for native ETH balance check

    // Update last processed block
    await db.collection("users").doc(userId).collection("wallets").doc(walletId).update({
        lastProcessedBlock: toBlock,
    });
}


/**
 * Atomically credits a user's wallet and records the transaction hash.
 * @param userId The user ID.
 * @param walletId The wallet ID.
 * @param amount The amount to credit.
 * @param txHash The unique transaction hash.
 */
async function creditUserBalance(userId: string, walletId: string, amount: number, txHash: string) {
    const processedTxRef = db.collection("processedTxs").doc(txHash);
    const walletRef = db.collection("users").doc(userId).collection("wallets").doc(walletId);

    await db.runTransaction(async (transaction) => {
        const txDoc = await transaction.get(processedTxRef);
        if (txDoc.exists) {
            functions.logger.warn(`Transaction ${txHash} already processed. Skipping.`);
            return;
        }

        const walletDoc = await transaction.get(walletRef);
        if (!walletDoc.exists) {
             functions.logger.error(`Wallet ${walletId} for user ${userId} not found during credit.`);
             return;
        }

        const currentBalance = walletDoc.data()?.balance || 0;
        transaction.update(walletRef, { balance: currentBalance + amount });
        transaction.set(processedTxRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    functions.logger.info(`Credited ${amount} to ${walletId} for user ${userId} from tx ${txHash}`);
}
