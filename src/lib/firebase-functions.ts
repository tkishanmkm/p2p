
import { getFunctions } from 'firebase/functions';
import { initializeFirebase } from '@/firebase';

// Get a connection to the Cloud Functions emulator
// if the FIRESTORE_EMULATOR_HOST environment variable is set
const isEmulator = process.env.NEXT_PUBLIC_FUNCTIONS_EMULATOR_HOST;

function getFirebaseFunctions() {
  const { firebaseApp } = initializeFirebase();
  const functions = getFunctions(firebaseApp);
  if (isEmulator) {
    // connectFunctionsEmulator(functions, 'localhost', 5001);
  }
  return functions;
}

export const functions = getFirebaseFunctions();
export { httpsCallable } from 'firebase/functions';
