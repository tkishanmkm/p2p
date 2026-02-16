import { firestore } from 'firebase-admin';
import { ethWallet, ethProvider, tron, getETHDepositAddress, getTRXDepositAddress, getBTCDepositAddress, getLTCDepositAddress, defaultGasMultiplier, networks } from './blockchain';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as bip32 from 'bip32';
import bip39 from 'bip39';

// ------------------ Types ------------------
interface UserWallet {
  userId: string;
  crypto: string;
  balance: number;
  lockedBalance: number;
}

interface P2PWallet {
  balance: number; // service fees collected
}

const p2pWallet: P2PWallet = { balance: 0 };

// ------------------ Deposit Logic ------------------
export async function depositToUser(userWalletRef: firestore.DocumentReference, amount: number) {
  const walletSnap = await userWalletRef.get();
  const walletData = walletSnap.data() as UserWallet;
  const newBalance = (walletData?.balance || 0) + amount;
  await userWalletRef.update({ balance: newBalance });
  return newBalance;
}

// ------------------ Withdrawal Logic ------------------
export async function withdrawETH(userWalletRef: firestore.DocumentReference, to: string, amount: number) {
  const walletSnap = await userWalletRef.get();
  const walletData = walletSnap.data() as UserWallet;

  // Estimate gas fee
  const gasPrice = await ethProvider.getGasPrice();
  const gasFee = parseFloat(ethers.formatEther(gasPrice * 21000));
  const serviceFee = gasFee; // as per your spec

  // Total deduction from user wallet
  const totalDeduct = amount + gasFee + serviceFee;

  if ((walletData.balance || 0) < totalDeduct) throw new Error('Insufficient balance');

  // Deduct balance
  await userWalletRef.update({ balance: walletData.balance - totalDeduct });

  // Add service fee to P2P wallet
  p2pWallet.balance += serviceFee;

  // Send ETH (amount + gas handled by multiplier)
  const tx = await ethWallet.sendTransaction({
    to,
    value: ethers.parseEther(amount.toString()),
    gasPrice: gasPrice * defaultGasMultiplier
  });

  console.log('ETH withdrawal tx:', tx.hash);
  return tx.hash;
}

export async function withdrawTRX(userWalletRef: firestore.DocumentReference, to: string, amount: number, tokenContract?: string) {
  const walletSnap = await userWalletRef.get();
  const walletData = walletSnap.data() as UserWallet;

  // Fee limit for TRC20
  const feeLimit = 100_000_000;
  const totalDeduct = amount + feeLimit * 2; // gas + service fee

  if ((walletData.balance || 0) < totalDeduct) throw new Error('Insufficient balance');

  // Deduct user wallet
  await userWalletRef.update({ balance: walletData.balance - totalDeduct });

  // Add service fee to P2P
  p2pWallet.balance += feeLimit;

  if (tokenContract) {
    const contract = await tron.contract().at(tokenContract);
    const tx = await contract.transfer(to, amount).send({ feeLimit: feeLimit * defaultGasMultiplier });
    console.log('TRC20 withdrawal tx:', tx);
    return tx;
  } else {
    // TRX transfer
    const tx = await tron.trx.sendTransaction(to, amount);
    console.log('TRX withdrawal tx:', tx);
    return tx;
  }
}

// ------------------ BTC / LTC Withdrawals (simulation) ------------------
export async function withdrawBTC(userWalletRef: firestore.DocumentReference, to: string, amount: number) {
  const walletSnap = await userWalletRef.get();
  const walletData = walletSnap.data() as UserWallet;

  // Simulate BTC fee (for example 0.0001 BTC)
  const gasFee = 0.0001;
  const serviceFee = gasFee;

  const totalDeduct = amount + gasFee + serviceFee;
  if ((walletData.balance || 0) < totalDeduct) throw new Error('Insufficient balance');

  await userWalletRef.update({ balance: walletData.balance - totalDeduct });
  p2pWallet.balance += serviceFee;

  // TODO: Implement real BTC transaction using bitcoinjs-lib + node RPC
  console.log(`BTC withdrawal simulated: ${amount} BTC to ${to}`);
  return { txid: 'simulated-btc-txid' };
}

export async function withdrawLTC(userWalletRef: firestore.DocumentReference, to: string, amount: number) {
  const walletSnap = await userWalletRef.get();
  const walletData = walletSnap.data() as UserWallet;

  const gasFee = 0.001; // LTC example fee
  const serviceFee = gasFee;

  const totalDeduct = amount + gasFee + serviceFee;
  if ((walletData.balance || 0) < totalDeduct) throw new Error('Insufficient balance');

  await userWalletRef.update({ balance: walletData.balance - totalDeduct });
  p2pWallet.balance += serviceFee;

  console.log(`LTC withdrawal simulated: ${amount} LTC to ${to}`);
  return { txid: 'simulated-ltc-txid' };
}

// ------------------ Generate Deposit Addresses ------------------
export function getDepositAddress(userIndex: number, crypto: string) {
  switch (crypto) {
    case networks.ETH: return getETHDepositAddress(userIndex);
    case networks.TRX: return getTRXDepositAddress(userIndex);
    case networks.BTC: return getBTCDepositAddress(userIndex);
    case networks.LTC: return getLTCDepositAddress(userIndex);
    default: throw new Error('Unsupported crypto');
  }import { firestore } from 'firebase-admin';
  import { ethWallet, ethProvider, tron, getDepositAddress, networks } from './blockchain';
  import { ethers } from 'ethers';
  
  // ---------------- Types ----------------
  interface UserWallet {
    balance: number;
    lockedBalance: number;
    crypto: string;
  }
  
  // ---------------- Firestore References ----------------
  function getUserWalletRef(userId: string, crypto: string) {
    return firestore().collection('users').doc(userId).collection('wallets').doc(crypto);
  }
  
  function getP2PWalletRef(crypto: string) {
    return firestore().collection('admin_wallets').doc(crypto);
  }
  
  // ---------------- Gas + Service Fee ----------------
  const GAS_MULTIPLIER = Number(process.env.GAS_MULTIPLIER) || 2;
  
  // ---------------- Withdraw ETH / ERC20 ----------------
  export async function withdrawETH(userId: string, amount: number, toAddress: string) {
    const userWalletRef = getUserWalletRef(userId, 'ETH');
    const userWalletSnap = await userWalletRef.get();
    if (!userWalletSnap.exists) throw new Error('User wallet not found');
    const userWallet = userWalletSnap.data() as UserWallet;
  
    // Estimate gas
    const gasPrice = await ethProvider.getGasPrice();
    const gasFee = parseFloat(ethers.formatEther(gasPrice * 21000)); // ETH gas estimate
    const serviceFee = gasFee; // service fee = gas
  
    const totalDeduct = amount + gasFee + serviceFee;
  
    if (userWallet.balance < totalDeduct) throw new Error('Insufficient balance');
  
    // Deduct from user wallet
    await userWalletRef.update({ balance: userWallet.balance - totalDeduct });
  
    // Add service fee to P2P account (internal)
    const p2pWalletRef = getP2PWalletRef('ETH');
    const p2pSnap = await p2pWalletRef.get();
    const p2pWallet = p2pSnap.exists ? p2pSnap.data() as UserWallet : { balance: 0 };
    await p2pWalletRef.set({ balance: (p2pWallet.balance || 0) + serviceFee }, { merge: true });
  
    // Send actual withdrawal on-chain (user amount + gas only)
    const tx = await ethWallet.sendTransaction({
      to: toAddress,
      value: ethers.parseEther(amount.toString()),
      gasPrice: gasPrice * 2
    });
  
    console.log('ETH Withdrawal Tx:', tx.hash);
    return tx.hash;
  }
  
  // ---------------- Withdraw TRC20 ----------------
  export async function withdrawTRC20(userId: string, amount: number, toAddress: string, tokenContract: string) {
    const userWalletRef = getUserWalletRef(userId, 'USDT');
    const userWalletSnap = await userWalletRef.get();
    if (!userWalletSnap.exists) throw new Error('User wallet not found');
    const userWallet = userWalletSnap.data() as UserWallet;
  
    const contract = await tron.contract().at(tokenContract);
    const feeLimit = 100_000_000; // energy/gas
    const serviceFee = feeLimit;
  
    const totalDeduct = amount + feeLimit + serviceFee;
    if (userWallet.balance < totalDeduct) throw new Error('Insufficient balance');
  
    // Deduct from user wallet
    await userWalletRef.update({ balance: userWallet.balance - totalDeduct });
  
    // Add service fee to P2P account
    const p2pWalletRef = getP2PWalletRef('USDT');
    const p2pSnap = await p2pWalletRef.get();
    const p2pWallet = p2pSnap.exists ? p2pSnap.data() as UserWallet : { balance: 0 };
    await p2pWalletRef.set({ balance: (p2pWallet.balance || 0) + serviceFee }, { merge: true });
  
    // Send on-chain
    const tx = await contract.transfer(toAddress, amount).send({ feeLimit: feeLimit * GAS_MULTIPLIER });
    console.log('TRC20 Withdrawal Tx:', tx);
    return tx;
  }
  
  // ---------------- Withdraw BTC / LTC (Simulation) ----------------
  export async function withdrawBTC(userId: string, amount: number, toAddress: string) {
    console.log(`BTC withdrawal simulated: ${amount} to ${toAddress}`);
    // TODO: integrate bitcoinjs-lib / full node to send BTC
  }
  
  export async function withdrawLTC(userId: string, amount: number, toAddress: string) {
    console.log(`LTC withdrawal simulated: ${amount} to ${toAddress}`);
    // TODO: integrate litecoin-lib / full node to send LTC
  }
}