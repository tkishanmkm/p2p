"use client";

import {
  doc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import type { Deposit, UserWallet, Withdrawal } from "./types";

/**
 * Approves a deposit and updates the user's wallet balance in a single transaction.
 */
export async function approveDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "users", deposit.userId, "deposits", deposit.id);
  const userWalletRef = doc(db, "users", deposit.userId, "wallets", deposit.crypto);

  await runTransaction(db, async (transaction) => {
    const walletDoc = await transaction.get(userWalletRef);
    let newBalance = deposit.amount;

    if (walletDoc.exists()) {
      const walletData = walletDoc.data() as UserWallet;
      newBalance += walletData.balance;
      transaction.update(userWalletRef, {
        balance: newBalance,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Wallet doesn't exist, create it.
      const newWallet: UserWallet = {
        id: deposit.crypto,
        userId: deposit.userId,
        crypto: deposit.crypto,
        balance: newBalance,
        lockedBalance: 0,
        updatedAt: new Date().toISOString(), // This will be replaced by server timestamp on write
      };
      transaction.set(userWalletRef, newWallet);
    }

    // Mark the deposit as approved
    transaction.update(depositRef, {
      status: "approved",
      adminId: "admin_placeholder", // Replace with actual admin ID later
    });
  });
}

/**
 * Declines a deposit request.
 */
export async function declineDeposit(
  db: Firestore,
  deposit: Deposit
): Promise<void> {
  const depositRef = doc(db, "users", deposit.userId, "deposits", deposit.id);
  await writeBatch(db)
    .update(depositRef, {
      status: "declined",
      adminId: "admin_placeholder",
    })
    .commit();
}

/**
 * Approves a withdrawal request. This finalizes the withdrawal.
 */
export async function approveWithdrawal(
  db: Firestore,
  withdrawal: Withdrawal,
  adminId: string
): Promise<void> {
  const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
  const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);

  await runTransaction(db, async (transaction) => {
    const withdrawalDoc = await transaction.get(withdrawalRef);
    if (!withdrawalDoc.exists() || withdrawalDoc.data().status !== 'pending') {
      throw new Error("Withdrawal is not pending or does not exist.");
    }
    
    const walletDoc = await transaction.get(userWalletRef);
    if (!walletDoc.exists()) {
      throw new Error("User wallet not found. Critical error.");
    }
    
    const wallet = walletDoc.data() as UserWallet;
    if (wallet.lockedBalance < withdrawal.amount) {
      throw new Error("Insufficient locked balance. Critical error.");
    }

    // Deduct from locked balance
    transaction.update(userWalletRef, {
      lockedBalance: wallet.lockedBalance - withdrawal.amount,
      updatedAt: serverTimestamp(),
    });

    // Mark withdrawal as approved
    transaction.update(withdrawalRef, {
      status: "approved",
      adminId: adminId,
    });
  });
}

/**
 * Declines a withdrawal request and returns funds to the user's available balance.
 */
export async function declineWithdrawal(
  db: Firestore,
  withdrawal: Withdrawal,
  adminId: string
): Promise<void> {
    const withdrawalRef = doc(db, "users", withdrawal.userId, "withdrawals", withdrawal.id);
    const userWalletRef = doc(db, "users", withdrawal.userId, "wallets", withdrawal.crypto);

    await runTransaction(db, async (transaction) => {
        const withdrawalDoc = await transaction.get(withdrawalRef);
        if (!withdrawalDoc.exists() || withdrawalDoc.data().status !== 'pending') {
            throw new Error("Withdrawal is not pending or does not exist.");
        }

        const walletDoc = await transaction.get(userWalletRef);
        if (!walletDoc.exists()) {
            throw new Error("User wallet not found. Critical error.");
        }

        const wallet = walletDoc.data() as UserWallet;
        if (wallet.lockedBalance < withdrawal.amount) {
            throw new Error("Insufficient locked balance to return. Critical error.");
        }

        // Return funds from locked to available balance
        transaction.update(userWalletRef, {
            balance: wallet.balance + withdrawal.amount,
            lockedBalance: wallet.lockedBalance - withdrawal.amount,
            updatedAt: serverTimestamp(),
        });

        // Mark withdrawal as declined
        transaction.update(withdrawalRef, {
            status: "declined",
            adminId: adminId,
        });
    });
}
    