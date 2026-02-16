
import { firestoreAdmin } from '@/lib/firebase-admin';
import { getEvmWallet, tron, estimateGasFeeNative, getEVMAddress, getTRONAddress } from '@/lib/blockchain-server';
import { ethers } from 'ethers';
import type { CryptoCurrency, User, UserWallet } from '@/lib/types';
import { SUPPORTED_CRYPTOS } from './constants';

const erc20ABI = ["function transfer(address to, uint amount) returns (bool)"];
const getGasMultiplier = () => Number(process.env.GAS_MULTIPLIER) || 2;

async function getPriceInUsd(symbol: 'ETH' | 'BNB' | 'TRX' | 'BTC' | 'LTC' | 'MATIC' | CryptoCurrency): Promise<number> {
    if (symbol === 'USDT') return 1.0;

    const coingeckoIds: Record<string, string> = {
        ETH: 'ethereum',
        BNB: 'binancecoin',
        TRX: 'tron',
        BTC: 'bitcoin',
        LTC: 'litecoin',
        MATIC: 'matic-network',
    };
    const id = coingeckoIds[symbol];
    if (!id) throw new Error(`Unsupported symbol for price lookup: ${symbol}`);
    
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
    if (!res.ok) throw new Error(`Failed to fetch price for ${symbol}`);
    const data = await res.json();
    return data[id]?.usd || 0;
}

export async function getEstimatedFee(crypto: CryptoCurrency, chain: string): Promise<{ gasFee: number; serviceFee: number; totalFee: number }> {
    const { fee: nativeFeeAmount, nativeSymbol } = await estimateGasFeeNative(chain);

    if (crypto === nativeSymbol) {
        const gasFee = nativeFeeAmount;
        const serviceFee = gasFee; // Fee is equal to gas
        return { gasFee, serviceFee, totalFee: gasFee + serviceFee };
    }

    // Convert fee to the withdrawal currency's value
    const nativeTokenPriceUsd = await getPriceInUsd(nativeSymbol);
    const withdrawalTokenPriceUsd = await getPriceInUsd(crypto);

    if (withdrawalTokenPriceUsd === 0) {
        throw new Error(`Could not determine price for ${crypto} to calculate fee.`);
    }

    const feeInUsd = nativeFeeAmount * nativeTokenPriceUsd;
    const gasFeeInWithdrawalCrypto = feeInUsd / withdrawalTokenPriceUsd;
    const serviceFee = gasFeeInWithdrawalCrypto;

    return { gasFee: gasFeeInWithdrawalCrypto, serviceFee, totalFee: gasFeeInWithdrawalCrypto * 2 };
}


async function executeOnChainWithdrawal(crypto: CryptoCurrency, chain: string, amount: number, toAddress: string): Promise<string> {
  const contracts = await getContractAddresses(crypto);
  const contractAddress = contracts?.[chain];

  switch (chain) {
    case 'ERC20':
    case 'BEP20':
    case 'Polygon':
    case 'Arbitrum':
    case 'Base': {
      if (!contractAddress) throw new Error(`${crypto} contract address for ${chain} not configured.`);
      const wallet = await getEvmWallet(chain);
      const contract = new ethers.Contract(contractAddress, erc20ABI, wallet);
      const decimals = crypto === 'USDT' ? 6 : 18;
      const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
      const feeData = await wallet.provider?.getFeeData();
      const gasPrice = feeData?.gasPrice || ethers.parseUnits('5', 'gwei');
      const tx = await contract.transfer(toAddress, parsedAmount, { gasPrice: gasPrice * BigInt(getGasMultiplier()) });
      return tx.hash;
    }
    case 'TRC20': {
      if (!contractAddress) throw new Error(`${crypto} contract address for TRC20 not configured.`);
      const decimals = 6; // USDT on TRON
      const parsedAmount = amount * Math.pow(10, decimals);
      const contract = await tron.contract().at(contractAddress);
      const txId = await contract.transfer(toAddress, parsedAmount).send({ feeLimit: 150_000_000, shouldPollResponse: false });
      return txId;
    }
    case 'Bitcoin':
    case 'Litecoin': {
      // Placeholder for native BTC/LTC transfer logic
      console.log(`Simulating ${chain} withdrawal of ${amount} ${crypto} to ${toAddress}`);
      return `simulated-${crypto.toLowerCase()}-txid-${Date.now()}`;
    }
    case 'Native_ETH': {
      const wallet = await getEvmWallet('ERC20');
      const feeData = await wallet.provider?.getFeeData();
      const gasPrice = feeData?.gasPrice || ethers.parseUnits('5', 'gwei');
      const tx = await wallet.sendTransaction({ to: toAddress, value: ethers.parseEther(amount.toString()), gasPrice: gasPrice * BigInt(getGasMultiplier()) });
      return tx.hash;
    }
    default:
      throw new Error(`On-chain execution for ${crypto} on ${chain} is not supported.`);
  }
}

async function getContractAddresses(crypto: CryptoCurrency) {
    if (crypto !== 'USDT') return {};
    const docRef = firestoreAdmin.collection('_config').doc('contracts');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        console.warn('Contract addresses configuration document (_config/contracts) not found.');
        return {};
    };
    return docSnap.data()?.[crypto] || {};
}


export async function withdraw(userId: string, crypto: CryptoCurrency, chain: string, amount: number, address: string) {
    const { totalFee } = await getEstimatedFee(crypto, chain);
    const totalDeduction = amount + totalFee;
    const walletId = `${crypto}-${chain}`;
    const userWalletRef = firestoreAdmin.collection('users').doc(userId).collection('wallets').doc(walletId);
    
    const userWalletSnap = await userWalletRef.get();
    if (!userWalletSnap.exists) throw new Error('User wallet not found for this crypto/chain combination.');
    
    const userWallet = userWalletSnap.data() as UserWallet;
    if ((userWallet.balance || 0) < totalDeduction) {
        throw new Error(`Insufficient balance. Required: ${totalDeduction.toFixed(8)} ${crypto}, but only ${userWallet.balance.toFixed(8)} ${crypto} is available.`);
    }
    
    const executionChain = crypto === 'ETH' && chain === 'ERC20' ? 'Native_ETH' : chain;
    const txHash = await executeOnChainWithdrawal(crypto, executionChain, amount, address);

    if (!txHash) {
        throw new Error("On-chain transaction failed to return a transaction hash.");
    }
    
    const withdrawalRef = firestoreAdmin.collection('users').doc(userId).collection('withdrawals').doc();
    const userDocRef = firestoreAdmin.collection('users').doc(userId);

    await firestoreAdmin.runTransaction(async (transaction) => {
        const walletSnap = await transaction.get(userWalletRef);
        const userSnap = await transaction.get(userDocRef);
        
        const currentWallet = walletSnap.data() as UserWallet;
        const currentUser = userSnap.data() as User;

        transaction.update(userWalletRef, {
            balance: (currentWallet.balance || 0) - totalDeduction,
            updatedAt: new Date().toISOString(),
        });
        
        transaction.set(withdrawalRef, {
            id: withdrawalRef.id,
            userId: userId,
            userDisplayName: currentUser.userId || 'N/A',
            crypto,
            chain,
            address,
            amount: amount,
            fee: totalFee,
            status: 'approved',
            txHash: txHash,
            createdAt: new Date().toISOString(),
        });
    });

    return txHash;
}

export async function setupUserWallets(userId: string) {
    const userRef = firestoreAdmin.collection("users").doc(userId);
    const counterRef = firestoreAdmin.collection("system").doc("walletCounter");
  
    const index = await firestoreAdmin.runTransaction(async (tx) => {
      const doc = await tx.get(counterRef);
      const current = doc.exists ? (doc.data()?.value || 0) : 0;
      tx.set(counterRef, { value: current + 1 }, { merge: true });
      return current;
    });
  
    await userRef.update({ walletIndex: index });
  
    const walletsRef = userRef.collection("wallets");
  
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
        { coin: 'BTC', chain: 'Bitcoin', address: 'bc1...'}, // Placeholder
        { coin: 'LTC', chain: 'Litecoin', address: 'ltc1...'}  // Placeholder
    ];
  
    const batch = firestoreAdmin.batch();
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
  
