import { firestore } from 'firebase-admin';
import { getEvmWallet, tron, estimateGasFeeNative } from './blockchain';
import { ethers } from 'ethers';
import { CryptoCurrency, UserWallet } from './types';

const erc20ABI = ["function transfer(address to, uint amount) returns (bool)"];
const getGasMultiplier = () => Number(process.env.GAS_MULTIPLIER) || 2;

// Central withdrawal execution logic
async function executeOnChainWithdrawal(crypto: CryptoCurrency, chain: string, amount: number, toAddress: string): Promise<string> {
  const contracts = await getContractAddresses(crypto);
  const contractAddress = contracts?.[chain];

  switch (chain) {
    case 'ERC20':
    case 'BEP20':
    case 'Polygon':
    case 'Arbitrum':
    case 'Base': {
      if (crypto !== 'ETH' && !contractAddress) throw new Error(`${crypto} contract address for ${chain} not configured.`);
      const wallet = await getEvmWallet(chain);
      
      if (['ETH', 'BNB', 'MATIC'].includes(crypto) && !contractAddress) {
        const feeData = await wallet.provider?.getFeeData();
        const gasPrice = feeData?.gasPrice || ethers.parseUnits('5', 'gwei');
        const tx = await wallet.sendTransaction({ to: toAddress, value: ethers.parseEther(amount.toString()), gasPrice: gasPrice * BigInt(getGasMultiplier()) });
        return tx.hash;
      }
      
      const contract = new ethers.Contract(contractAddress, erc20ABI, wallet);
      const decimals = (crypto === 'USDT') ? 6 : 18;
      const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
      const feeData = await wallet.provider?.getFeeData();
      const gasPrice = feeData?.gasPrice || ethers.parseUnits('5', 'gwei');
      const tx = await contract.transfer(toAddress, parsedAmount, { gasPrice: gasPrice * BigInt(getGasMultiplier()) });
      return tx.hash;
    }
    case 'TRC20': {
        const decimals = (crypto === 'USDT') ? 6 : (crypto === 'TRX' ? 6 : 0);
        const parsedAmount = amount * Math.pow(10, decimals);
        
        if (crypto === 'TRX') {
            const tx = await tron.trx.sendTransaction(toAddress, parsedAmount);
            return tx.txid;
        }

        if (!contractAddress) throw new Error(`${crypto} contract address for TRC20 not configured.`);
        const contract = await tron.contract().at(contractAddress);
        const txId = await contract.transfer(toAddress, parsedAmount).send({ feeLimit: 150_000_000, shouldPollResponse: false });
        return txId;
    }
    default:
      throw new Error(`On-chain execution for ${crypto} on ${chain} is not supported.`);
  }
}

async function getContractAddresses(crypto: CryptoCurrency) {
    if (crypto !== 'USDT') return {};
    const docRef = firestore.collection('_config').doc('contracts');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        console.warn('Contract addresses configuration document (_config/contracts) not found.');
        return {};
    };
    return docSnap.data()?.[crypto] || {};
}

// Main withdrawal function to be called from API
export async function withdraw(userId: string, crypto: CryptoCurrency, chain: string, amount: number, address: string) {
    const { totalFee } = await getEstimatedFee(crypto, chain);
    const totalDeduction = amount + totalFee;
    const walletId = `${crypto}-${chain}`;
    const userWalletRef = firestore.collection('users').doc(userId).collection('wallets').doc(walletId);
    
    const userWalletSnap = await userWalletRef.get();
    if (!userWalletSnap.exists) throw new Error('User wallet not found for this crypto/chain combination.');
    
    const userWallet = userWalletSnap.data() as UserWallet;
    if ((userWallet.balance || 0) < totalDeduction) {
        throw new Error(`Insufficient balance. Required: ${totalDeduction.toFixed(8)} ${crypto}, but only ${userWallet.balance.toFixed(8)} ${crypto} is available.`);
    }
    
    const txHash = await executeOnChainWithdrawal(crypto, chain, amount, address);

    if (!txHash) {
        throw new Error("On-chain transaction failed to return a transaction hash.");
    }
    
    const withdrawalRef = firestore.collection('users').doc(userId).collection('withdrawals').doc();
    const userDocRef = firestore.collection('users').doc(userId);

    await firestore.runTransaction(async (transaction) => {
        const walletSnap = await transaction.get(userWalletRef);
        const userSnap = await transaction.get(userDocRef);
        
        const currentWallet = walletSnap.data() as UserWallet;
        const currentUser = userSnap.data() as any;

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

// Fee estimation logic
async function getPriceInUsd(symbol: string): Promise<number> {
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
        const serviceFee = gasFee;
        return { gasFee, serviceFee, totalFee: gasFee + serviceFee };
    }

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
