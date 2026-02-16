import express from 'express';
import { withdraw } from '../wallet';
import { auth } from '../firebase-admin';
import cors from 'cors';
import { CryptoCurrency } from '../types';

const router = express.Router();
router.use(cors());

router.post('/', async (req, res) => {
  const { userId, crypto, chain, amount, address, idToken } = req.body;

  if (!idToken) {
    return res.status(401).json({ error: 'Unauthorized: Missing ID token.' });
  }

  if (!userId || !crypto || !chain || !amount || !address) {
    return res.status(400).json({ error: 'Missing parameters: userId, crypto, chain, amount, and address are required.' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    if (decodedToken.uid !== userId) {
        return res.status(403).json({ error: 'Forbidden: ID token does not match user ID.' });
    }
    
    const txHash = await withdraw(userId, crypto as CryptoCurrency, chain, Number(amount), address);

    res.json({ success: true, txHash });
  } catch (err: any) {
    console.error('Withdrawal API error:', err);
    res.status(500).json({ error: err.message || 'An internal error occurred.' });
  }
});

export default router;
