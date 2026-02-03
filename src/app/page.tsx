import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BuySellForm } from "@/components/home/buy-sell-form";
import Image from "next/image";
import { ShieldCheck, Users, Globe, UserPlus, Repeat, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import type { CryptoCurrency } from "@/lib/types";

const whyTradeFlow = [
    {
        icon: <ShieldCheck className="h-10 w-10 text-accent" />,
        title: "Secure Escrow",
        description: "Your crypto is held in secure escrow until the trade is successfully completed, protecting both buyers and sellers.",
    },
    {
        icon: <Users className="h-10 w-10 text-accent" />,
        title: "P2P Marketplace",
        description: "Trade directly with other users. Enjoy competitive rates and a wide variety of payment methods.",
    },
    {
        icon: <Globe className="h-10 w-10 text-accent" />,
        title: "Global & Local",
        description: "Find offers from your local community or trade with users from around the world.",
    },
]

const howItWorks = [
    {
        icon: <UserPlus className="h-8 w-8 text-primary" />,
        title: "Create Account",
        description: "Sign up for a free account in just a few minutes."
    },
    {
        icon: <Repeat className="h-8 w-8 text-primary" />,
        title: "Find an Offer",
        description: "Browse ads from other users or create your own to buy or sell."
    },
    {
        icon: <CheckCircle className="h-8 w-8 text-primary" />,
        title: "Complete the Trade",
        description: "Communicate with your trade partner and finalize the transaction securely."
    }
];

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency, className?: string }) => {
    switch (crypto) {
        case 'BTC': return <BtcLogo className={className} />;
        case 'ETH': return <EthLogo className={className} />;
        case 'LTC': return <LtcLogo className={className} />;
        case 'USDT': return <UsdtLogo className={className} />;
        default: return null;
    }
}

const supportedCryptos: CryptoCurrency[] = ['BTC', 'ETH', 'USDT', 'LTC'];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                        The Secure Way to Buy & Sell Crypto Peer-to-Peer
                    </h1>
                     <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto md:mx-0">
                        Join thousands of users on TradeFlow, the trusted P2P platform with a robust escrow system, low fees, and global reach.
                    </p>
                    <div className="mt-8 flex justify-center md:justify-start">
                        <BuySellForm />
                    </div>
                </div>
                <div className="relative h-64 md:h-full">
                     <Image src="https://images.unsplash.com/photo-1724977490800-7bf332e6f256?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBzZWN1cmV8ZW58MHx8fHwxNzcwMTAxNDE4fDA&ixlib=rb-4.1.0&q=80&w=1080" alt="Hero image for the landing page" data-ai-hint="modern secure" fill className="object-cover rounded-lg" priority />
                </div>
            </div>
        </section>

        <section className="py-20 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
                 <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
                    <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">Start trading in three simple steps.</p>
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {howItWorks.map(step => (
                        <div key={step.title} className="flex flex-col items-center text-center gap-4">
                            <div className="p-4 bg-primary/10 rounded-full">
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-semibold">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
        
        <section className="py-16 bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6 text-center">
                <h2 className="text-3xl font-bold tracking-tight">Trade Your Favorite Cryptocurrencies</h2>
                <p className="mt-2 text-muted-foreground">We support a growing list of popular digital assets.</p>
                <div className="mt-8 flex justify-center items-center gap-8 md:gap-12 flex-wrap">
                    {supportedCryptos.map(crypto => (
                        <div key={crypto} className="flex items-center gap-3">
                           <CryptoLogo crypto={crypto} className="h-10 w-10" />
                           <span className="font-semibold text-lg">{crypto}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        <section className="py-20 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Why Choose TradeFlow?</h2>
                    <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">We've built a platform focused on security, ease of use, and trust.</p>
                </div>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                    {whyTradeFlow.map((item) => (
                        <Card key={item.title}>
                            <CardContent className="p-8 flex flex-col items-center text-center">
                                {item.icon}
                                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                                <p className="mt-2 text-muted-foreground">{item.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
