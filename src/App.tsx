import React, { Suspense, lazy } from 'react';
import { CuvioProvider, useCuvio } from './context/CuvioContext';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import Welcome from './components/Welcome';
import RoleSwitcher from './components/RoleSwitcher';
import WaitingForApproval from './components/WaitingForApproval';
import { auth, firebaseConfigError } from './lib/firebase';

// Lazy load dashboard components with Suspense to keep login bundle tiny and fast
const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AmbulanceDriverPanel = lazy(() => import('./components/AmbulanceDriverPanel'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#0B5A4B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function FirebaseConfigErrorScreen({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-white border border-rose-200 rounded-[32px] p-8 shadow-xl text-center">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-2xl border border-rose-100">
          !
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight font-display mb-2">
          Configuration Error
        </h2>
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 mb-5 text-rose-800 text-sm font-semibold">
          {error}
        </div>
        <p className="text-xs text-slate-500 mb-3 text-left">
          Please add the required Firebase environment variables in your Vercel Project Settings &gt; Environment Variables:
        </p>
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left font-mono text-xs text-slate-700 space-y-1.5">
          <div>VITE_FIREBASE_API_KEY</div>
          <div>VITE_FIREBASE_AUTH_DOMAIN</div>
          <div>VITE_FIREBASE_PROJECT_ID</div>
          <div>VITE_FIREBASE_STORAGE_BUCKET</div>
          <div>VITE_FIREBASE_MESSAGING_SENDER_ID</div>
          <div>VITE_FIREBASE_APP_ID</div>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { currentScreen, role, user } = useCuvio();

  const isPublicScreen = currentScreen === 'splash' || currentScreen === 'onboarding' || currentScreen === 'login';
  const isLoggedIn = Boolean(user || auth.currentUser);

  // Unauthenticated users trying to access protected screens are redirected to login
  const activeScreen = (!isLoggedIn && !isPublicScreen) ? 'login' : currentScreen;

  if (activeScreen === 'splash') {
    return <Splash />;
  }

  if (activeScreen === 'onboarding') {
    return <Onboarding />;
  }

  if (activeScreen === 'login') {
    return <Welcome />;
  }

  // Check if hospital or ambulance account is pending administrative approval
  const isPendingApproval = user && user.approved === false && (
    role === 'hospital' || role === 'ambulance' || role === 'admin' || role === 'driver' ||
    (user as any).role === 'hospital' || (user as any).role === 'ambulance'
  );

  if (isPendingApproval) {
    return <WaitingForApproval />;
  }

  return (
    <div className="min-h-screen relative bg-slate-50 text-slate-800">
      <Suspense fallback={<LoadingSpinner />}>
        {role === 'hospital' || role === 'admin' ? (
          <AdminPanel />
        ) : role === 'ambulance' || role === 'driver' ? (
          <AmbulanceDriverPanel />
        ) : (
          <PatientDashboard />
        )}
      </Suspense>
      <RoleSwitcher />
    </div>
  );
}

export default function App() {
  if (firebaseConfigError) {
    return <FirebaseConfigErrorScreen error={firebaseConfigError} />;
  }

  return (
    <CuvioProvider>
      <AppContent />
    </CuvioProvider>
  );
}
