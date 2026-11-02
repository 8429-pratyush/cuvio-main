import React, { useState, useEffect } from 'react';
import { Doctor, Hospital, BookingRequest, QueueEntry } from '../types';
import {
  subscribeToActiveQueue,
  subscribeToDoctorAverageDuration,
  startConsultation,
  completeConsultation,
  skipPatient,
  assignQueueTokenAndEntry,
  getKolkataDateString
} from '../lib/queueService';
import {
  Clock, CheckCircle, Play, SkipForward, UserPlus, Bell,
  Sparkles, CheckCircle2, User, ChevronRight, Activity, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminDoctorQueueProps {
  key?: React.Key;
  doctor: Doctor;
  hospital: Hospital;
  allBookings: BookingRequest[];
  onTriggerReminder?: (patientName: string, phone: string, doctorName: string, token: number | string) => void;
}

export default function AdminDoctorQueue({
  doctor,
  hospital,
  allBookings,
  onTriggerReminder
}: AdminDoctorQueueProps) {
  const [activeEntries, setActiveEntries] = useState<QueueEntry[]>([]);
  const [avgWaitDuration, setAvgWaitDuration] = useState<number>(10);
  const [loading, setLoading] = useState(true);
  const [isAddingTestPatient, setIsAddingTestPatient] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const today = getKolkataDateString();

  // 1. Subscribe to active queue in Firestore (waiting and in_consultation)
  useEffect(() => {
    setLoading(true);
    const unsubscribeQueue = subscribeToActiveQueue(doctor.id, today, (entries) => {
      setActiveEntries(entries);
      setLoading(false);
    });

    const unsubscribeAvg = subscribeToDoctorAverageDuration(doctor.id, today, (avg) => {
      setAvgWaitDuration(avg);
    });

    return () => {
      unsubscribeQueue();
      unsubscribeAvg();
    };
  }, [doctor.id, today]);

  // Quick helper to simulate/add a patient to this doctor's queue (e.g. for testing Token 1 & Token 2)
  const handleAddPatientToQueue = async () => {
    setIsAddingTestPatient(true);
    try {
      const randomPatientId = `pat_${Math.floor(1000 + Math.random() * 9000)}`;
      const result = await assignQueueTokenAndEntry(doctor.id, randomPatientId, today);
      console.log(`Assigned Token #${result.tokenNumber} to doctor ${doctor.name}`);
    } catch (err) {
      console.error("Failed to add test patient to queue:", err);
    } finally {
      setIsAddingTestPatient(false);
    }
  };

  // Actions
  const handleStartConsultation = async (entry: QueueEntry) => {
    setActionInProgressId(entry.id);
    try {
      await startConsultation(entry.id);
    } catch (e) {
      console.error("Start consultation error:", e);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleComplete = async (entry: QueueEntry) => {
    setActionInProgressId(entry.id);
    try {
      await completeConsultation(entry.id);
    } catch (e) {
      console.error("Complete consultation error:", e);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleSkip = async (entry: QueueEntry) => {
    setActionInProgressId(entry.id);
    try {
      await skipPatient(entry.id);
    } catch (e) {
      console.error("Skip patient error:", e);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Helper to resolve patient name from booking if available
  const getPatientName = (entry: QueueEntry, index: number) => {
    const booking = allBookings.find(
      b => (b.queueEntryId === entry.id || b.tokenNumber === entry.tokenNumber) && b.doctorId === doctor.id
    );
    if (booking && booking.patientName) {
      return booking.patientName;
    }
    return `Patient ${entry.tokenNumber || index + 1}`;
  };

  const getPatientPhone = (entry: QueueEntry) => {
    const booking = allBookings.find(
      b => (b.queueEntryId === entry.id || b.tokenNumber === entry.tokenNumber) && b.doctorId === doctor.id
    );
    return booking?.patientPhone || '+91 98765 43210';
  };

  return (
    <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
      {/* Doctor Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0">
            <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white font-display text-sm sm:text-base">{doctor.name}</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-blue-400 font-semibold mt-0.5">
              {doctor.specialty} • {activeEntries.length} In Queue • ~{avgWaitDuration}m avg checkup
            </p>
          </div>
        </div>

        {/* Action button to add a test patient to this doctor's queue */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleAddPatientToQueue}
            disabled={isAddingTestPatient}
            className="text-xs font-bold bg-[#0B5A4B] hover:bg-[#084539] text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
            <span>{isAddingTestPatient ? 'Assigning...' : '+ Add Patient to Queue'}</span>
          </button>

          <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
            doctor.availability === 'Available' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-900/40' :
            doctor.availability === 'On Break' ? 'bg-amber-950/80 text-amber-400 border-amber-900/40' :
            'bg-red-950/80 text-red-400 border-red-900/40'
          }`}>
            {doctor.availability}
          </span>
        </div>
      </div>

      {/* Active Patients Queue list */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Loading live queue from Firestore...
          </div>
        ) : activeEntries.length > 0 ? (
          <div className="space-y-2.5">
            {activeEntries.map((entry, index) => {
              const patientName = getPatientName(entry, index);
              const patientPhone = getPatientPhone(entry);
              const isInCabin = entry.status === 'in_consultation';
              const isActioning = actionInProgressId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                    isInCabin
                      ? 'bg-emerald-950/30 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                      : index === 0
                      ? 'bg-blue-950/30 border-blue-800/50'
                      : 'bg-slate-900/80 border-slate-800'
                  }`}
                >
                  {/* Left: Token and Patient Information */}
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center font-display shrink-0 ${
                      isInCabin
                        ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300'
                        : index === 0
                        ? 'bg-blue-900/40 border-blue-700 text-blue-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300'
                    }`}>
                      <span className="text-[9px] uppercase font-bold text-slate-400 leading-none">Token</span>
                      <span className="text-base font-black leading-tight">#{entry.tokenNumber}</span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-xs sm:text-sm">{patientName}</p>
                        {isInCabin ? (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                            Inside Cabin
                          </span>
                        ) : index === 0 ? (
                          <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500 text-white px-2 py-0.5 rounded-full">
                            Next in Line
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            Queue #{index + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Date: {entry.date} • {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Checked-in'}
                      </p>
                    </div>
                  </div>

                  {/* Right: Operational Buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                    {/* Send reminder alert */}
                    {onTriggerReminder && (
                      <button
                        onClick={() => onTriggerReminder(patientName, patientPhone, doctor.name, entry.tokenNumber)}
                        className="h-9 px-3 border border-blue-900/50 hover:bg-blue-900/30 text-blue-400 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Alert Patient"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Alert</span>
                      </button>
                    )}

                    {/* Start Consultation (waiting -> in_consultation) */}
                    {!isInCabin ? (
                      <button
                        onClick={() => handleStartConsultation(entry)}
                        disabled={isActioning}
                        className="h-9 px-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Consultation</span>
                      </button>
                    ) : (
                      <span className="h-9 px-3.5 bg-emerald-950 text-emerald-400 border border-emerald-800/60 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 animate-spin" />
                        <span>In Progress</span>
                      </span>
                    )}

                    {/* Mark Completed */}
                    <button
                      onClick={() => handleComplete(entry)}
                      disabled={isActioning}
                      className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Completed</span>
                    </button>

                    {/* Skip / No-show */}
                    <button
                      onClick={() => handleSkip(entry)}
                      disabled={isActioning}
                      className="h-9 px-3 border border-slate-700 hover:border-rose-900/60 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-900/50 rounded-2xl border border-dashed border-slate-800/80 space-y-3">
            <p className="text-xs text-slate-400 font-medium">No active patients in Dr. {doctor.name}&apos;s live queue.</p>
            <button
              onClick={handleAddPatientToQueue}
              className="text-xs font-bold bg-blue-600/20 hover:bg-blue-600 border border-blue-500/40 text-blue-300 hover:text-white px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Simulate Patient Token (Test Live Drop)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
