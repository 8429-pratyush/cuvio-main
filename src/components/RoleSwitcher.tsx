import React, { useState } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { 
  ShieldCheck, User, Ambulance, AlertCircle, X, Lock, 
  KeyRound, Phone, Eye, EyeOff, Building2, ChevronRight, AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function RoleSwitcher() {
  const { 
    role, 
    setRole, 
    bookings, 
    ambulanceBookings, 
    setAdminHospitalId, 
    setScreen,
    hospitals,
    clearPatientSession,
    user,
    loginDriver
  } = useCuvio();

  const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
  const activeEmergencies = ambulanceBookings.filter(b => b.status === 'Requested' || b.status === 'Dispatched').length;

  // Modal Auth States
  const [activeModal, setActiveModal] = useState<'admin' | 'driver' | null>(null);
  const [hospitalId, setHospitalId] = useState('');
  const [password, setPassword] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Close Modal and reset inputs
  const closeModal = () => {
    setActiveModal(null);
    setHospitalId('');
    setPassword('');
    setDriverPhone('');
    setError('');
  };

  const handleAdminSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanHospId = hospitalId.trim().toLowerCase();
      if (!cleanHospId) {
        throw new Error('Please enter your Hospital ID');
      }
      if (!password.trim()) {
        throw new Error('Please enter your administrator password');
      }

      const matchedHospital = hospitals.find(
        (h) => h.id.toLowerCase() === cleanHospId
      );

      if (!matchedHospital) {
        throw new Error(`Hospital ID "@${cleanHospId}" not found in system.`);
      }

      let isPasswordCorrect = false;
      const seedAccount = [
        { id: 'apollo', pass: 'apollo2026' },
        { id: 'manipal', pass: 'manipal2026' },
        { id: 'fortis', pass: 'fortis2026' },
        { id: 'max', pass: 'max2026' }
      ].find(acc => acc.id.toLowerCase() === matchedHospital.id.toLowerCase());

      if (matchedHospital.adminPassword) {
        isPasswordCorrect = matchedHospital.adminPassword === password;
      } else if (seedAccount) {
        isPasswordCorrect = seedAccount.pass === password;
      } else {
        isPasswordCorrect = (password === `${matchedHospital.id}2026`);
      }

      if (!isPasswordCorrect) {
        throw new Error('Incorrect password. Please verify and try again.');
      }

      // Success! Log in as admin
      setAdminHospitalId(matchedHospital.id);
      clearPatientSession();
      setRole('admin');
      setScreen('dashboard');
      closeModal();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSwitch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const cleanPhone = driverPhone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number');
      }

      await loginDriver(cleanPhone);
      setRole('driver');
      setScreen('dashboard');
      closeModal();
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Register on the Welcome page if you are new.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed right-4 top-[35%] -translate-y-1/2 z-[100] flex flex-col items-end gap-3.5">
        <div className="bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl shadow-black/60 flex flex-col items-center gap-3 cuvio-glass border-r-emerald-500/20">
          
          {/* Patient View Button */}
          <button
            type="button"
            onClick={() => {
              setRole('patient');
              if (!user) {
                setScreen('login');
              } else {
                setScreen('dashboard');
              }
            }}
            className={`relative p-2.5 rounded-xl transition-all cursor-pointer group ${
              role === 'patient'
                ? 'bg-[#0B5A4B] text-white shadow-md shadow-emerald-950/25 scale-[1.05]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Patient Portal"
          >
            <User className="w-4 h-4" />
            <span className="absolute right-12 top-1/2 -translate-y-1/2 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow border border-slate-800">
              Patient Portal
            </span>
          </button>

          {/* Divider */}
          <div className="w-4 h-[1px] bg-slate-800/80" />

          {/* Hospital Admin Button */}
          <button
            type="button"
            onClick={() => {
              setActiveModal('admin');
            }}
            className={`relative p-2.5 rounded-xl transition-all cursor-pointer group ${
              role === 'admin'
                ? 'bg-[#0B5A4B] text-white shadow-md shadow-emerald-950/25 scale-[1.05]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Hospital Admin"
          >
            <ShieldCheck className="w-4 h-4" />
            {(pendingBookings > 0 || activeEmergencies > 0) && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse border border-slate-950" />
            )}
            <span className="absolute right-12 top-1/2 -translate-y-1/2 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow border border-slate-800">
              Hospital Admin Login
            </span>
          </button>

          {/* Divider */}
          <div className="w-4 h-[1px] bg-slate-800/80" />

          {/* Ambulance Driver Button */}
          <button
            type="button"
            onClick={() => {
              setActiveModal('driver');
            }}
            className={`relative p-2.5 rounded-xl transition-all cursor-pointer group ${
              role === 'driver'
                ? 'bg-[#0B5A4B] text-white shadow-md shadow-emerald-950/25 scale-[1.05]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
            title="Ambulance Console"
          >
            <Ambulance className="w-4 h-4" />
            {activeEmergencies > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping border border-slate-950" />
            )}
            <span className="absolute right-12 top-1/2 -translate-y-1/2 bg-slate-950 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow border border-slate-800">
              Ambulance Driver Login
            </span>
          </button>
        </div>
      </div>

      {activeEmergencies > 0 && role === 'patient' && (
        <div className="fixed bottom-24 right-4 z-[95] bg-red-500/95 backdrop-blur-md text-white px-3.5 py-2 rounded-full text-[10px] font-bold shadow-lg border border-red-400/50 animate-bounce flex items-center gap-1.5 cuvio-shadow-emergency">
          <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
          <span>Active SOS Ambulance Dispatch</span>
        </div>
      )}

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Dark background overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 cuvio-glass cuvio-shadow-premium"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2.5 rounded-xl ${activeModal === 'admin' ? 'bg-[#0B5A4B]/20 text-[#0B5A4B]' : 'bg-red-500/15 text-red-500'}`}>
                    {activeModal === 'admin' ? <Building2 className="w-5 h-5" /> : <Ambulance className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">
                      {activeModal === 'admin' ? 'Hospital Admin Switch' : 'Ambulance Driver Switch'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">Verify credentials to switch panel</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-4">
                {error && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5 font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                    <span>{error}</span>
                  </div>
                )}

                {activeModal === 'admin' ? (
                  <form onSubmit={handleAdminSwitch} className="space-y-4">
                    {/* Hospital ID */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Hospital ID / Username
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-slate-500 font-mono text-xs">@</span>
                        <input
                          type="text"
                          required
                          value={hospitalId}
                          onChange={(e) => setHospitalId(e.target.value)}
                          placeholder="e.g. apollo, manipal"
                          className="w-full h-12 pl-10 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-[#0B5A4B] focus:ring-2 focus:ring-[#0B5A4B]/10 transition-all"
                        />
                      </div>
                    </div>

                    {/* Hospital Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Administrator Password
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-12 pl-4 pr-10 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#0B5A4B] focus:ring-2 focus:ring-[#0B5A4B]/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 p-1 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-center">
                        🔒 Sign in using your hospital's registered unique ID & administrator password.
                      </p>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-[#0B5A4B] hover:bg-[#074136] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Access Hospital Admin Panel</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleDriverSwitch} className="space-y-4">
                    {/* Driver Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                        Registered Mobile Number
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-slate-500 font-bold text-xs">+91</span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={driverPhone}
                          onChange={(e) => setDriverPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="98888 77777"
                          className="w-full h-12 pl-12 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-all font-mono"
                        />
                      </div>
                    </div>

                     <div className="bg-slate-950/30 p-3 rounded-xl border border-slate-800/40">
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-center">
                        🔒 Sign in using your registered driver mobile number.
                      </p>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-red-950/20 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Access Dispatch HUD</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
