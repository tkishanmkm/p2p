import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus, BookOpen, ShieldCheck, LifeBuoy, FileText } from "lucide-react";
import Link from "next/link";
import { mockP2PAds, mockUsers, mockFeedbacks } from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { BtcLogo, EthLogo, UsdtLogo, LtcLogo } from "@/components/icons";
import type { CryptoCurrency } from "@/lib/types";

const wallets = [
    { crypto: 'BTC' as CryptoCurrency, balance: '0.5012', value: '32,578.00' },
    { crypto: 'ETH' as CryptoCurrency, balance: '3.1500', value: '6,300.00' },
    { crypto: 'USDT' as CryptoCurrency, balance: '10,500.00', value: '10,500.00' },
];

const CryptoLogo = ({ crypto, className }: { crypto: CryptoCurrency; className?: string }) => {
    switch (crypto) {
        case 'BTC':
            return <BtcLogo className={className} />;
        case 'ETH':
            return <EthLogo className={className} />;
        case 'LTC':
            return <LtcLogo className={className} />;
        case 'USDT':
            return <UsdtLogo className={className} />;
        default:
            return null;
    }
}


export default function DashboardPage() {
    const user = mockUsers[0];

  return (
    <>
        <div className="flex flex-col gap-2 mb-6">
            <h1 className="text-2xl font-semibold md:text-3xl">Welcome back, {user.userId}!</h1>
            <p className="text-muted-foreground">
                Here's a complete overview of your P2P trading activity. You can manage your wallet, view your reputation, and stay on top of your trades.
            </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                    <span className="text-sm text-muted-foreground">USD</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">${parseFloat(user.tradeVolume).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">+5.2% from last month</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed Trades</CardTitle>
                     <span className="text-sm text-muted-foreground">Total</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{user.completedTrades}</div>
                     <p className="text-xs text-muted-foreground">+10 since last week</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Feedback Score</CardTitle>
                     <span className="text-sm text-muted-foreground">Positive</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{user.feedbackScore}%</div>
                     <Progress value={user.feedbackScore} className="h-2 mt-2" />
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
                     <span className="text-sm text-muted-foreground">My Ads</span>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{mockP2PAds.filter(ad => ad.userId === user.id).length}</div>
                    <p className="text-xs text-muted-foreground">2 Sell, 0 Buy</p>
                </CardContent>
            </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
             <Card className="xl:col-span-2">
                <CardHeader className="flex flex-row items-center">
                    <div className="grid gap-2">
                        <CardTitle>My Wallet</CardTitle>
                        <CardDescription>
                            Overview of your crypto balances.
                        </CardDescription>
                    </div>
                    <div className="ml-auto flex gap-2">
                         <Button size="sm" variant="outline"><Minus className="h-4 w-4 mr-1" /> Withdraw</Button>
                         <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Deposit</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead className="text-right">USD Value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {wallets.map(wallet => (
                                <TableRow key={wallet.crypto}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <CryptoLogo crypto={wallet.crypto} />
                                            <span className="font-medium">{wallet.crypto}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{wallet.balance}</TableCell>
                                    <TableCell className="text-right">${wallet.value}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Feedback</CardTitle>
                    <CardDescription>Feedback you have received from other traders.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    {mockFeedbacks.filter(f => f.toUser === user.id).slice(0, 3).map(feedback => (
                        <div key={feedback.id} className="flex items-start gap-4">
                            <Avatar className="hidden h-9 w-9 sm:flex">
                                <AvatarImage src="https://picsum.photos/seed/user-fb/100/100" data-ai-hint="person happy" />
                                <AvatarFallback>{feedback.fromUsername.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="grid gap-1">
                                <div className="flex items-center gap-2">
                                     <p className="text-sm font-medium leading-none">{feedback.fromUsername}</p>
                                     <Badge variant={feedback.rating === 'positive' ? 'default' : 'destructive'} className={feedback.rating === 'positive' ? 'bg-green-100 text-green-800' : ''}>
                                        {feedback.rating}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{feedback.comment}</p>
                                <p className="text-xs text-muted-foreground">{new Date(feedback.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Platform Resources</CardTitle>
                <CardDescription>Get help, read our policies, and learn more about secure trading practices.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Link href="/faq" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                    <LifeBuoy className="h-8 w-8 text-accent" />
                    <div>
                        <h3 className="font-semibold">FAQ</h3>
                        <p className="text-sm text-muted-foreground">Find answers to common questions.</p>
                    </div>
                </Link>
                 <Link href="/support" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                    <BookOpen className="h-8 w-8 text-accent" />
                    <div>
                        <h3 className="font-semibold">Guides</h3>
                        <p className="text-sm text-muted-foreground">Learn how to trade safely and effectively.</p>
                    </div>
                </Link>
                <Link href="/terms" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                    <FileText className="h-8 w-8 text-accent" />
                    <div>
                        <h3 className="font-semibold">Terms of Service</h3>
                        <p className="text-sm text-muted-foreground">Read the rules of our platform.</p>
                    </div>
                </Link>
                <Link href="/policy" className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors border">
                    <ShieldCheck className="h-8 w-8 text-accent" />
                    <div>
                        <h3 className="font-semibold">Privacy Policy</h3>
                        <p className="text-sm text-muted-foreground">How we protect your data.</p>
                    </div>
                </Link>
            </CardContent>
        </Card>
    </>
  );
}

    