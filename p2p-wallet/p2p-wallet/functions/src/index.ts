import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

export const backendStatus = onRequest((req, res) => {
  res.status(200).send("Wallet backend running 🚀");
});