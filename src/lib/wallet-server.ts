

import { firestoreAdmin } from '@/lib/firebase-admin';
import { ethWallet, bscWallet, tron, ethProvider, bscProvider } from '@/lib/blockchain-server';
import { ethers } from 'ethers';
import type { CryptoCurrency, UserWallet } from '@/lib/types';

// ERC20 ABI for transfer
const erc20ABI = ["function transfer(address to, uint amount) returns (bool)"];

const getGasMultiplier = () => Number(process.env.GAS_MULTIPLIER) || 2;

async function updateUserBalance(userId: string, crypto: CryptoCurrency, chain: string, amountToDeduct: number) {
  const walletId = `${crypto}-${chain}`;
  const userWalletRef = firestoreAdmin.collection('users').doc(userId).collection('wallets').doc(walletId);

  return firestoreAdmin.runTransaction(async (transaction) => {
    const userWalletSnap = await transaction.get(userWalletRef);
    if (!userWalletSnap.exists) throw new Error('User wallet not found for this chain.');
    const userWallet = userWalletSnap.data() as UserWallet;

    if (userWallet.balance < amountToDeduct) {
      throw new Error('Insufficient balance');
    }

    transaction.update(userWalletRef, {
      balance: userWallet.balance - amountToDeduct,
      updatedAt: new Date().toISOString(),
    });
  });
}

async function getContractAddresses(crypto: CryptoCurrency) {
    const docRef = firestoreAdmin.collection('_config').doc('contracts');
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
        throw new Error('Contract addresses configuration not found.');
    }
    const data = docSnap.data();
    return data?.[crypto];
}

async function withdrawErc20(userId: string, chain: 'ERC20' | 'BEP20', amount: number, toAddress: string) {
    const provider = chain === 'ERC20' ? ethProvider : bscProvider;
    const wallet = chain === 'ERC20' ? ethWallet : bscWallet;
    const contracts = await getContractAddresses('USDT');
    const contractAddress = contracts[chain];

    if (!contractAddress) {
        throw new Error(`USDT contract address for ${chain} not configured.`);
    }

    const contract = new ethers.Contract(contractAddress, erc20ABI, wallet);

    // For ERC20, amount needs to be in the smallest unit (e.g., wei for ETH-based tokens)
    const decimals = 6; // Standard for USDT
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    const gasPriceResult = await provider.getFeeData();
    const gasPrice = gasPriceResult.gasPrice || ethers.parseUnits('5', 'gwei');
    const multipliedGas = (gasPrice * BigInt(getGasMultiplier()));

    // Estimate gas for the token transfer
    const gasEstimate = await contract.transfer.estimateGas(toAddress, parsedAmount);

    const tx = await contract.transfer(toAddress, parsedAmount, {
        gasLimit: gasEstimate,
        gasPrice: multipliedGas,
    });

    await updateUserBalance(userId, 'USDT', chain, amount);
    console.log(`${chain} Withdrawal Tx:`, tx.hash);
    return tx.hash;
}

async function withdrawTrc20(userId: string, amount: number, toAddress: string) {
    const contracts = await getContractAddresses('USDT');
    const contractAddress = contracts['TRC20']; // e.g., "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
     if (!contractAddress) {
        throw new Error(`USDT contract address for TRC20 not configured.`);
    }
    
    // For TRC20, amount is also in smallest unit (sun for USDT on Tron)
    const decimals = 6;
    const parsedAmount = amount * Math.pow(10, decimals);
    
    const contract = await tron.contract().at(contractAddress);
    const tx = await contract.transfer(toAddress, parsedAmount).send({
        feeLimit: 100_000_000, // 100 TRX, a generous limit
        shouldPollResponse: false
    });
    
    await updateUserBalance(userId, 'USDT', 'TRC20', amount);
    console.log('TRC20 Withdrawal Tx:', tx);
    return tx;
}

async function withdrawNative(userId: string, crypto: 'ETH' | 'LTC' | 'BTC', amount: number, toAddress: string) {
    if (crypto === 'ETH') {
        const gasPriceResult = await ethProvider.getFeeData();
        const gasPrice = gasPriceResult.gasPrice || ethers.parseUnits('5', 'gwei');

        const multipliedGas = (gasPrice * BigInt(getGasMultiplier()));
        const value = ethers.parseEther(amount.toString());

        const tx = await ethWallet.sendTransaction({
            to: toAddress,
            value: value,
            gasPrice: multipliedGas
        });
        await updateUserBalance(userId, crypto, 'ERC20', amount);
        console.log('ETH Withdrawal Tx:', tx.hash);
        return tx.hash;
    }
    // BTC and LTC withdrawals are complex and require a full node or trusted third-party API.
    // This is a placeholder for the logic.
    console.log(`${crypto} withdrawal simulated: ${amount} to ${toAddress}`);
    await updateUserBalance(userId, crypto, crypto === 'BTC' ? 'Bitcoin' : 'Litecoin', amount);
    return `simulated-${crypto.toLowerCase()}-txid-${Date.now()}`;
}

export async function withdraw(userId: string, crypto: CryptoCurrency, chain: string, amount: number, address: string) {
    switch (crypto) {
        case 'USDT':
            if (chain === 'ERC20') {
                return await withdrawErc20(userId, 'ERC20', amount, address);
            } else if (chain === 'BEP20') {
                return await withdrawErc20(userId, 'BEP20', amount, address);
            } else if (chain === 'TRC20') {
                return await withdrawTrc20(userId, amount, address);
            }
            throw new Error(`Unsupported chain for USDT: ${chain}`);
        case 'ETH':
            return await withdrawNative(userId, 'ETH', amount, address);
        case 'BTC':
        case 'LTC':
             return await withdrawNative(userId, crypto, amount, address);
        default:
            throw new Error(`Unsupported currency for withdrawal: ${crypto}`);
    }
}
