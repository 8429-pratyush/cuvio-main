import React, { Suspense, lazy } from 'react';
import { CuvioProvider, useCuvio } from './context/CuvioContext';
import Splash from './components/Splash';
import Onboarding from './components/Onboarding';
import Welcome from './components/Welcome';
import PortalGateLanding from './components/PortalGateLanding';
import RoleSwitcher from './components/RoleSwitcher';
import WaitingForApproval from './components/WaitingForApproval';
import { auth, firebaseConfigError } from './lib/firebase';
import { Bell, X, Building2, Users, Ambulance, ArrowLeft } from 'lucide-react';

// Lazy load dashboard components with Suspense to keep login bundle tiny and fast
const PatientDashboard = lazy(() => import('./components/PatientDashboard'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const AmbulanceDriverPanel = lazy(() => import('./components/AmbulanceDriverPanel'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-[#F2F8F7] flex items-center justify-center">
      <div className="w-9 h-9 border-3 border-[#0F8B8D] border-t-transparent rounded-full animate-spin" />
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
  const { 
    currentScreen, 
    role, 
    setRole,
    user, 
    isProfileLoading, 
    portal, 
    setPortal, 
    setScreen, 
    liveAlert, 
    dismissLiveAlert 
  } = useCuvio();

  if (isProfileLoading) {
    return <LoadingSpinner />;
  }

  // 1. Initial Splash or Onboarding
  if (currentScreen === 'splash') {
    return <Splash />;
  }

  if (currentScreen === 'onboarding') {
    return <Onboarding />;
  }

  // 2. Gateway Landing Page (matches Cuvio – Don't wait in line and cuvio-app.html #gate)
  if (portal === 'gateway') {
    return (
      <div className="min-h-screen relative">
        <PortalGateLanding />
        <RoleSwitcher />
        
        {/* Floating Live Realtime Alert Toast */}
        {liveAlert && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0E2A33] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center gap-3 animate-bounce max-w-[90vw]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{liveAlert}</span>
            <button 
              onClick={dismissLiveAlert} 
              className="text-xs bg-white/20 hover:bg-white/30 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // 3. User Authentication Check for Specific Portals
  const isLoggedIn = Boolean(user || auth.currentUser);

  if (currentScreen === 'login' || !isLoggedIn) {
    return (
      <div className="min-h-screen relative">
        <Welcome />
        
        {/* Floating Live Realtime Alert Toast */}
        {liveAlert && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0E2A33] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center gap-3 animate-bounce max-w-[90vw]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-xs sm:text-sm font-semibold">{liveAlert}</span>
            <button 
              onClick={dismissLiveAlert} 
              className="text-xs bg-white/20 hover:bg-white/30 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. Pending Approval Screen
  const isPendingApproval = user && user.approved === false && (
    role === 'hospital' || role === 'ambulance' || role === 'admin' || role === 'driver' ||
    (user as any).role === 'hospital' || (user as any).role === 'ambulance'
  );

  if (isPendingApproval) {
    return <WaitingForApproval />;
  }

  // 5. Active Portal Display with Live Cross-Portal Top Bar
  return (
    <div className={`min-h-screen relative ${portal === 'hospital' ? 'body-hosp bg-[#0A1022] text-[#E7ECFF]' : 'bg-[#F2F8F7] text-slate-800'}`}>
      {/* Top Cross-Portal Bar */}
      <div className={`border-b py-2 px-4 sm:px-6 flex items-center justify-between text-xs sticky top-0 z-40 backdrop-blur-md ${
        portal === 'hospital'
          ? 'bg-[#121B38]/95 border-[#243059] text-[#9AA7D1]'
          : 'bg-white/95 border-[#CBDDDB]/60 text-[#48646C]'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPortal('gateway');
              setScreen('dashboard');
            }}
            className="flex items-center gap-1 font-bold text-[#0F8B8D] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Portals Gateway</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Portal: <b className="capitalize text-slate-900">{portal}</b>
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {portal === 'patient' ? (
            <button
              onClick={() => {
                setPortal('hospital');
                setRole('hospital');
              }}
              className="px-3 py-1 rounded-full bg-[#16224f] text-[#E7ECFF] hover:bg-[#20306e] font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 border border-[#3552C8]/50"
            >
              <Building2 className="w-3 h-3" />
              <span>Switch to Hospital Portal</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setPortal('patient');
                setRole('patient');
              }}
              className="px-3 py-1 rounded-full bg-[#0F8B8D] text-white hover:bg-[#0c7072] font-semibold text-[11px] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3 h-3" />
              <span>Switch to Patient Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Suspended Portal Components */}
      <Suspense fallback={<LoadingSpinner />}>
        {portal === 'hospital' || role === 'hospital' || role === 'admin' ? (
          <AdminPanel />
        ) : portal === 'ambulance' || role === 'ambulance' || role === 'driver' ? (
          <AmbulanceDriverPanel />
        ) : (
          <PatientDashboard />
        )}
      </Suspense>

      <RoleSwitcher />

      {/* Floating Live Realtime Alert Toast */}
      {liveAlert && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0E2A33] text-white px-5 py-3 rounded-2xl shadow-2xl border border-teal-500/50 flex items-center gap-3 animate-bounce max-w-[90vw]">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{liveAlert}</span>
          <button 
            onClick={dismissLiveAlert} 
            className="text-xs bg-white/20 hover:bg-white/30 text-white w-5 h-5 rounded-full flex items-center justify-center font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
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
