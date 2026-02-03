export default function TermsPage() {
    return (
      <div className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
  
        <h2>1. Introduction</h2>
        <p>Welcome to TradeFlow! These Terms of Service ("Terms") govern your use of our peer-to-peer cryptocurrency trading platform, including our website, mobile applications, and any services offered by TradeFlow (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms.</p>
  
        <h2>2. Eligibility</h2>
        <p>You must be at least 18 years old to use our Services. By using our Services, you represent and warrant that you meet this requirement. You also agree to comply with all applicable laws and regulations in your jurisdiction.</p>
  
        <h2>3. Account Registration</h2>
        <p>To use our Services, you must create an account. You agree to provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
  
        <h2>4. P2P Trading</h2>
        <p>TradeFlow provides a platform for users to engage in P2P trading of cryptocurrencies. We are not a party to any trade between users. We provide an escrow service to secure the transaction. When a trade is initiated, the seller's cryptocurrency is held in our escrow until the payment is confirmed by the seller.</p>
        
        <h2>5. User Conduct</h2>
        <p>You agree not to engage in any of the following prohibited activities:</p>
        <ul>
          <li>Violating any laws, regulations, or third-party rights.</li>
          <li>Using our Services for any fraudulent or illegal purposes.</li>
          <li>Harassing, abusing, or harming another person.</li>
          <li>Providing false, inaccurate, or misleading information.</li>
          <li>Attempting to circumvent our fee structure or escrow process.</li>
        </ul>
  
        <h2>6. Dispute Resolution</h2>
        <p>In the event of a dispute between a buyer and a seller, either party may initiate a dispute resolution process. TradeFlow's support team will act as a neutral mediator to resolve the dispute based on the evidence provided by both parties. Our decision in a dispute is final and binding.</p>
  
        <h2>7. Fees</h2>
        <p>We may charge fees for our Services. Any applicable fees will be disclosed to you prior to you completing a transaction. We reserve the right to change our fees at any time.</p>
  
        <h2>8. Termination</h2>
        <p>We may terminate or suspend your account and access to the Services at our sole discretion, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Services will immediately cease.</p>
  
        <h2>9. Disclaimers</h2>
        <p>Our Services are provided "as is" and "as available" without any warranties of any kind. We do not guarantee that the Services will be uninterrupted or error-free. You acknowledge that cryptocurrency trading involves significant risk.</p>
  
        <h2>10. Governing Law</h2>
        <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which TradeFlow operates, without regard to its conflict of law provisions.</p>
  
        <h2>11. Changes to Terms</h2>
        <p>We reserve the right to modify these Terms at any time. We will provide notice of any changes by posting the new Terms on our website. Your continued use of the Services after any such changes constitutes your acceptance of the new Terms.</p>
      </div>
    );
  }
