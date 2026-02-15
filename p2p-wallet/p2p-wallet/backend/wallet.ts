import { ethers } from 'ethers';
import { ethWallet, tron } from './blockchain';
import { UserWallet } from './types';

const GAS_MULTIPLIER = Number(process.env.GAS_MULTIPLIER || 2);

export async function withdrawETH(userWallet: UserWallet, userAddress: string, amount: number) {
  const gasPrice = await ethers.providers.getDefaultProvider().getGasPrice();
  const gasFee = Number(ethers.formatEther(gasPrice * 21000));
  const serviceFee = gasFee;

  userWallet.balance -= amount + gasFee + serviceFee;
  // p2pWallet.balance += serviceFee;  // Add to P2P admin account

  const tx = await ethWallet.sendTransaction({
    to: userAddress,
    value: ethers.parseEther(amount.toString()),
    gasPrice: gasPrice * GAS_MULTIPLIER
  });
  console.log('ETH withdrawal tx:', tx.hash);
  return tx.hash;
}

export async function withdrawTRC20(userWallet: UserWallet, to: string, amount: number, tokenContract: string) {
  const contract = await tron.contract().at(tokenContract);
  const feeLimit = 100_000_000;
  const totalFee = feeLimit * GAS_MULTIPLIER;

  userWallet.balance -= amount + feeLimit + feeLimit; // withdrawal + gas + service fee
  // p2pWallet.balance += feeLimit; // service fee

  const tx = await contract.transfer(to, amount).send({ feeLimit: totalFee });
  console.log('TRC20 withdrawal tx:', tx);
  return tx;
}