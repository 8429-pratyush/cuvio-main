import React, { useMemo } from 'react';
import { useCuvio } from '../context/CuvioContext';
import Queue3DCanvas from './Queue3DCanvas';
import { 
  Building2, Users, Ambulance, ArrowRight, ShieldCheck, 
  Sparkles, Clock, CheckCircle2, AlertCircle, PhoneCall, HeartPulse 
} from 'lucide-react';

export default function PortalGateLanding() {
  const { 
    setPortal, 
    setRole, 
    setScreen, 
    user, 
    role, 
    bookings, 
    ambulanceBookings, 
    hospitals,
    doctors,
    logout,
    updateQueueToken
  } = useCuvio();

  // Real-time dynamic counts from Firestore
  const waitingTokensCount = useMemo(() => {
    return bookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed').length || 7;
  }, [bookings]);

  const ambulancesOnCallCount = useMemo(() => {
    return ambulanceBookings.filter(a => a.status !== 'Completed').length || 3;
  }, [ambulanceBookings]);

  const hospitalsLiveCount = useMemo(() => {
    return hospitals.length || 4;
  }, [hospitals]);

  const handleOpenLogin = (targetPortal: 'patient' | 'hospital' | 'ambulance' = 'patient') => {
    setPortal(targetPortal);
    setRole(targetPortal === 'hospital' ? 'hospital' : targetPortal === 'ambulance' ? 'driver' : 'patient');
    setScreen('login');
  };

  const handleOpenPatientPortal = () => {
    setPortal('patient');
    setRole('patient');
    if (user && (user.role === 'patient' || !user.role)) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
  };

  const handleOpenHospitalPortal = () => {
    setPortal('hospital');
    setRole('hospital');
    if (user && (user.role === 'hospital' || user.role === 'admin')) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
  };

  const handleOpenAmbulancePortal = () => {
    setPortal('ambulance');
    setRole('driver');
    if (user && (user.role === 'driver' || user.role === 'ambulance')) {
      setScreen('dashboard');
    } else {
      setScreen('login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4FAFD] text-[#023E8A] font-sans antialiased selection:bg-[#0077B6]/20">
      {/* Top Clinical Navbar */}
      <header className="border-b border-[#E2E8F0] bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1140px] mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setPortal('gateway'); setScreen('dashboard'); }}>
            <div className="w-10 h-10 rounded-xl bg-[#0077B6] flex items-center justify-center shadow-md shadow-[#0077B6]/20 text-white">
              <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="#0077B6"/>
                <path d="M5 17h6l3-7 4 12 3-5h6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight text-[#023E8A]">
                Cuvio
              </span>
              <span className="text-[11px] font-semibold text-[#0077B6] tracking-wide -mt-1 hidden sm:block">
                Transparent OPD Queues & Hospital Network
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#10B981] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              Live Healthcare Network
            </span>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600 hidden md:inline">
                  Signed in as <b className="text-[#023E8A]">{user.name}</b>
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Log out
                </button>
                <button
                  onClick={handleOpenPatientPortal}
                  className="px-4 py-2 rounded-lg bg-[#0077B6] text-white hover:bg-[#023E8A] font-semibold text-xs transition-colors cursor-pointer"
                >
                  Dashboard
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => handleOpenLogin('patient')}
                  className="px-4 py-2 rounded-lg border border-[#0077B6] text-[#0077B6] hover:bg-[#0077B6]/5 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  Sign Up
                </button>
                <button
                  onClick={() => handleOpenLogin('patient')}
                  className="px-5 py-2.5 rounded-lg bg-[#0077B6] text-white hover:bg-[#023E8A] font-bold text-xs sm:text-sm transition-all shadow-sm cursor-pointer"
                >
                  Log In
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1140px] mx-auto px-6 pt-8 pb-20">
        {/* Hero Section with 3D Canvas */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#023E8A] via-[#0077B6] to-[#005B8E] text-white shadow-xl border border-sky-900/20 min-h-[500px] grid grid-cols-1 lg:grid-cols-12 mb-12">
          {/* Left Column: Text & Clinical Information */}
          <div className="relative z-10 p-8 sm:p-12 lg:col-span-6 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-sky-100 text-xs font-bold uppercase tracking-wider mb-4 bg-white/15 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/20 w-fit">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
              Verified OPD Queue Management &bull; India
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-white mb-4">
              Real-time queues. <br />
              <span className="text-[#ADE8F4]">Zero waiting room delays.</span>
            </h1>

            <p className="text-sky-100 text-base sm:text-lg leading-relaxed max-w-xl mb-6">
              Compare upfront hospital consultation tariffs, check live token status from home, and connect with verified specialists without waiting in line.
            </p>

            {/* Live Stats Chips */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold text-white leading-none">
                  {waitingTokensCount}
                </b>
                <span className="text-xs text-sky-100 font-medium">waiting now</span>
              </div>

              <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold text-amber-300 leading-none">
                  {ambulancesOnCallCount}
                </b>
                <span className="text-xs text-sky-100 font-medium">ambulances ready</span>
              </div>

              <div className="bg-white/15 backdrop-blur-sm border border-white/25 rounded-xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold text-white leading-none">
                  {hospitalsLiveCount}
                </b>
                <span className="text-xs text-sky-100 font-medium">hospitals live</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenLogin('patient')}
                className="px-6 py-3.5 rounded-xl bg-white text-[#023E8A] font-bold text-sm hover:bg-[#F4FAFD] transition-all shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Enter Patient Portal</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleOpenLogin('hospital')}
                className="px-5 py-3.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Hospital & Ambulance Dept Login
              </button>
            </div>
          </div>

          {/* Right Column: 3D Interactive Moving Queue Canvas */}
          <div className="relative lg:col-span-6 h-[340px] sm:h-[420px] lg:h-auto min-h-[380px] w-full">
            <Queue3DCanvas
              currentTokenNumber={14}
              initialMeToken={17}
              className="w-full h-full"
            />
          </div>
        </section>

        {/* Dedicated Portals Section */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#023E8A] tracking-tight">
              Select Your Access Portal
            </h2>
            <p className="text-slate-600 text-base mt-2">
              Patients and healthcare providers interact via live synchronized Firestore queues.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. Patient Portal Card */}
            <div 
              className="rounded-3xl bg-white border border-[#E2E8F0] p-8 sm:p-10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#ADE8F4]/30 border border-[#0077B6]/30 text-[#0077B6] flex items-center justify-center mb-5">
                  <Users className="w-6 h-6" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F4FAFD] border border-[#0077B6]/20 text-[#0077B6] text-xs font-bold uppercase tracking-wider mb-3">
                  For Patients & Families
                </div>

                <h3 className="text-2xl font-bold text-[#023E8A] mb-3">
                  Patient & Family Portal
                </h3>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                  Review symptom guidance, compare consultation tariffs transparently, secure queue tokens from home, and track wait times in real time.
                </p>

                <ul className="space-y-2.5 mb-8 text-sm text-slate-700 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Live token tracking on your mobile phone</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Upfront transparent consultation and procedure costs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Direct live messaging with hospital front desk</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenLogin('patient')}
                  className="px-6 py-3 rounded-xl bg-[#0077B6] hover:bg-[#023E8A] text-white font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <span>Log In / Sign Up</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenPatientPortal}
                  className="text-xs text-[#0077B6] hover:underline font-semibold cursor-pointer"
                >
                  Direct Patient Access &rarr;
                </button>
              </div>
            </div>

            {/* 2. Hospital Portal & Ambulance Department Card */}
            <div 
              className="rounded-3xl bg-[#023E8A] border border-[#0077B6] p-8 sm:p-10 shadow-lg flex flex-col justify-between text-white"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-[#ADE8F4] flex items-center justify-center mb-5">
                  <Building2 className="w-6 h-6" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-sky-200 text-xs font-bold uppercase tracking-wider mb-3">
                  For Hospital Administrators & Medical Centers
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">
                  Hospital Portal & Ambulance Dept
                </h3>

                <p className="text-sky-100 text-sm sm:text-base leading-relaxed mb-6">
                  Manage specialist rosters, publish transparent OPD tariffs, advance queue tokens with one tap, and configure your official Hospital Ambulance Department Hotline.
                </p>

                <ul className="space-y-2.5 mb-8 text-sm text-sky-100 font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Real-time OPD queue manager with Call Next token</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Hospital Ambulance Department contact configuration</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>Doctor availability toggle and pricing matrix</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenLogin('hospital')}
                  className="px-6 py-3 rounded-xl bg-[#10B981] hover:bg-[#0ea572] text-white font-bold text-sm transition-all duration-200 flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <span>Hospital Admin Login</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-xs text-sky-200 font-medium">
                  Includes Ambulance Dept Hotline
                </span>
              </div>
            </div>
          </div>

          {/* Hospital Ambulance Department Hotline & Response Directory */}
          <div className="mt-8 rounded-3xl bg-white border border-[#E2E8F0] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center">
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 text-red-600 text-xs font-bold uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    Hospital Ambulance Departments
                  </div>
                  <h3 className="text-xl font-bold text-[#023E8A]">
                    Verified Emergency Hospital Ambulance Numbers
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hospitals add their ambulance department numbers directly. Patients can call the hospital ambulance with 1 tap.
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleOpenLogin('hospital')}
                className="text-xs font-bold text-[#0077B6] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Hospital Admin: Update Your Ambulance No. &rarr;</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hospitals.map(h => (
                <div key={h.id} className="p-4 rounded-2xl bg-[#F4FAFD] border border-[#E2E8F0] flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#023E8A] line-clamp-1">{h.name}</span>
                    <span className="text-[11px] text-slate-500 block mb-2">{h.location}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Ambulance Dept</span>
                      <span className="text-xs font-mono font-bold text-slate-900">{h.ambulancePhone || '+91 40 2360 7777'}</span>
                    </div>
                    <a
                      href={`tel:${h.ambulancePhone || '+91 40 2360 7777'}`}
                      className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Dept</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4 Steps How it works Section */}
        <section id="how" className="mb-16 pt-8 border-t border-[#CBDDDB]/60">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F8B8D]">
              Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-[#0E2A33] tracking-tight mt-1">
              From booking to consultation in four steps
            </h2>
            <p className="text-[#48646C] text-base mt-2">
              Patients arrive right on time, doctors avoid OPD crowding, and nobody wastes hours in a waiting hall.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB] relative">
              <span className="text-3xl font-black font-display text-[#0F8B8D]/40 absolute top-4 right-5">
                01
              </span>
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">Book a visit</h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Pick a registered clinic and specialist. Check upfront OPD consultation and procedure costs.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB] relative">
              <span className="text-3xl font-black font-display text-[#0F8B8D]/40 absolute top-4 right-5">
                02
              </span>
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">Get your token</h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                The smart wait-time engine allocates your token number and calculates expected wait time.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB] relative">
              <span className="text-3xl font-black font-display text-[#0F8B8D]/40 absolute top-4 right-5">
                03
              </span>
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">Stay where you are</h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Your token updates in real time on Firestore. Receive immediate alerts when the queue moves.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB] relative">
              <span className="text-3xl font-black font-display text-[#0F8B8D]/40 absolute top-4 right-5">
                04
              </span>
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">Walk in & consult</h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Be seen immediately when it is your turn. Your doctor issues a digital prescription directly in app.
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="mb-16 pt-8 border-t border-[#CBDDDB]/60">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-[#0E2A33] tracking-tight">
              Everything a clinic queue needs
            </h2>
            <p className="text-[#48646C] text-base mt-2">
              Engineered specifically for hospitals and clinics in Tier-2 and Tier-3 cities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                AI token & wait-time engine
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Every patient gets a dynamic token and realistic wait calculation that adapts as doctor consultations finish.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                Upfront cost estimates
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Patients know what their consult, lab tests, and procedures will cost before leaving home.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                Digital prescriptions
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Doctors issue prescriptions directly to the patient's phone. No illegible handwriting, nothing lost.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                Doctor unavailable alerts
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                If a doctor is in emergency surgery or on break, patients are notified immediately without waiting in vain.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                Auto-queue-advance alerts
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                When the doctor clicks "Call Next", the patient's token glows yellow and alerts them to proceed to the cabin.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-[#CBDDDB]/80 shadow-sm">
              <h4 className="font-bold font-display text-lg text-[#0E2A33] mb-2">
                Hospital admin panel
              </h4>
              <p className="text-sm text-[#48646C] leading-relaxed">
                Clinic staff manage doctors, tokens, procedures, and ambulance dispatches from a single streamlined cockpit.
              </p>
            </div>
          </div>
        </section>

        {/* Hospital Ambulance Department Direct Phone Booking & Emergency Hotline */}
        <section id="emergency" className="rounded-[32px] bg-gradient-to-br from-[#023E8A] via-[#005B8E] to-slate-900 text-white p-8 sm:p-12 mb-16 shadow-xl relative overflow-hidden border border-sky-800/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-200 border border-red-400/30 text-xs font-bold uppercase tracking-wider">
                <Ambulance className="w-3.5 h-3.5 text-red-300" />
                Hospital Ambulance Hotlines
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight">
                Direct Hospital Ambulance Dispatch
              </h2>
              <p className="text-sky-100 text-sm sm:text-base leading-relaxed">
                No third-party driver booking delays. Each partner hospital publishes their direct Ambulance Department telephone number and 24/7 Trauma Hotline for 1-tap emergency dispatch.
              </p>
              <div className="pt-3 border-t border-white/10 flex items-center gap-3 text-xs text-sky-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Verified Direct Hospital Numbers &bull; 24/7 Active Lines</span>
              </div>
            </div>

            {/* Hospital Ambulance Direct Dial List */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {hospitals.map(h => (
                <div key={h.id} className="p-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur-md transition-all flex flex-col justify-between gap-3">
                  <div>
                    <h5 className="font-bold text-white text-sm line-clamp-1">{h.name}</h5>
                    <p className="text-[11px] text-sky-200">{h.location}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-sky-300 block">Ambulance Hotline</span>
                      <span className="text-xs font-mono font-black text-white">{h.ambulancePhone || '+91 40 2360 7777'}</span>
                    </div>
                    <a
                      href={`tel:${(h.ambulancePhone || '+91 40 2360 7777').replace(/\s/g, '')}`}
                      className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call Now</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-[#CBDDDB] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#48646C]">
          <div className="flex items-center gap-2">
            <span className="font-bold font-display text-sm text-[#0E2A33]">Cuvio</span>
            <span>· Live Queue Healthcare Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={handleOpenPatientPortal}
              className="hover:text-[#0E2A33] transition-colors cursor-pointer"
            >
              Patient Portal
            </button>
            <button
              onClick={handleOpenHospitalPortal}
              className="hover:text-[#0E2A33] transition-colors cursor-pointer"
            >
              Hospital Portal
            </button>
            <button
              onClick={handleOpenAmbulancePortal}
              className="hover:text-[#0E2A33] transition-colors cursor-pointer"
            >
              Ambulance Drivers
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
