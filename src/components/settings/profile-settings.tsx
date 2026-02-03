"use client";

import { useState, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';
// Imports for actual upload
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';


export function ProfileSettings() {
    const { user, firestore } = useFirebase();
    const { toast } = useToast();
    const [previewUrl, setPreviewUrl] = useState<string | null>(user?.photoURL || null);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToUpload(file);
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
        if (!fileToUpload || !user || !firestore) {
            toast({ variant: 'destructive', title: 'No file selected' });
            return;
        };

        setIsUploading(true);
        
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `avatars/${user.uid}/${fileToUpload.name}`);
            
            // Upload file
            const snapshot = await uploadBytes(storageRef, fileToUpload);
            const photoURL = await getDownloadURL(snapshot.ref);

            // Update auth profile
            await updateProfile(user, { photoURL });

            // Update Firestore document
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL });

            toast({ title: 'Profile Updated', description: 'Your new profile picture has been saved.' });
            setFileToUpload(null); // Reset after successful upload
        } catch (error: any) {
            console.error("Error updating profile picture:", error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
                <CardDescription>Update your avatar. This is how other users will see you.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6 text-center">
                 <Avatar className="h-32 w-32 border-4 border-secondary shadow-md">
                    <AvatarImage src={previewUrl || ''} alt="User Avatar" />
                    <AvatarFallback className="bg-white border text-muted-foreground text-4xl font-light">
                        {user?.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground">
                    For best results, upload a square image (e.g., 200x200 pixels).
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex-col sm:flex-row gap-4 justify-between items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/gif" />
                <Button variant="outline" onClick={handleUploadClick} className="w-full sm:w-auto">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose Picture
                </Button>
                <Button onClick={handleSave} disabled={!fileToUpload || isUploading} className="w-full sm:w-auto">
                    {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isUploading ? 'Saving...' : 'Save Picture'}
                </Button>
            </CardFooter>
        </Card>
    );
}
