
import express from 'express';
import { withdraw } from '../wallet';
import { auth } from '../firebase-admin';
import cors from 'cors';
import { CryptoCurrency } from '../types';

const router = express.Router();
router.use(cors());

router.post('/', async (req, res) => {
  const { chain, amount, address, idToken } = req.body;
  let { crypto } = req.body; // Let crypto be mutable

  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Missing ID token.' });
  }
  
  if (!chain || !amount || !address || !crypto) {
    return res.status(400).json({ error: 'Missing parameters: crypto, chain, amount, and address are required.' });
  }

  // Handle native coin withdrawals where chain implies the crypto
  if (chain === 'ERC20' && crypto === 'ETH') {
    // This is a native ETH withdrawal
  } else if (chain === 'BEP20' && crypto === 'BNB') {
    // This is a native BNB withdrawal
  }


  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    if (!userId) {
         return res.status(401).json({ error: 'Authentication failed.' });
    }
    
    const txHash = await withdraw(userId, crypto as CryptoCurrency, chain, Number(amount), address);

    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error('Withdrawal API error:', err);
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

export default router;
