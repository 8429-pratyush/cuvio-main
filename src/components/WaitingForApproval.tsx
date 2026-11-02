import React, { useState } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { Clock, ShieldAlert, RefreshCw, LogOut, Building2, Ambulance, CheckCircle2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { HospitalProfile, AmbulanceProfile } from '../types';

export default function WaitingForApproval() {
  const { user, setUser, logout, role } = useCuvio();
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const isHospital = role === 'hospital' || (user as any)?.role === 'hospital';
  const hospitalData = isHospital ? (user as unknown as HospitalProfile) : null;
  const ambulanceData = !isHospital ? (user as unknown as AmbulanceProfile) : null;

  const handleCheckStatus = async () => {
    if (!auth.currentUser) return;
    setChecking(true);
    setCheckMessage(null);
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (snap.exists()) {
        const freshData = snap.data() as any;
        if (freshData.approved) {
          setUser(freshData);
          setCheckMessage("Congratulations! Your account has been approved.");
        } else {
          setCheckMessage("Status verified: Account is still undergoing administrative review.");
        }
      }
    } catch (err: any) {
      setCheckMessage("Could not check status right now. Please try again shortly.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-[#0B5A4B]/5 blur-[120px] rounded-full -z-10" />

      <main className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl relative text-center">
        {/* Icon */}
        <div className="w-16 h-16 bg-amber-50 border border-amber-200/60 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-600">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[11px] font-black tracking-widest uppercase rounded-full mb-3">
          Verification Pending
        </span>

        <h1 className="text-2xl font-black text-slate-800 tracking-tight font-display mb-2">
          Waiting for Approval
        </h1>

        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
          Thank you for registering with Cuvio. Your {isHospital ? 'hospital partner' : 'ambulance fleet'} profile has been received and is awaiting administrative verification before full access is unlocked.
        </p>

        {/* Profile Card */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-left space-y-2 mb-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            {isHospital ? <Building2 className="w-4 h-4 text-[#0B5A4B]" /> : <Ambulance className="w-4 h-4 text-red-600" />}
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {isHospital ? 'Registered Hospital Details' : 'Driver & Vehicle Profile'}
            </span>
          </div>

          {isHospital && hospitalData && (
            <div className="text-xs space-y-1 pt-1">
              <p><span className="text-slate-400">Hospital:</span> <strong className="text-slate-800">{hospitalData.hospitalName}</strong></p>
              <p><span className="text-slate-400">Registration / ID:</span> <strong className="text-slate-800 font-mono">@{hospitalData.registrationNumber}</strong></p>
              <p><span className="text-slate-400">City / Location:</span> <strong className="text-slate-800">{hospitalData.city}</strong></p>
              <p><span className="text-slate-400">Contact Person:</span> <strong className="text-slate-800">{hospitalData.contactPersonName}</strong></p>
              <p><span className="text-slate-400">Registered Phone:</span> <strong className="text-slate-800 font-mono">{hospitalData.phone}</strong></p>
            </div>
          )}

          {!isHospital && ambulanceData && (
            <div className="text-xs space-y-1 pt-1">
              <p><span className="text-slate-400">Driver Name:</span> <strong className="text-slate-800">{ambulanceData.name}</strong></p>
              <p><span className="text-slate-400">Vehicle Number:</span> <strong className="text-slate-800 font-mono">{ambulanceData.vehicleNumber}</strong></p>
              <p><span className="text-slate-400">Ambulance Type:</span> <strong className="text-slate-800">{ambulanceData.ambulanceType}</strong></p>
              <p><span className="text-slate-400">Operating City:</span> <strong className="text-slate-800">{ambulanceData.city}</strong></p>
              <p><span className="text-slate-400">Registered Phone:</span> <strong className="text-slate-800 font-mono">{ambulanceData.phone}</strong></p>
            </div>
          )}
        </div>

        {checkMessage && (
          <div className="mb-5 p-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
            {checkMessage}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full h-12 bg-[#0B5A4B] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-[#0B5A4B]/20 disabled:opacity-50"
          >
            {checking ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Check Approval Status</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full h-11 bg-slate-100 text-slate-600 hover:text-slate-900 font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
