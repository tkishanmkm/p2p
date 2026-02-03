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
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-white">
            <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-16 items-center">
                <div className="text-center md:text-left">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground leading-tight">
                        Buy and sell crypto
                    </h1>
                     <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto md:mx-0">
                        Peer-to-peer lets you trade crypto directly with other people. Our escrow and dispute moderation keep every trade protected.
                    </p>
                </div>
                <div className="relative flex justify-center md:justify-end">
                    <BuySellForm />
                </div>
            </div>
        </section>

        {/* Stats Section */}
        <section className="py-20">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    {stats.map(stat => (
                        <div key={stat.label}>
                            <p className="text-4xl font-bold text-primary">{stat.value}</p>
                            <p className="mt-2 text-muted-foreground">{stat.label}</p>
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
