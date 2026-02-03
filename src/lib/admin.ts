"use client";

import {
  doc,
  runTransaction,
  writeBatch,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";
import type { Deposit, UserWallet, CryptoCurrency } from "./types";

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
        updatedAt: new Date().toISOString(), // This will be replaced by serverTimestamp on write
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
    