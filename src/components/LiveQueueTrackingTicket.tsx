import React, { useState, useEffect } from 'react';
import { BookingRequest, QueueEntry } from '../types';
import {
  subscribeToActiveQueue,
  subscribeToDoctorAverageDuration,
  cancelQueueEntry,
  checkQueueNotification,
  getKolkataDateString
} from '../lib/queueService';
import {
  Clock, CheckCircle2, AlertCircle, Sparkles, User, Calendar, MapPin,
  XCircle, ChevronRight, Bell, ShieldCheck, RefreshCw, Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveQueueTrackingTicketProps {
  booking: BookingRequest;
  onCancel?: () => void;
  onBackToDashboard?: () => void;
}

export default function LiveQueueTrackingTicket({
  booking,
  onCancel,
  onBackToDashboard
}: LiveQueueTrackingTicketProps) {
  const [activeEntries, setActiveEntries] = useState<QueueEntry[]>([]);
  const [avgDuration, setAvgDuration] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    message: string;
    type: 'warning' | 'info';
  } | null>(null);

  const date = booking.date || getKolkataDateString();
  const doctorId = booking.doctorId;
  const myTokenNumber = booking.tokenNumber || 1;
  const patientId = booking.patientId || (booking.patientPhone ? booking.patientPhone.replace(/\D/g, '') : 'patient');

  // 1. Subscribe to Active Queue in Firestore
  useEffect(() => {
    if (!doctorId) return;

    setLoading(true);
    const unsubscribeQueue = subscribeToActiveQueue(doctorId, date, (entries) => {
      setActiveEntries(entries);
      setLoading(false);
    });

    const unsubscribeAvg = subscribeToDoctorAverageDuration(doctorId, date, (avgMin) => {
      setAvgDuration(avgMin);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeAvg();
    };
  }, [doctorId, date]);

  // Derived Position Logic
  // peopleAhead = number of active entries with tokenNumber lower than mine
  const peopleAhead = activeEntries.filter(e => e.tokenNumber < myTokenNumber).length;
  // position = peopleAhead + 1
  const position = peopleAhead + 1;
  const estimatedWait = peopleAhead * avgDuration;

  // Find my own entry in the queue to inspect live status
  const myEntry = activeEntries.find(e => e.tokenNumber === myTokenNumber);
  const isInConsultation = myEntry?.status === 'in_consultation';
  const isCompleted = booking.status === 'Completed';
  const isCancelled = booking.status === 'Rejected' || booking.queueStatus === 'Cancelled';

  // 2. Notification Trigger (position 3 and position 1)
  useEffect(() => {
    if (loading || isCompleted || isCancelled) return;

    const notif = checkQueueNotification(patientId, doctorId, date, position);
    if (notif) {
      setActiveNotification(notif);
    }
  }, [position, patientId, doctorId, date, loading, isCompleted, isCancelled]);

  // Cancel queue entry handler
  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your queue spot? This will immediately free your slot for waiting patients.")) {
      return;
    }

    if (booking.queueEntryId) {
      try {
        await cancelQueueEntry(booking.queueEntryId);
      } catch (e) {
        console.warn("Cancel queue entry error:", e);
      }
    }

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Toast Notification Banner (Position 3 & Position 1) */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15 }}
            className={`p-4 rounded-2xl border shadow-lg flex items-start gap-3 relative ${
              position === 1
                ? 'bg-rose-50 border-rose-200 text-rose-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              position === 1 ? 'bg-rose-600 text-white animate-bounce' : 'bg-amber-500 text-white'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 flex-1 pr-6">
              <h4 className="font-bold text-xs font-display uppercase tracking-wider">{activeNotification.title}</h4>
              <p className="text-xs leading-relaxed font-medium">{activeNotification.message}</p>
            </div>
            <button
              onClick={() => setActiveNotification(null)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Status */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-[#0B5A4B] text-[11px] font-bold border border-emerald-200 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE FIREBASE QUEUE SYNCED</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">
          {isInConsultation ? "In Consultation Now" : "Live Queue Tracker"}
        </h1>
        <p className="text-slate-500 text-xs">
          Automatic instant position recalculation. When earlier patients finish, your position drops automatically without refreshing.
        </p>
      </div>

      {/* The Ticket Component */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden relative">
        {/* Top Header Stripe */}
        <div className={`h-2.5 w-full ${isInConsultation ? 'bg-emerald-500' : 'bg-blue-600'}`} />

        {/* Ticket Header */}
        <div className="p-6 border-b border-slate-100 border-dashed relative">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hospital & Clinic</span>
              <h3 className="font-bold text-slate-800 text-sm font-display">{booking.hospitalName}</h3>
              <p className="text-xs text-blue-600 font-semibold">{booking.department} Department</p>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider inline-block ${
                isInConsultation
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-blue-100 text-blue-700 border border-blue-200'
              }`}>
                {isInConsultation ? 'In Cabin' : 'Confirmed'}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-1">ID: #{booking.id}</p>
            </div>
          </div>

          {/* Ticket Side punch notches */}
          <div className="absolute -bottom-3 -left-3 w-6 h-6 bg-slate-50 border border-slate-100 rounded-full" />
          <div className="absolute -bottom-3 -right-3 w-6 h-6 bg-slate-50 border border-slate-100 rounded-full" />
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-6">
          {/* Patient and Doctor metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
              <p className="font-bold text-slate-800 mt-0.5">{booking.patientName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialist Doctor</p>
              <p className="font-bold text-slate-800 mt-0.5">{booking.doctorName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Queue Date</p>
              <p className="font-bold text-slate-800 mt-0.5">{date}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Slot</p>
              <p className="font-bold text-slate-800 mt-0.5">{booking.time}</p>
            </div>
          </div>

          {/* LIVE DERIVED QUEUE POSITION HERO BLOCK */}
          <div className="bg-gradient-to-br from-blue-50/80 via-slate-50 to-emerald-50/40 p-6 rounded-3xl border border-blue-100 text-center space-y-5 shadow-sm">
            {/* Assigned Permanent Token */}
            <div className="flex items-center justify-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Token Number:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-100 text-blue-700 font-mono font-bold text-xs border border-blue-200">
                Token #{myTokenNumber}
              </span>
            </div>

            {/* Live Position with smooth re-render spring animation */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {isInConsultation ? "Status" : "Your Current Position"}
              </p>
              
              {isInConsultation ? (
                <div className="py-2">
                  <span className="inline-block text-2xl font-black text-emerald-600 bg-emerald-100 border border-emerald-200 px-6 py-2 rounded-2xl animate-pulse">
                    Inside Doctor's Cabin
                  </span>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={position}
                    initial={{ scale: 1.35, opacity: 0, y: -5 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="flex items-baseline justify-center gap-2"
                  >
                    <span className="text-5xl font-black text-[#0B5A4B] font-display">
                      #{position}
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase">
                      in queue
                    </span>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Split row: Patients ahead & Estimated Wait Time */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200/60 pt-4">
              <div className="px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patients ahead</p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={peopleAhead}
                    initial={{ scale: 1.25, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-black text-slate-800 font-display mt-0.5"
                  >
                    {peopleAhead}
                  </motion.p>
                </AnimatePresence>
                <p className="text-[10px] text-slate-400">
                  {peopleAhead === 0 ? "You're first!" : `${peopleAhead} ahead of you`}
                </p>
              </div>

              <div className="px-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Wait time</p>
                <p className="text-2xl font-black text-blue-600 font-display mt-0.5">
                  ~{estimatedWait} mins
                </p>
                <p className="text-[10px] text-slate-400">
                  Based on ~{avgDuration}m avg per checkup
                </p>
              </div>
            </div>

            {/* Dynamic Live Status Subtext */}
            <div className="pt-1">
              <p className="text-[11px] text-slate-500 font-medium">
                {position === 1
                  ? "👉 Please proceed to Room 4B and keep your registration slip ready."
                  : position <= 3
                  ? "⏳ Almost your turn. Please remain seated in the reception waiting lounge."
                  : "☕ You have comfortable waiting time. We will alert you when you reach position 3."}
              </p>
            </div>
          </div>

          {/* Active Queue Snapshot (Transparency List) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-700">Active Roster for Dr. {booking.doctorName}</span>
              <span className="text-[10px] text-slate-400 font-medium">{activeEntries.length} active in line</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {activeEntries.length > 0 ? (
                activeEntries.map((entry, idx) => {
                  const isMe = entry.tokenNumber === myTokenNumber;
                  return (
                    <div
                      key={entry.id}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                        isMe
                          ? 'bg-[#0B5A4B] text-white border-[#0B5A4B] font-bold shadow-sm'
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-black ${
                          isMe ? 'bg-white text-[#0B5A4B]' : 'bg-slate-200 text-slate-700'
                        }`}>
                          #{entry.tokenNumber}
                        </span>
                        <span>
                          {isMe ? 'You (Active Token)' : `Token #${entry.tokenNumber}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          entry.status === 'in_consultation'
                            ? (isMe ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800')
                            : (isMe ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')
                        }`}>
                          {entry.status === 'in_consultation' ? 'In Cabin' : `Queue #${idx + 1}`}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-slate-400 italic">
                  Queue is currently clear.
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {onBackToDashboard && (
              <button
                onClick={onBackToDashboard}
                className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Back to Dashboard
              </button>
            )}

            <button
              onClick={handleCancel}
              className="h-12 px-5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-4 h-4 text-rose-600" />
              <span>Cancel My Position</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
