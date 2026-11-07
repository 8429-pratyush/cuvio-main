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
    <div className="min-h-screen bg-[#F2F8F7] text-[#0E2A33] font-sans antialiased selection:bg-[#0F8B8D]/20">
      {/* Top Navbar */}
      <header className="border-b border-[#CBDDDB]/60 bg-[#F2F8F7]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1120px] mx-auto px-6 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0F8B8D] flex items-center justify-center shadow-md shadow-[#0F8B8D]/25 text-white">
              <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
                <rect width="32" height="32" rx="9" fill="#0F8B8D"/>
                <path d="M5 17h6l3-7 4 12 3-5h6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight font-display text-[#0E2A33]">
                Cuvio
              </span>
              <span className="text-[11px] font-semibold text-[#48646C] tracking-wide -mt-1 hidden sm:block">
                Don't wait in line
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync Active
            </span>

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#48646C] hidden md:inline">
                  Signed in as <b className="text-[#0E2A33]">{user.name}</b>
                </span>
                <button
                  onClick={logout}
                  className="text-xs font-semibold text-[#0B6B6D] hover:underline cursor-pointer"
                >
                  Log out
                </button>
              </div>
            ) : null}

            <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#48646C]">
              <a href="#hospitals" className="hover:text-[#0E2A33] transition-colors">Hospitals</a>
              <a href="#how" className="hover:text-[#0E2A33] transition-colors">How it works</a>
              <a href="#features" className="hover:text-[#0E2A33] transition-colors">Features</a>
              <a href="#emergency" className="hover:text-[#0E2A33] transition-colors">Ambulance</a>
            </nav>

            <button
              onClick={handleOpenPatientPortal}
              className="px-5 py-2.5 rounded-full bg-[#0E2A33] text-[#F2F8F7] hover:bg-[#143B48] font-semibold text-sm transition-all shadow-sm cursor-pointer"
            >
              Open App
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1120px] mx-auto px-6 pt-8 pb-20">
        {/* Hero Section with 3D Canvas */}
        <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-[#14606a] via-[#0A2D36] to-[#051317] text-white shadow-2xl border border-teal-900/40 min-h-[540px] grid grid-cols-1 lg:grid-cols-12 mb-12">
          {/* Left Column: Text & Stats */}
          <div className="relative z-10 p-8 sm:p-12 lg:col-span-6 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-teal-300 text-xs font-semibold uppercase tracking-wider mb-4 bg-teal-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-teal-800/60 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Live Healthcare Network · India
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight font-display leading-[1.08] text-white mb-4">
              Don’t wait in line. <br />
              <span className="text-teal-300">Wait anywhere else.</span>
            </h1>

            <p className="text-teal-100/90 text-base sm:text-lg leading-relaxed max-w-xl mb-6">
              Describe your symptoms, find the right doctor and hospital, see costs upfront, then track your token live on your phone. Emergency ambulance dispatch included.
            </p>

            {/* Live Stats Chips */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold font-display text-white leading-none">
                  {waitingTokensCount}
                </b>
                <span className="text-xs text-teal-200 font-medium">waiting now</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold font-display text-amber-300 leading-none">
                  {ambulancesOnCallCount}
                </b>
                <span className="text-xs text-teal-200 font-medium">ambulances on call</span>
              </div>

              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 min-w-[110px]">
                <b className="block text-2xl sm:text-3xl font-extrabold font-display text-white leading-none">
                  {hospitalsLiveCount}
                </b>
                <span className="text-xs text-teal-200 font-medium">hospitals live</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenPatientPortal}
                className="px-6 py-3.5 rounded-full bg-white text-[#0A2D36] font-bold text-sm hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl cursor-pointer flex items-center gap-2"
              >
                Enter Patient Portal
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleOpenHospitalPortal}
                className="px-6 py-3.5 rounded-full bg-teal-800/60 hover:bg-teal-800 border border-teal-600/50 text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Hospital / Admin Login
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

        {/* Separate Portal Gateway Cards Section */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#0E2A33] tracking-tight">
              Choose your dedicated portal
            </h2>
            <p className="text-[#48646C] text-base mt-2">
              Patients and hospitals share live real-time data across both portals seamlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 1. Patient Portal Card */}
            <div 
              onClick={handleOpenPatientPortal}
              className="group cursor-pointer rounded-[32px] bg-white border-2 border-[#CBDDDB] p-8 sm:p-10 shadow-sm hover:shadow-xl hover:border-[#0F8B8D] transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-teal-50 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110 duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#0F8B8D] flex items-center justify-center mb-6 group-hover:bg-[#0F8B8D] group-hover:text-white transition-colors duration-300 shadow-sm">
                  <Users className="w-7 h-7" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0F8B8D] text-xs font-bold uppercase tracking-wider mb-3">
                  For Patients & Families
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold font-display text-[#0E2A33] mb-3">
                  I'm a patient
                </h3>

                <p className="text-[#48646C] text-base leading-relaxed mb-6">
                  Check symptoms with AI, compare hospital costs, book a token without standing in lines, track your queue position live, and request an emergency ambulance.
                </p>

                <ul className="space-y-2.5 mb-8 text-sm text-[#0E2A33] font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0F8B8D] shrink-0" />
                    <span>Real-time live queue token tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0F8B8D] shrink-0" />
                    <span>Instant upfront price breakdown & procedure costs</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0F8B8D] shrink-0" />
                    <span>Two-way direct live messaging with hospital desk</span>
                  </li>
                </ul>
              </div>

              <div className="relative z-10 pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  className="px-6 py-3.5 rounded-full bg-[#0E2A33] group-hover:bg-[#0F8B8D] text-white font-bold text-sm transition-all duration-300 flex items-center gap-2 shadow-md"
                >
                  Open patient portal
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-xs text-slate-400 font-medium">
                  Sign in or register
                </span>
              </div>
            </div>

            {/* 2. Hospital & Ambulance Portal Card */}
            <div 
              onClick={handleOpenHospitalPortal}
              className="group cursor-pointer rounded-[32px] bg-gradient-to-br from-[#16224f] to-[#0A1022] border-2 border-[#3552C8]/70 p-8 sm:p-10 shadow-xl hover:shadow-2xl hover:border-[#6C8CFF] transition-all duration-300 relative overflow-hidden flex flex-col justify-between text-white"
            >
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#6C8CFF]/10 rounded-bl-[100px] -z-0 transition-transform group-hover:scale-110 duration-300" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-[#6C8CFF]/20 border border-[#6C8CFF]/40 text-[#6C8CFF] flex items-center justify-center mb-6 group-hover:bg-[#6C8CFF] group-hover:text-white transition-colors duration-300 shadow-sm">
                  <Building2 className="w-7 h-7" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#6C8CFF]/15 text-[#9DB4FF] text-xs font-bold uppercase tracking-wider mb-3">
                  For Hospital Staff & Drivers
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold font-display text-white mb-3">
                  Hospital and ambulance
                </h3>

                <p className="text-[#9AA7D1] text-base leading-relaxed mb-6">
                  Manage doctors, update OPD consultation fees and procedure prices, call next patient tokens, reply to patient inquiries, and dispatch emergency ambulances.
                </p>

                <ul className="space-y-2.5 mb-8 text-sm text-[#E7ECFF] font-medium">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#6C8CFF] shrink-0" />
                    <span>Real-time OPD queue manager with one-tap "Call Next"</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#6C8CFF] shrink-0" />
                    <span>Live emergency ambulance dispatch board</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#6C8CFF] shrink-0" />
                    <span>Doctor availability toggle & procedure pricing matrix</span>
                  </li>
                </ul>
              </div>

              <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="px-6 py-3.5 rounded-full bg-gradient-to-r from-[#6C8CFF] to-[#3552C8] text-white font-bold text-sm hover:brightness-110 transition-all duration-300 flex items-center gap-2 shadow-lg"
                  >
                    Open hospital portal
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAmbulancePortal();
                    }}
                    className="text-xs text-[#9DB4FF] hover:underline font-semibold"
                  >
                    Driver login
                  </button>
                </div>
                <span className="text-xs text-[#9AA7D1] font-medium">
                  Verified staff access
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Hospital Facilities Showcase Section */}
        <section id="hospitals" className="mb-16 pt-8 border-t border-[#CBDDDB]/60">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#0F8B8D]">
                Verified Network
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-[#0E2A33] tracking-tight mt-1">
                Live Hospital Facilities
              </h2>
              <p className="text-[#48646C] text-sm sm:text-base mt-1">
                Real-time queue delays and upfront consult rates across top medical centers.
              </p>
            </div>
            <button
              onClick={handleOpenPatientPortal}
              className="text-xs font-bold text-[#0F8B8D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View full directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {hospitals.slice(0, 4).map((h) => (
              <div
                key={h.id}
                onClick={handleOpenPatientPortal}
                className="group cursor-pointer rounded-3xl bg-white border border-[#CBDDDB] overflow-hidden shadow-sm hover:shadow-2xl hover:border-[#0F8B8D] hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                    <img
                      src={h.image}
                      alt={h.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="text-amber-400">★</span>
                      <span>{h.rating}</span>
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 bg-emerald-950/85 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5 shadow">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{h.currentQueueWait} min OPD wait</span>
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h4 className="font-bold font-display text-base text-[#0E2A33] group-hover:text-[#0F8B8D] transition-colors line-clamp-1">
                      {h.name}
                    </h4>
                    <p className="text-xs text-[#48646C] line-clamp-1">{h.location}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span className="font-bold text-[#0E2A33] text-sm">₹{h.startsAt}</span>
                      <span className="text-slate-400">OPD consultation</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="w-full py-2.5 bg-slate-50 group-hover:bg-[#0F8B8D] group-hover:text-white text-slate-700 rounded-xl text-xs font-bold text-center transition-colors shadow-sm">
                    Book OPD Token
                  </div>
                </div>
              </div>
            ))}
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

        {/* Emergency Ambulance SOS Flow Banner */}
        <section id="emergency" className="rounded-[32px] bg-[#8E1F28] text-[#FFF1F0] p-8 sm:p-12 mb-16 shadow-xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-bold uppercase tracking-wider mb-4">
                <Ambulance className="w-3.5 h-3.5" />
                Emergency Response
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display text-white tracking-tight mb-4">
                Ambulance, booked once.
              </h2>
              <p className="text-[#FFD9D6] text-base leading-relaxed mb-6">
                In an emergency, nobody should have to call five phone numbers. Tap once to request, and the hospital dispatches the nearest ambulance immediately with live tracking.
              </p>
              <div className="pt-4 border-t border-white/20 text-xs text-[#FFD9D6]">
                Only verified, registered hospitals appear on Cuvio.
              </div>
            </div>

            {/* Step flow */}
            <div className="space-y-6 relative pl-6 border-l-2 border-white/30">
              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#8E1F28] shadow" />
                <h5 className="font-bold text-white text-base">Patient books the ambulance</h5>
                <p className="text-xs text-[#FFD9D6] mt-0.5">One request, one tap from the patient portal.</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#8E1F28] shadow" />
                <h5 className="font-bold text-white text-base">Hospital admin assigns a driver</h5>
                <p className="text-xs text-[#FFD9D6] mt-0.5">The hospital selects available vehicle and driver.</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#8E1F28] shadow" />
                <h5 className="font-bold text-white text-base">Driver sees destination & GPS</h5>
                <p className="text-xs text-[#FFD9D6] mt-0.5">Pickup location, patient phone number, and hospital route.</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#8E1F28] shadow" />
                <h5 className="font-bold text-white text-base">Driver completes trip</h5>
                <p className="text-xs text-[#FFD9D6] mt-0.5">Hospital is notified and patient arrives safely at triage.</p>
              </div>
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
