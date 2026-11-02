import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, HeartHandshake } from 'lucide-react';
import { useCuvio } from '../context/CuvioContext';
import { auth } from '../lib/firebase';

export default function Splash() {
  const { setScreen, user } = useCuvio();

  useEffect(() => {
    // If a session already exists, skip splash completely
    const cachedRole = localStorage.getItem('cuvio_role');
    const cachedUser = localStorage.getItem('cuvio_user');
    if (auth.currentUser || user || (cachedUser && cachedRole)) {
      setScreen('dashboard');
      return;
    }

    // Maximum 400ms splash when first opening without a session
    const timer = setTimeout(() => {
      setScreen('onboarding');
    }, 400);

    return () => clearTimeout(timer);
  }, [setScreen, user]);

  return (
    <div className="fixed inset-0 w-full h-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 select-none z-50">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-[#0B5A4B]/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-100/30 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex flex-col items-center text-center relative"
      >
        <div className="relative mb-6">
          <div className="relative w-24 h-24 rounded-[24px] bg-[#0B5A4B] flex items-center justify-center shadow-xl shadow-[#0B5A4B]/20 border border-[#0B5A4B]/20">
            <HeartHandshake className="w-12 h-12 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#0B5A4B] font-display">
          CUVIO
        </h1>
        <p className="text-xs font-medium text-slate-500 mt-2 tracking-wide">
          Healthcare, Clearly Explained.
        </p>

        <div className="mt-6 w-32 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#0B5A4B] animate-pulse w-full" />
        </div>
      </motion.div>

      <div className="absolute bottom-8 flex items-center gap-2 opacity-60">
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
          AI-Powered Transparency Engine
        </span>
      </div>
    </div>
  );
}
