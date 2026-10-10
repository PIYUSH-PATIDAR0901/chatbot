import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, Firestore } from 'firebase-admin/firestore';
import fs from 'fs';
import { config } from '../config';

let firestoreInstance: Firestore | null = null;
let isInitialized = false;

export function getFirestore(): Firestore {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (!isInitialized) {
    initializeFirebase();
  }

  firestoreInstance = getAdminFirestore();
  return firestoreInstance;
}

export function initializeFirebase(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    isInitialized = true;
    return existingApps[0]!;
  }

  // 1. Check for Firestore Emulator host
  if (config.firebase.emulatorHost) {
    process.env.FIRESTORE_EMULATOR_HOST = config.firebase.emulatorHost;
    console.log(`[Firebase] Using Firestore Emulator at ${config.firebase.emulatorHost}`);
    const app = initializeApp({
      projectId: config.firebase.projectId || 'chat-backend-dev',
    });
    isInitialized = true;
    return app;
  }

  // 2. Check for Service Account Key JSON file
  if (config.firebase.serviceAccountKeyPath) {
    if (fs.existsSync(config.firebase.serviceAccountKeyPath)) {
      console.log(`[Firebase] Initializing with service account key file: ${config.firebase.serviceAccountKeyPath}`);
      const serviceAccount = JSON.parse(
        fs.readFileSync(config.firebase.serviceAccountKeyPath, 'utf8')
      );
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: config.firebase.projectId || serviceAccount.project_id,
      });
      isInitialized = true;
      return app;
    } else {
      console.warn(`[Firebase] Service account file not found at ${config.firebase.serviceAccountKeyPath}`);
    }
  }

  // 3. Check for inline environment variables
  if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
    console.log(`[Firebase] Initializing with environment credentials for project: ${config.firebase.projectId}`);
    const app = initializeApp({
      credential: cert({
        projectId: config.firebase.projectId,
        clientEmail: config.firebase.clientEmail,
        privateKey: config.firebase.privateKey,
      }),
    });
    isInitialized = true;
    return app;
  }

  // 4. Default / Fallback initialization
  console.log(`[Firebase] Initializing with default project: ${config.firebase.projectId || 'chat-backend-dev'}`);
  const app = initializeApp({
    projectId: config.firebase.projectId || 'chat-backend-dev',
  });
  isInitialized = true;
  return app;
}

export { getAdminFirestore };
