import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import appletConfigFile from "../../firebase-applet-config.json";

// Interface for Firebase client web configuration
interface FirebaseAppletConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

const fileConfig: FirebaseAppletConfig = (appletConfigFile as FirebaseAppletConfig) || {};

/**
 * Validates whether an API key conforms to real Firebase Web API key formats (AIzaSy...).
 * Specifically rejects dummy values like "1", "TODO", placeholders, or short strings.
 */
export function isValidApiKey(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.startsWith('AIza') && trimmed.length >= 25 && !trimmed.includes(' ');
}

/**
 * Validates auth domain (e.g., project-id.firebaseapp.com).
 */
export function isValidAuthDomain(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.includes('.') && trimmed.length >= 5 && !/^[0-9]+$/.test(trimmed);
}

/**
 * Validates Google Cloud / Firebase project ID.
 */
export function isValidProjectId(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return /^[a-z0-9][a-z0-9-]{3,60}$/.test(trimmed) && !/^[0-9]+$/.test(trimmed);
}

/**
 * Validates Firebase App ID (1:project-number:web:hash).
 */
export function isValidAppId(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return (trimmed.startsWith('1:') && trimmed.includes(':web:')) || (trimmed.includes(':') && trimmed.length >= 15);
}

/**
 * Validates storage bucket.
 */
export function isValidStorageBucket(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.includes('.') && trimmed.length >= 5 && !/^[0-9]+$/.test(trimmed);
}

/**
 * Validates numeric messaging sender ID.
 */
export function isValidMessagingSenderId(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return /^[0-9]{6,20}$/.test(trimmed);
}

/**
 * Generic validator rejecting placeholders, single numbers, and empty values.
 */
export function isValidGeneric(val: unknown): val is string {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.length < 3) return false;
  const upper = trimmed.toUpperCase();
  if (
    upper === 'TODO' ||
    upper === 'YOUR_API_KEY' ||
    upper === 'YOUR_AUTH_DOMAIN' ||
    upper === 'YOUR_PROJECT_ID' ||
    upper === 'YOUR_APP_ID' ||
    upper === 'YOUR_STORAGE_BUCKET' ||
    upper === 'YOUR_MESSAGING_SENDER_ID' ||
    upper.startsWith('YOUR_') ||
    upper.startsWith('<') ||
    upper.endsWith('>') ||
    upper === 'UNDEFINED' ||
    upper === 'NULL' ||
    upper === 'CHANGE_ME' ||
    upper === 'REPLACE_ME' ||
    /^[0-9]$/.test(trimmed)
  ) {
    return false;
  }
  return true;
}

export function isValidConfigValue(val: unknown): val is string {
  return isValidGeneric(val);
}

/**
 * Resolves configuration values in precedence order:
 * 1. import.meta.env.VITE_FIREBASE_* if present and passes strict validator
 * 2. firebase-applet-config.json fallback
 * Never accepts dummy values like "1" or placeholders.
 */
function resolveConfigValue(
  envVal: unknown,
  fileVal: unknown,
  validator?: (val: unknown) => boolean
): string {
  if (validator) {
    if (validator(envVal)) return (envVal as string).trim();
    if (validator(fileVal)) return (fileVal as string).trim();
  }
  if (isValidGeneric(envVal)) return (envVal as string).trim();
  if (isValidGeneric(fileVal)) return (fileVal as string).trim();
  return '';
}

const env = (import.meta as any).env || {};

// Resolve configuration parameters with field-specific verification
const apiKey = resolveConfigValue(env.VITE_FIREBASE_API_KEY, fileConfig.apiKey, isValidApiKey);
const authDomain = resolveConfigValue(env.VITE_FIREBASE_AUTH_DOMAIN, fileConfig.authDomain, isValidAuthDomain);
const projectId = resolveConfigValue(env.VITE_FIREBASE_PROJECT_ID, fileConfig.projectId, isValidProjectId);
const appId = resolveConfigValue(env.VITE_FIREBASE_APP_ID, fileConfig.appId, isValidAppId);
const storageBucket = resolveConfigValue(env.VITE_FIREBASE_STORAGE_BUCKET, fileConfig.storageBucket, isValidStorageBucket);
const messagingSenderId = resolveConfigValue(env.VITE_FIREBASE_MESSAGING_SENDER_ID, fileConfig.messagingSenderId, isValidMessagingSenderId);
const measurementId = resolveConfigValue(env.VITE_FIREBASE_MEASUREMENT_ID, fileConfig.measurementId, isValidGeneric);
const firestoreDatabaseId = resolveConfigValue(env.VITE_FIREBASE_DATABASE_ID, fileConfig.firestoreDatabaseId, (v) => isValidGeneric(v) || v === '(default)');

// Required fields startup validation
const missingFields: string[] = [];
if (!isValidApiKey(apiKey)) missingFields.push('apiKey');
if (!isValidAuthDomain(authDomain)) missingFields.push('authDomain');
if (!isValidProjectId(projectId)) missingFields.push('projectId');
if (!isValidAppId(appId)) missingFields.push('appId');

export const firebaseConfigMissingFields: string[] = missingFields;
export const firebaseConfigError: string | null = missingFields.length > 0
  ? `Firebase config missing: ${missingFields.join(', ')}`
  : null;

// Console checks adhering strictly to privacy:
// Log only projectId and authDomain; NEVER print apiKey to console
if (missingFields.length > 0) {
  console.error(`Firebase config missing: ${missingFields.join(', ')}`);
  console.log('Firebase startup check (partial config):', {
    projectId: projectId || '(missing)',
    authDomain: authDomain || '(missing)'
  });
} else {
  console.log('Firebase startup check (loaded successfully):', {
    projectId,
    authDomain
  });
}

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
  ...(measurementId ? { measurementId } : {})
};

// Initialize Firebase App, Firestore, and Auth
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (missingFields.length === 0) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    // Connect to named Firestore database if firestoreDatabaseId is provided
    dbInstance = firestoreDatabaseId && firestoreDatabaseId !== '(default)'
      ? getFirestore(appInstance, firestoreDatabaseId)
      : getFirestore(appInstance);
    authInstance = getAuth(appInstance);
  } catch (err) {
    console.error('Firebase initialization error:', err);
  }
}

// Fallback stubs preventing uncaught runtime crashes prior to error banner rendering
export const app: FirebaseApp = (appInstance || {}) as FirebaseApp;
export const db: Firestore = (dbInstance || {}) as Firestore;
export const auth: Auth = (authInstance || {
  currentUser: null,
  onAuthStateChanged: () => () => {},
  signOut: async () => {}
}) as unknown as Auth;

export { firestoreDatabaseId };

// Firestore Error Handler as specified in our Security rules skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
