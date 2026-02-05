export default function PressPage() {
  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto">
      <h1>Press & Media</h1>
      <p className="lead">
        Welcome to the TradeFlow press room. Here you will find the latest news, press releases, and media assets for our platform.
      </p>

      <h2>Media Inquiries</h2>
      <p>
        For all media inquiries, interviews, or other press-related matters, please contact our communications team. We are happy to provide information about our company, our mission, and the future of P2P trading.
      </p>
       <p>
        <strong>Email:</strong> press@tradeflow.app (Note: This is a fictional email address for demonstration.)
      </p>

      <h2>Press Kit</h2>
      <p>
        Our press kit includes our official logos, brand guidelines, and high-resolution images of our platform. Please use these assets in accordance with our brand guidelines.
      </p>
      <button className="not-prose inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">Download Press Kit</button>

      <h2>Recent Press Releases</h2>
      <div className="not-prose space-y-4 mt-6">
        <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">July 15, 2024</p>
            <h3 className="font-semibold">TradeFlow Launches in Three New Markets, Expanding Global Reach</h3>
            <p className="mt-2 text-sm">TradeFlow today announced its expansion into three new emerging markets, furthering its mission to provide global access to peer-to-peer finance.</p>
        </div>
        <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">June 1, 2024</p>
            <h3 className="font-semibold">TradeFlow Reports Record Trading Volume in Q2 2024</h3>
            <p className="mt-2 text-sm">The P2P trading platform saw a 50% increase in trading volume, driven by user growth and new feature launches.</p>
        </div>
      </div>
    </div>
  );
}
