// This is a new file
"use client";

import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/logo";
import { BtcLogo, EthLogo, LtcLogo, UsdtLogo } from "@/components/icons";
import { Upload } from "lucide-react";

export default function AdminAppearancePage() {
    const appLogoInputRef = useRef<HTMLInputElement>(null);
    const btcLogoInputRef = useRef<HTMLInputElement>(null);
    const ethLogoInputRef = useRef<HTMLInputElement>(null);
    const ltcLogoInputRef = useRef<HTMLInputElement>(null);
    const usdtLogoInputRef = useRef<HTMLInputElement>(null);

    // In a real application, you would have state and handlers to upload files.
    // This is a visual simulation to demonstrate the UI. The upload buttons
    // will open a file dialog, but will not actually upload or change the logos.
    // Full implementation requires a backend with file storage.

    return (
        <>
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Appearance Settings</h1>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>App Logo</CardTitle>
                    <CardDescription>Update the main logo for the application. This requires a backend with file storage to be fully functional.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-6 border rounded-lg flex items-center justify-between">
                        <div>
                            <Label>Current Logo</Label>
                            <Logo className="text-3xl mt-2" />
                        </div>
                        <div>
                            <Input type="file" ref={appLogoInputRef} className="hidden" accept="image/*" />
                            <Button variant="outline" onClick={() => appLogoInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New Logo
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Separator />

            <Card>
                <CardHeader>
                    <CardTitle>Cryptocurrency Logos</CardTitle>
                    <CardDescription>Manage the logos for each supported cryptocurrency. This is a UI demonstration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Bitcoin */}
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <BtcLogo className="h-10 w-10" />
                            <div>
                                <p className="font-semibold">Bitcoin (BTC)</p>
                                <p className="text-xs text-muted-foreground">Current Logo</p>
                            </div>
                        </div>
                        <div>
                            <Input type="file" ref={btcLogoInputRef} className="hidden" accept="image/*"/>
                            <Button variant="outline" size="sm" onClick={() => btcLogoInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New
                            </Button>
                        </div>
                    </div>

                    {/* Ethereum */}
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <EthLogo className="h-10 w-10" />
                            <div>
                                <p className="font-semibold">Ethereum (ETH)</p>
                                <p className="text-xs text-muted-foreground">Current Logo</p>
                            </div>
                        </div>
                        <div>
                             <Input type="file" ref={ethLogoInputRef} className="hidden" accept="image/*"/>
                            <Button variant="outline" size="sm" onClick={() => ethLogoInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New
                            </Button>
                        </div>
                    </div>

                    {/* Litecoin */}
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <LtcLogo className="h-10 w-10" />
                            <div>
                                <p className="font-semibold">Litecoin (LTC)</p>
                                <p className="text-xs text-muted-foreground">Current Logo</p>
                            </div>
                        </div>
                        <div>
                            <Input type="file" ref={ltcLogoInputRef} className="hidden" accept="image/*"/>
                            <Button variant="outline" size="sm" onClick={() => ltcLogoInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New
                            </Button>
                        </div>
                    </div>

                    {/* Tether */}
                    <div className="p-4 border rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <UsdtLogo className="h-10 w-10" />
                            <div>
                                <p className="font-semibold">Tether (USDT)</p>
                                <p className="text-xs text-muted-foreground">Current Logo</p>
                            </div>
                        </div>
                        <div>
                            <Input type="file" ref={usdtLogoInputRef} className="hidden" accept="image/*"/>
                            <Button variant="outline" size="sm" onClick={() => usdtLogoInputRef.current?.click()}>
                                <Upload className="mr-2 h-4 w-4" />
                                Upload New
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}
