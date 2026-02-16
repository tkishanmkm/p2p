
import { firestoreAdmin } from '@/lib/firebase-admin';
import { getEthWallet, getBscWallet, tron, ethProvider, bscProvider } from '@/lib/blockchain-server';
import { ethers } from 'ethers';
import type { CryptoCurrency, User, UserWallet } from '@/lib/types';

// ERC20 ABI for transfer
const erc20ABI = ["function transfer(address to, uint amount) returns (bool)"];

const getGasMultiplier = () => Number(process.env.GAS_MULTIPLIER) || 2;

async function executeWithdrawalAndUpdateLedger(
    userId: string,
    crypto: CryptoCurrency,
    chain: string,
    amount: number,
    toAddress: string,
    txHash: string
) {
  const walletId = `${crypto}-${chain}`;
  const userWalletRef = firestoreAdmin.collection('users').doc(userId).collection('wallets').doc(walletId);
  const withdrawalRef = firestoreAdmin.collection('users').doc(userId).collection('withdrawals').doc();
  const userDocRef = firestoreAdmin.collection('users').doc(userId);

  return firestoreAdmin.runTransaction(async (transaction) => {
    const userWalletSnap = await transaction.get(userWalletRef);
    const userDocSnap = await transaction.get(userDocRef);

    if (!userWalletSnap.exists) throw new Error('User wallet not found for this chain.');
    if (!userDocSnap.exists) throw new Error('User profile not found.');

    const userWallet = userWalletSnap.data() as UserWallet;
    const userData = userDocSnap.data() as User;

    if ((userWallet.balance || 0) < amount) {
        throw new Error('Insufficient balance. This should have been checked client-side.');
    }

    // 1. Decrement balance
    transaction.update(userWalletRef, {
        balance: (userWallet.balance || 0) - amount,
        updatedAt: new Date().toISOString(),
    });
    
    // 2. Create withdrawal record
    const withdrawalRecord = {
        id: withdrawalRef.id,
        userId: userId,
        userDisplayName: userData.userId || 'N/A',
        crypto,
        chain,
        address: toAddress,
        amount,
        status: 'approved',
        txHash: txHash,
        createdAt: new Date().toISOString(),
    };
    transaction.set(withdrawalRef, withdrawalRecord);
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
    const wallet = chain === 'ERC20' ? await getEthWallet() : await getBscWallet();
    const contracts = await getContractAddresses('USDT');
    const contractAddress = contracts?.[chain];

    if (!contractAddress) {
        throw new Error(`USDT contract address for ${chain} not configured.`);
    }

    const contract = new ethers.Contract(contractAddress, erc20ABI, wallet);

    const decimals = 6; // Standard for USDT
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);

    const gasPriceResult = await provider.getFeeData();
    const gasPrice = gasPriceResult.gasPrice || ethers.parseUnits('5', 'gwei');
    const multipliedGas = (gasPrice * BigInt(getGasMultiplier()));

    const gasEstimate = await contract.transfer.estimateGas(toAddress, parsedAmount);

    const tx = await contract.transfer(toAddress, parsedAmount, {
        gasLimit: gasEstimate,
        gasPrice: multipliedGas,
    });

    await executeWithdrawalAndUpdateLedger(userId, 'USDT', chain, amount, toAddress, tx.hash);

    console.log(`${chain} Withdrawal Tx:`, tx.hash);
    return tx.hash;
}

async function withdrawTrc20(userId: string, amount: number, toAddress: string) {
    const contracts = await getContractAddresses('USDT');
    const contractAddress = contracts?.['TRC20'];
     if (!contractAddress) {
        throw new Error(`USDT contract address for TRC20 not configured.`);
    }
    
    const decimals = 6;
    const parsedAmount = amount * Math.pow(10, decimals);
    
    const contract = await tron.contract().at(contractAddress);
    const tx = await contract.transfer(toAddress, parsedAmount).send({
        feeLimit: 100_000_000,
        shouldPollResponse: false
    });

    await executeWithdrawalAndUpdateLedger(userId, 'USDT', 'TRC20', amount, toAddress, tx);
    
    console.log('TRC20 Withdrawal Tx:', tx);
    return tx;
}

async function withdrawNative(userId: string, crypto: 'ETH' | 'LTC' | 'BTC', amount: number, toAddress: string) {
    if (crypto === 'ETH') {
        const wallet = await getEthWallet();
        const gasPriceResult = await ethProvider.getFeeData();
        const gasPrice = gasPriceResult.gasPrice || ethers.parseUnits('5', 'gwei');

        const multipliedGas = (gasPrice * BigInt(getGasMultiplier()));
        const value = ethers.parseEther(amount.toString());

        const tx = await wallet.sendTransaction({
            to: toAddress,
            value: value,
            gasPrice: multipliedGas
        });

        await executeWithdrawalAndUpdateLedger(userId, crypto, 'ERC20', amount, toAddress, tx.hash);

        console.log('ETH Withdrawal Tx:', tx.hash);
        return tx.hash;
    }
    
    console.log(`${crypto} withdrawal simulated: ${amount} to ${toAddress}`);
    const txHash = `simulated-${crypto.toLowerCase()}-txid-${Date.now()}`;
    await executeWithdrawalAndUpdateLedger(userId, crypto, crypto === 'BTC' ? 'Bitcoin' : 'Litecoin', amount, toAddress, txHash);
    return txHash;
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
