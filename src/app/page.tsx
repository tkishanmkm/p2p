import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { BuySellForm } from "@/components/home/buy-sell-form";
import { HomeSignupForm } from "@/components/home/home-signup-form";
import { CheckCircle, Globe, Gavel, Lock, MessageSquare, Search, ShieldCheck, UserPlus, Users, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from '@/components/icons';
import { SUPPORTED_CRYPTOS } from "@/lib/constants";
import type { CryptoCurrency } from "@/lib/types";

const stats = [
    { value: "180+", label: "Countries Supported" },
    { value: "500+", label: "Payment methods" },
    { value: "5min", label: "Average trade time" },
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

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-16 md:py-24 lg:py-32">
            <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
                <div className="text-center md:text-left">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                        Buy and sell crypto
                    </h1>
                     <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto md:mx-0">
                        Peer-to-peer lets you trade crypto directly with other people. Our escrow and dispute moderation keep every trade protected.
                    </p>
                    <div className="mt-8 max-w-md mx-auto md:mx-0">
                      <HomeSignupForm />
                    </div>
                </div>
                <div className="relative flex justify-center">
                    <BuySellForm />
                </div>
            </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-secondary/30">
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

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">How to Get Started</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Trading on TradeFlow is simple, secure, and fast. Follow these three easy steps to start your P2P journey.
                </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary p-3 rounded-full">
                              <UserPlus className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-semibold">1. Create an Account</h3>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          Sign up for free with just a User ID. Complete a simple identity verification to secure your account and start trading.
                      </p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary p-3 rounded-full">
                              <Search className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-semibold">2. Find an Offer</h3>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          Browse buy or sell ads from other users. Filter by cryptocurrency, payment method, and amount to find the perfect match.
                      </p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary p-3 rounded-full">
                              <MessageSquare className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-semibold">3. Start the Trade</h3>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          Initiate a trade and communicate with your partner via our secure chat. The seller's crypto is locked in escrow for safety.
                      </p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-4">
                          <div className="bg-primary/10 text-primary p-3 rounded-full">
                              <CheckCircle className="h-6 w-6" />
                          </div>
                          <h3 className="text-xl font-semibold">4. Complete & Receive</h3>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground">
                          Once the buyer pays and the seller confirms, the crypto is instantly released from escrow into the buyer's wallet.
                      </p>
                  </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why TradeFlow Section */}
        <section id="why-tradeflow" className="py-16 md:py-24 lg:py-32 bg-secondary/30">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Why Trade on a P2P Platform?</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    Peer-to-peer (P2P) trading offers unique advantages over traditional exchanges. Trade directly with other people, giving you more control over your price and payment methods.
                </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                <Card>
                    <CardHeader>
                        <div className="bg-primary/10 text-primary p-3 rounded-full w-max">
                            <Users className="h-8 w-8" />
                        </div>
                        <CardTitle className="mt-4">Direct Trading</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Cut out the middleman. You negotiate and trade directly with another person, which can lead to better rates and faster transactions.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="bg-primary/10 text-primary p-3 rounded-full w-max">
                            <Landmark className="h-8 w-8" />
                        </div>
                        <CardTitle className="mt-4">Global Payment Methods</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Choose from hundreds of payment methods, including local bank transfers, online wallets, and more, making it easy to trade from anywhere.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <div className="bg-primary/10 text-primary p-3 rounded-full w-max">
                            <Globe className="h-8 w-8" />
                        </div>
                        <CardTitle className="mt-4">You Are In Control</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Set your own prices, define your own terms, and choose who you trade with. P2P gives you the freedom traditional platforms can't.</p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-16 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Your Security is Our Priority</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                    We've engineered our platform with multi-layered security features to ensure every trade is protected from start to finish.
                </p>
            </div>
            <div className="grid md:grid-cols-2 gap-8 mt-12 items-start">
                <Card className="h-full">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <Lock className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold">Secure Escrow System</h3>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            When a trade starts, the seller's cryptocurrency is automatically transferred into a secure, temporary holding vault (escrow). The funds are only released to the buyer once the seller has confirmed they've received the payment. This prevents sellers from running off with the payment without sending the crypto, and protects buyers from fraudulent sellers.
                        </p>
                    </CardContent>
                </Card>
                <Card className="h-full">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/10 text-primary p-3 rounded-full">
                                <Gavel className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold">Dispute Resolution</h3>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">
                            In the rare event of a disagreement, our dedicated support team is here to help. Either party can initiate a dispute. Our moderators will carefully review the trade details, chat logs, and payment evidence to make a fair and impartial decision, ensuring the crypto is awarded to the rightful party.
                        </p>
                    </CardContent>
                </Card>
            </div>
          </div>
        </section>

        {/* Supported Crypto Section */}
        <section id="supported-crypto" className="py-16 md:py-24 lg:py-32 bg-secondary/30">
            <div className="container mx-auto px-4 md:px-6">
              <div className="text-center max-w-3xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Supported Cryptocurrencies</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                      We support a growing list of popular digital assets, with more being added regularly.
                  </p>
              </div>
              <div className="mt-12 flex justify-center items-center gap-8 md:gap-12 flex-wrap">
                {SUPPORTED_CRYPTOS.map(crypto => (
                  <div key={crypto.name} className="flex flex-col items-center gap-3">
                    <CryptoLogo crypto={crypto.name} className="h-16 w-16"/>
                    <span className="font-semibold text-lg">{crypto.name}</span>
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
