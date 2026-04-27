import { getApp, getApps, initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

export const FIREBASE_CONFIG_STORAGE_KEY = "constitution-game:firebase-config";

const envFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const requiredKeys = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];

const compactConfig = config =>
  Object.fromEntries(
    Object.entries(config ?? {}).filter(([, value]) => Boolean(value))
  );

const hasRequiredConfig = config =>
  requiredKeys.every(key => Boolean(config?.[key]));

export const getSavedFirebaseConfig = () => {
  if (typeof window === "undefined") return null;

  try {
    const saved = JSON.parse(
      window.localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY) || "null"
    );
    return saved && typeof saved === "object" ? compactConfig(saved) : null;
  } catch {
    return null;
  }
};

const savedFirebaseConfig = getSavedFirebaseConfig();
const envConfig = compactConfig(envFirebaseConfig);

export const firebaseConfig = hasRequiredConfig(savedFirebaseConfig)
  ? savedFirebaseConfig
  : envConfig;

export const firebaseConfigSource = hasRequiredConfig(savedFirebaseConfig)
  ? "browser"
  : hasRequiredConfig(envConfig)
    ? "env"
    : "none";

export const isFirebaseConfigured = hasRequiredConfig(firebaseConfig);

export const app = isFirebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;
export const database = app ? getDatabase(app) : null;
