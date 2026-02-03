"use client";

import { useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

export function ProfileSettings() {
    const { user } = useFirebase();
    const { toast } = useToast();
    const [previewUrl, setPreviewUrl] = useState<string | null>(user?.photoURL || null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async () => {
        setIsUploading(true);
        // In a real app, this would upload the file to Firebase Storage
        // and then call `updateProfile` on the user object.
        // We will simulate this process.
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // In a real implementation:
        // const file = fileInputRef.current?.files?.[0];
        // if (!file || !user) return;
        // const storageRef = ref(storage, `avatars/${user.uid}`);
        // await uploadBytes(storageRef, file);
        // const photoURL = await getDownloadURL(storageRef);
        // await updateProfile(user, { photoURL });
        
        toast({ title: 'Profile Updated', description: 'Your new profile picture has been saved.' });
        setIsUploading(false);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update your avatar. This is how other users will see you.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 text-center">
                 <Avatar className="h-32 w-32 border-4 border-secondary shadow-md">
                    <AvatarImage src={previewUrl || user?.photoURL || ''} alt="User Avatar" />
                    <AvatarFallback className="bg-white border text-muted-foreground text-4xl font-light">
                        {user?.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <Input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-xs">
                    <Button variant="outline" onClick={handleUploadClick} className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Picture
                    </Button>
                    <Button onClick={handleSave} disabled={!previewUrl || isUploading} className="w-full">
                        {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUploading ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

    