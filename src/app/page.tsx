import Image from "next/image";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BuySellForm } from "@/components/home/buy-sell-form";
import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ShieldCheck, Users, Globe } from "lucide-react";
import { SUPPORTED_CRYPTOS } from "@/lib/constants";

export default function Home() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'hero-image');

  const features = [
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
  ];

  const cryptoIcons = SUPPORTED_CRYPTOS.map(crypto => {
    const img = PlaceHolderImages.find(p => p.id === crypto.icon);
    return { ...crypto, imageUrl: img?.imageUrl, imageHint: img?.imageHint };
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                The Secure Way to Buy & Sell Crypto Peer-to-Peer
              </h1>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto md:mx-0">
                Join thousands of users on TradeFlow, the trusted P2P platform with a robust escrow system, low fees, and global reach.
              </p>
              <div className="mt-8 flex justify-center md:justify-start">
                <Card className="w-full max-w-lg shadow-lg">
                  <CardContent className="p-6">
                    <BuySellForm />
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="relative h-64 md:h-full">
              {heroImage && (
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  data-ai-hint={heroImage.imageHint}
                  fill
                  className="object-cover rounded-lg"
                  priority
                />
              )}
            </div>
          </div>
        </section>

        {/* Supported Cryptos Section */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 md:px-6 text-center">
             <h2 className="text-3xl font-bold tracking-tight">Trade Your Favorite Cryptocurrencies</h2>
              <p className="mt-2 text-muted-foreground">We support a growing list of popular digital assets.</p>
              <div className="mt-8 flex justify-center items-center gap-6 md:gap-10 flex-wrap">
                {cryptoIcons.map(crypto => (
                    <div key={crypto.name} className="flex flex-col items-center gap-2 text-center">
                        {crypto.imageUrl && <Image src={crypto.imageUrl} alt={`${crypto.name} icon`} data-ai-hint={crypto.imageHint} width={48} height={48} className="rounded-full" />}
                        <span className="font-semibold">{crypto.name}</span>
                    </div>
                ))}
              </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">Why Choose TradeFlow?</h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                We've built a platform focused on security, ease of use, and trust.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index}>
                  <CardContent className="p-8 flex flex-col items-center text-center">
                    {feature.icon}
                    <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-muted-foreground">{feature.description}</p>
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
