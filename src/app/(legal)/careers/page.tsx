export default function CareersPage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto">
      <h1>Careers at TradeFlow</h1>
      <p className="lead">
        Join our mission to build the future of peer-to-peer finance. We are a passionate team of innovators, thinkers, and builders dedicated to creating a more accessible global economy.
      </p>

      <h2>Why Work With Us?</h2>
      <p>
        At TradeFlow, you'll be part of a dynamic and fast-paced environment where your work has a real-world impact. We foster a culture of collaboration, ownership, and continuous learning. We are a remote-first company, offering the flexibility to work from anywhere.
      </p>

      <h2>Open Positions</h2>
      <p>
        We are always looking for talented individuals to join our team. Below are some of the roles we are currently hiring for. If you don't see a perfect fit but believe you can contribute to our mission, feel free to send us an open application.
      </p>
      
      <div className="not-prose space-y-4">
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Senior Frontend Engineer (React/Next.js)</h3>
            <p className="text-sm text-muted-foreground">Location: Remote</p>
            <p className="mt-2 text-sm">We are looking for an experienced frontend developer to help build and scale our trading platform. You will be responsible for creating a world-class user experience.</p>
        </div>
        <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Dispute Resolution Specialist</h3>
            <p className="text-sm text-muted-foreground">Location: Remote</p>
            <p className="mt-2 text-sm">Join our support team as a moderator. You will be responsible for investigating and resolving trade disputes to ensure fairness and maintain platform integrity.</p>
        </div>
         <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Head of Marketing</h3>
            <p className="text-sm text-muted-foreground">Location: Remote</p>
            <p className="mt-2 text-sm">Lead our marketing efforts to grow our user base globally. Develop and execute strategies across multiple channels to drive brand awareness and user acquisition.</p>
        </div>
      </div>

      <h2>How to Apply</h2>
      <p>
        To apply for a position, please send your resume and a cover letter to our careers email address. Please include the job title in the subject line. We look forward to hearing from you!
      </p>
      <p>
        <strong>Email:</strong> careers@tradeflow.app (Note: This is a fictional email address for demonstration.)
      </p>
    </div>
  );
}
