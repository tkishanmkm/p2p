import express from 'express';
import { withdrawETH, withdrawTRC20 } from '../wallet';
import { firestore } from '../firebase-admin';
import cors from 'cors';

const router = express.Router();
router.use(cors());

router.post('/', async (req, res) => {
  const { userId, crypto, amount, address } = req.body;

  if (!userId || !crypto || !amount || !address) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // Fetch user wallet from Firestore
    const walletDoc = await firestore.collection('users').doc(userId).collection('wallets').doc(crypto).get();
    if (!walletDoc.exists) return res.status(404).json({ error: 'Wallet not found' });

    const userWallet = walletDoc.data();

    let txHash;
    if (crypto === 'ETH' || crypto === 'USDT' || crypto === 'BSC') {
      txHash = await withdrawETH(userWallet, address, amount);
    } else if (crypto === 'TRC20') {
      txHash = await withdrawTRC20(userWallet, address, amount, 'TRON_USDT_CONTRACT_ADDRESS');
    } else {
      return res.status(400).json({ error: 'Unsupported crypto' });
    }

    // Update Firestore wallet after withdrawal
    await firestore.collection('users').doc(userId).collection('wallets').doc(crypto).update({
      balance: userWallet.balance,
    });

    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;