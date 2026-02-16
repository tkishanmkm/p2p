
import * as CryptoJS from 'crypto-js';
import { getEnv } from './config';

const { AES_SECRET } = getEnv();

if (!AES_SECRET) {
    throw new Error('CRITICAL: AES_SECRET environment variable not set.');
}

/**
 * Encrypts a string using AES.
 * @param text The string to encrypt.
 * @returns The encrypted string.
 */
export function encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, AES_SECRET).toString();
}

/**
 * Decrypts an AES-encrypted string.
 * @param ciphertext The encrypted string.
 * @returns The original decrypted string.
 */
export function decrypt(ciphertext: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) {
        throw new Error("Decryption failed. The key may be incorrect or the data corrupted.");
    }
    return originalText;
}
