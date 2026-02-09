
"use client";

import { useState, useRef, useEffect } from "react";
import { useFirebase } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import type { User } from "@/lib/types";

export function ProfileSettings({ user }: { user: User }) {
  const { auth, firestore, firebaseApp } = useFirebase();
  const { toast } = useToast();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.photoURL) {
      setPreviewUrl(user.photoURL);
    }
  }, [user?.photoURL]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Max size is 2MB",
      });
      return;
    }

    setFileToUpload(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!fileToUpload || !auth?.currentUser || !firestore || !firebaseApp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User not authenticated",
      });
      return;
    }

    try {
      setIsUploading(true);

      const uid = auth.currentUser.uid;
      const storage = getStorage(firebaseApp);

      const storageRef = ref(storage, `avatars/${uid}/avatar.jpg`);

      // 🔥 Upload
      await uploadBytes(storageRef, fileToUpload);

      // 🔥 Get URL
      const photoURL = await getDownloadURL(storageRef);

      // 🔥 Update Auth
      await updateProfile(auth.currentUser, { photoURL });

      // 🔥 Update Firestore
      await updateDoc(doc(firestore, "users", uid), {
        photoURL,
        updatedAt: new Date(),
      });

      toast({
        title: "Profile Updated",
        description: "Profile picture saved successfully",
      });

      setFileToUpload(null);
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Could not save profile picture",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
        <CardDescription>
          This is how other users will see you
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-6">
        <Avatar className="h-32 w-32 border">
          <AvatarImage src={previewUrl ?? ""} />
          <AvatarFallback>
            {user?.userId?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <input
          type="file"
          ref={fileInputRef}
          hidden
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
        />
      </CardContent>

      <CardFooter className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          Choose
        </Button>

        <Button onClick={handleSave} disabled={!fileToUpload || isUploading}>
          {isUploading && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save
        </Button>
      </CardFooter>
    </Card>
  );
}
