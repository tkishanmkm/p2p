import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="prose dark:prose-invert max-w-4xl mx-auto">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Introduction & Our Role</h2>
          <p>
            Welcome to Paxones! These Terms of Service ("Terms") govern your use of our peer-to-peer cryptocurrency
            trading platform. By accessing or using our Services, you agree to be bound by these Terms.
          </p>
          <p>
            <strong>Important Disclaimer:</strong> Paxones is a technology platform that connects users (buyers and sellers) for the purpose of executing peer-to-peer (P2P) transactions. We are not a party to any trade between users. We do not buy, sell, or exchange cryptocurrency ourselves. Our service is limited to providing the platform, facilitating communication, and offering an automated escrow service to secure transactions.
          </p>
          <p>
            <strong>Limitation of Liability:</strong> Paxones is not responsible for any loss, damage, or claim arising from any transaction between users. The responsibility for ensuring the legitimacy of a trade and the identity of a trade partner rests solely with you. We do not guarantee the completion of any trade or the integrity of any user. Our dispute resolution service is provided on a best-effort basis, and its outcome is based solely on the evidence provided by the users within the platform's chat.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old and have the legal capacity to enter into binding contracts to use our
            Services. You agree to comply with all applicable laws and regulations in your jurisdiction.
          </p>

          <h2>3. Account Registration</h2>
          <p>
            You must provide accurate and complete information during account registration. You are responsible for all
            activities that occur under your account and for keeping your password secure.
          </p>

          <h2>4. General P2P Trading Rules</h2>
          <p>
            All trades on Paxones are secured by our automated escrow system. You agree to communicate with other users professionally and to not engage in
            any fraudulent or illegal activities. All communication and transactions must remain on the Paxones platform.
          </p>

          <h2 id="how-to-trade">5. How to Trade: A Step-by-Step Guide</h2>
          <ol>
            <li><strong>Find an Advertisement:</strong> Browse the "Buy" or "Sell" pages to find an ad that matches your desired cryptocurrency, fiat currency, and payment method. Review the trader's reputation (feedback score, number of trades) and the ad's terms carefully.</li>
            <li><strong>Initiate the Trade:</strong> Enter the amount you wish to trade and click the "Buy" or "Sell" button. Once you initiate the trade, the cryptocurrency is locked in our secure escrow.</li>
            <li><strong>Communicate in Chat:</strong> Use the trade chat to communicate with your partner. For sellers, this is where you provide your payment details. For buyers, this is where you confirm you are ready to pay.</li>
            <li><strong>Payment (Buyer's Role):</strong> The buyer sends the agreed-upon fiat amount to the seller using the provided payment details. This must be done within the payment time limit shown in the trade.</li>
            <li><strong>Confirm Payment (Buyer's Role):</strong> After sending the payment, the buyer MUST click the "Mark as Paid" button in the trade interface. This notifies the seller and prevents the trade from expiring.</li>
            <li><strong>Verify Payment (Seller's Role):</strong> The seller must check their bank or payment account to confirm they have received the full payment. <strong>Do not rely on screenshots or payment proofs alone.</strong></li>
            <li><strong>Release Crypto (Seller's Role):</strong> Once payment is confirmed, the seller must click the "Release Crypto" button. This transfers the cryptocurrency from escrow to the buyer's wallet, completing the trade.</li>
          </ol>


          <h2 id="buyer-terms">6. Terms for Buyers</h2>
          <ul>
            <li>
              <strong>Commitment:</strong> By initiating a trade, you commit to paying the seller the agreed-upon
              amount using the specified payment method within the designated payment window.
            </li>
            <li>
              <strong>Payment:</strong> You must use a payment account registered in your own name. Third-party payments are
              strictly prohibited. You must provide clear proof of payment if requested during a dispute.
            </li>
            <li>
              <strong>Marking as Paid:</strong> You must only click the "Mark as Paid" button AFTER you have sent the full
              payment. Falsely marking a trade as paid may result in a temporary or permanent ban from our platform.
            </li>
            <li>
              <strong>On-Platform Communication:</strong> Maintain all communication with the seller through the Paxones trade chat. You must
              not ask the seller for personal contact information, including social media handles, phone numbers, or email
              addresses.
            </li>
          </ul>

          <h2 id="seller-terms">7. Terms for Sellers</h2>
          <ul>
            <li>
              <strong>Creating an Ad:</strong> You are responsible for the accuracy of your ad, including payment methods,
              price, and terms. You must have the full amount of cryptocurrency available in your Paxones wallet before creating a
              sell ad.
            </li>
            <li>
              <strong>Confirming Payment:</strong> You must diligently check your payment account to confirm you have
              received the full payment from the buyer before releasing the cryptocurrency. Do not rely solely on the buyer's proof of
              payment.
            </li>
            <li>
              <strong>Releasing Cryptocurrency:</strong> Once you have confirmed receipt of payment, you must release the
              cryptocurrency from escrow promptly. Failure to do so after receiving payment will result in a dispute where the cryptocurrency
              will be awarded to the buyer, and your account may be penalized.
            </li>
            <li>
              <strong>On-Platform Communication:</strong> You must not direct users to communicate or trade outside of
              the Paxones platform. Do not send or request users to click on any unauthorized links.
            </li>
          </ul>

          <h2>8. Dispute Resolution</h2>
          <p>
            In the event of a dispute, our moderation team will intervene to mediate a resolution. As a neutral third party, our decision is based solely on the evidence provided by both parties within the Paxones trade chat. You agree that Paxones's decision in any dispute is final and binding. Paxones is not liable for any losses resulting from a dispute.
          </p>

          <h2>9. Fees</h2>
          <p>
            We charge a small, transparent fee for completed trades. This fee is used to maintain the platform and provide
            support services. The fee is clearly displayed before you enter a trade.
          </p>

          <h2>10. Termination</h2>
          <p>We may terminate or suspend your account at our discretion for any reason, including violation of these Terms. </p>

          <h2>11. Disclaimers</h2>
          <p>
            Cryptocurrency trading involves significant risk. Our Services are provided "as is" without any warranties. We are not
            liable for any losses you may incur from trading.
          </p>
          
          <div className="not-prose mt-8 border-t pt-8">
            <p>If you have questions about these Terms, please <Link href="/contact" className="font-semibold underline">contact our support team</Link>.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
