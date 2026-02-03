import { ShieldCheck, MessageCircle, Lock, Ban } from 'lucide-react';

export default function GuidesPage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto">
      <h1>P2P Trading Guides & Safety</h1>
      <p className="lead">
        Your security is our top priority. Follow these essential guidelines to ensure a safe and smooth trading
        experience on TradeFlow.
      </p>

      <div className="p-4 border-l-4 border-destructive bg-destructive/10 text-destructive-foreground rounded-r-lg my-8">
        <h3 className="mt-0 !text-destructive-foreground">The Golden Rule: Stay on TradeFlow</h3>
        <p className="!text-destructive-foreground">
          <strong>NEVER</strong> communicate, negotiate, or trade with anyone outside of the TradeFlow platform. Our
          secure escrow and moderation can only protect you if the entire transaction happens here. Anyone asking you to
          use Telegram, WhatsApp, or any other app is likely trying to scam you.
        </p>
      </div>

      <h2>
        <Lock className="inline-block -mt-1 mr-2" /> Understanding Escrow Protection
      </h2>
      <p>
        The escrow system is your most important safety feature. Here’s how it works:
      </p>
      <ol>
        <li>When a trade starts, the seller's crypto is automatically locked in TradeFlow's secure escrow.</li>
        <li>The buyer sends the payment to the seller using the agreed-upon method.</li>
        <li>The seller confirms they have received the full payment.</li>
        <li>
          Once payment is confirmed, TradeFlow releases the crypto from escrow directly into the buyer's wallet.
        </li>
      </ol>
      <p>
        This process guarantees that the seller cannot run away with the payment without releasing the crypto, and the
        buyer cannot receive the crypto without making the payment.
      </p>

      <h2>
        <MessageCircle className="inline-block -mt-1 mr-2" /> Communication Best Practices
      </h2>
      <ul>
        <li>
          <strong>Keep all chat on TradeFlow:</strong> All communication should happen within the trade chat. This log is
          essential evidence if a dispute occurs.
        </li>
        <li>
          <strong>Do not share personal details:</strong> Never share your phone number, email, social media profiles, or
          other contact information. There is no legitimate reason for a trade partner to ask for this.
        </li>
        <li>
          <strong>Be clear and professional:</strong> Clearly state your terms and be respectful in your communication.
        </li>
      </ul>

      <h2>
        <Ban className="inline-block -mt-1 mr-2" /> Identifying and Avoiding Scams
      </h2>
      <ul>
        <li>
          <strong>Refuse off-platform trades:</strong> Immediately decline and report any user who asks you to trade on
          another platform like Telegram or WhatsApp.
        </li>
        <li>
          <strong>Beware of fake payment proofs:</strong> Sellers should always log in to their bank or payment app to
          verify that the payment has been received and is fully processed. Do not rely on screenshots or emails from
          the buyer as proof.
        </li>
        <li>
          <strong>Never release crypto before payment:</strong> Sellers, do not release the crypto from escrow until you
          are 100% certain the payment is complete and irreversible in your account.
        </li>
        <li>
          <strong>Do not click on suspicious links:</strong> Be wary of any links sent in the chat. Phishing links can be
          used to steal your account information.
        </li>
      </ul>

      <h2>
        <ShieldCheck className="inline-block -mt-1 mr-2" /> If Something Goes Wrong
      </h2>
      <p>
        If a trade partner is unresponsive, violates the terms, or if you suspect a scam, do not hesitate to{' '}
        <strong>open a dispute</strong>. Our moderation team will step in to investigate and ensure a fair resolution.
      </p>
    </div>
  );
}
