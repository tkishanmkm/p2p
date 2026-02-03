export default function TermsPage() {
    return (
      <div className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
  
        <h2>1. Introduction</h2>
        <p>Welcome to TradeFlow! These Terms of Service ("Terms") govern your use of our peer-to-peer cryptocurrency trading platform. By accessing or using our Services, you agree to be bound by these Terms.</p>
  
        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old and have the legal capacity to enter into binding contracts to use our Services. You agree to comply with all applicable laws and regulations in your jurisdiction.</p>
  
        <h2>3. Account Registration</h2>
        <p>You must provide accurate and complete information during account registration. You are responsible for all activities that occur under your account and for keeping your password secure.</p>
  
        <h2>4. General P2P Trading Rules</h2>
        <p>TradeFlow is a platform that connects buyers and sellers. We are not a party to any trade. All trades are secured by our automated escrow system. You agree to communicate with other users professionally and to not engage in any fraudulent or illegal activities.</p>
  
        <h2 id="buyer-terms">5. Terms for Buyers</h2>
        <ul>
          <li><strong>Initiating a Trade:</strong> By initiating a trade, you commit to paying the seller the agreed-upon amount using the specified payment method within the designated payment window.</li>
          <li><strong>Payment:</strong> You must use a payment account registered in your own name. Third-party payments are strictly prohibited. You must provide clear proof of payment if requested during a dispute.</li>
          <li><strong>Marking as Paid:</strong> You must only click the "Mark as Paid" button AFTER you have sent the full payment. Falsely marking a trade as paid may result in a temporary or permanent ban from our platform.</li>
          <li><strong>Communication:</strong> Maintain clear communication with the seller through the trade chat.</li>
        </ul>
  
        <h2 id="seller-terms">6. Terms for Sellers</h2>
        <ul>
          <li><strong>Creating an Ad:</strong> You are responsible for the accuracy of your ad, including payment methods, price, and terms. You must have the full amount of cryptocurrency available in your TradeFlow wallet before creating a sell ad.</li>
          <li><strong>Confirming Payment:</strong> You must diligently check your payment account to confirm you have received the full payment from the buyer before releasing the crypto. Do not rely solely on the buyer's proof of payment.</li>
          <li><strong>Releasing Cryptocurrency:</strong> Once you have confirmed receipt of payment, you must release the cryptocurrency from escrow promptly. Failure to do so after receiving payment will result in a dispute where the crypto will be awarded to the buyer, and your account may be penalized.</li>
          <li><strong>Communication:</strong> Respond to your trade partner in a timely manner.</li>
        </ul>
  
        <h2>7. Dispute Resolution</h2>
        <p>In the event of a dispute, our moderation team will intervene. You agree to provide all necessary information, including payment proofs and chat logs. Our decision is final and binding. Frivolous disputes may lead to account suspension.</p>
  
        <h2>8. Fees</h2>
        <p>We charge a small, transparent fee for completed trades. This fee is used to maintain the platform and provide support services. The fee is clearly displayed before you enter a trade.</p>
  
        <h2>9. Termination</h2>
        <p>We may terminate or suspend your account at our discretion for any reason, including violation of these Terms. </p>
  
        <h2>10. Disclaimers</h2>
        <p>Cryptocurrency trading involves significant risk. Our Services are provided "as is" without any warranties. We are not liable for any losses you may incur from trading.</p>
      </div>
    );
  }
