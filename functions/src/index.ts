
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { createUserWallets } from "./walletService";
import { scanForDeposits } from "./depositScanner";
import { initiateWithdrawal as initiateWithdrawalService } from "./withdrawalService";

// Initialize Firebase Admin SDK
admin.initializeApp();

// --- Auth Triggers ---

/**
 * Triggered when a new user signs up. Creates their initial set of wallets.
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
    functions.logger.info(`New user registered: ${user.uid}. Creating wallets.`);
    await createUserWallets(user.uid);
});


// --- Scheduled Functions ---

/**
 * Scheduled function that runs every 1 minute to scan for new deposits.
 * Requires Blaze plan.
 */
export const scheduledDepositScanner = functions.pubsub
    .schedule("every 1 minutes")
    .onRun(async (context) => {
        functions.logger.info("Starting scheduled deposit scan...");
        try {
            await scanForDeposits();
        } catch (error) {
            functions.logger.error("Error in scheduledDepositScanner:", error);
        }
        return null;
    });


// --- HTTPS Callable Functions ---

/**
 * Callable function for a user to initiate a withdrawal request.
 */
export const initiateWithdrawal = initiateWithdrawalService;
