
export default function AmlPolicyPage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto">
      <h1>Anti-Money Laundering (AML) Policy</h1>
      <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <h2>1. Policy Statement</h2>
      <p>
        Paxones is committed to preventing the use of its platform for money laundering, terrorist financing, and other illicit activities. We have implemented a comprehensive Anti-Money Laundering (AML) and Counter-Terrorist Financing (CTF) program based on applicable laws and regulations.
      </p>

      <h2>2. Customer Identification Program (CIP)</h2>
      <p>
        We have established a robust Customer Identification Program (also known as Know Your Customer or KYC) to verify the identity of our users. As part of this program, we may require users to provide personal information and documentation, including but not limited to:
      </p>
      <ul>
        <li>Full legal name and date of birth.</li>
        <li>A government-issued identification document (e.g., passport, driver's license).</li>
        <li>Proof of address (e.g., utility bill, bank statement).</li>
      </ul>
      <p>
        We reserve the right to request additional information and to use third-party services to verify the information you provide.
      </p>

      <h2>3. Monitoring and Reporting</h2>
      <p>
        We utilize automated systems and manual oversight to monitor user transactions for suspicious activity. Suspicious activity may include, but is not limited to:
      </p>
      <ul>
        <li>Unusually large or frequent transactions.</li>
        <li>Transactions with no apparent legitimate purpose.</li>
        <li>Attempts to circumvent our policies or transaction limits.</li>
        <li>Use of the platform from a sanctioned jurisdiction.</li>
      </ul>
      <p>
        In accordance with legal requirements, we will report suspicious activities to the relevant financial intelligence units (FIUs) and law enforcement agencies.
      </p>
      
      <h2>4. Sanctions Compliance</h2>
      <p>
        Paxones complies with all applicable international sanctions programs, including those administered by the United Nations (UN), the U.S. Office of Foreign Assets Control (OFAC), and the European Union (EU). We prohibit and will block transactions involving individuals, entities, or jurisdictions on these sanctions lists.
      </p>

      <h2>5. Risk Assessment</h2>
      <p>
        We conduct ongoing risk assessments to identify and mitigate potential AML/CTF risks associated with our platform, users, and geographic locations. Our policies and procedures are regularly updated based on these assessments.
      </p>

      <h2>6. Cooperation with Law Enforcement</h2>
      <p>
        Paxones is committed to cooperating fully with law enforcement and regulatory agencies. We will respond to valid legal requests for information in accordance with our Privacy Policy and applicable laws.
      </p>
    </div>
  );
}
