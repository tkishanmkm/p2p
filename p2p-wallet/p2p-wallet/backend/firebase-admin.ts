
import admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        const serviceAccount = {
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        };

        if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
            console.warn('Firebase Admin SDK configuration is missing in environment variables. Server-side features may not work.');
        } else {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    } catch (error) {
        console.error('Firebase Admin SDK initialization error:', error);
    }
}

export const firestore = admin.apps.length ? admin.firestore() : {} as admin.firestore.Firestore;
export const auth = admin.apps.length ? admin.auth() : {} as admin.auth.Auth;
