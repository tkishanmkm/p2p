import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BuySellForm } from "@/components/home/buy-sell-form";

const stats = [
    { value: "500+", label: "Payment methods" },
    { value: "5min", label: "Average trade time" },
    { value: "180+", label: "Countries Supported" },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Header />
      <main className="flex-grow">
        <section className="container mx-auto px-4 md:px-6 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-16 items-center">
                <div className="space-y-4 text-center md:text-left">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tighter text-gray-800">
                        Buy and sell crypto
                    </h1>
                     <p className="text-lg text-gray-500 max-w-md mx-auto md:mx-0">
                        Peer-to-peer lets you trade crypto directly with other people. Our escrow and dispute moderation keep every trade protected.
                    </p>
                </div>
                <div>
                    <BuySellForm />
                </div>
            </div>
        </section>

        <section className="py-16">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center max-w-4xl mx-auto">
                    {stats.map((stat) => (
                        <div key={stat.label}>
                            <p className="text-4xl lg:text-5xl font-bold text-primary">{stat.value}</p>
                            <p className="mt-2 text-gray-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
