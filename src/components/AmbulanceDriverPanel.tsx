import React, { useState } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { Ambulance, MapPin, Phone, AlertCircle, RefreshCw, CheckCircle, Navigation, ShieldCheck, HeartPulse, LogOut, Check } from 'lucide-react';
import AmbulanceMap from './AmbulanceMap';
import { motion, AnimatePresence } from 'motion/react';

export default function AmbulanceDriverPanel() {
  const { 
    ambulanceBookings, 
    updateAmbulanceStatus, 
    setRole,
    setScreen,
    currentDriver,
    logoutDriver
  } = useCuvio();

  const driverName = currentDriver?.name || 'Suresh Kumar';
  const driverPhone = currentDriver?.phone || '+91 98888 77777';
  const driverHospital = currentDriver?.hospitalName || 'Apollo Specialty Hospital';

  // Active or pending bookings assigned to this driver
  const activeDispatches = ambulanceBookings.filter(b => b.driverPhone === driverPhone && b.status !== 'Completed');
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(
    activeDispatches.length > 0 ? activeDispatches[0].id : null
  );

  // Fallback to latest booking if none selected but one exists
  const activeBookingId = selectedBookingId || (activeDispatches[0]?.id || null);
  const currentBooking = ambulanceBookings.find(b => b.id === activeBookingId);

  // Status message based on current dispatch
  const getStatusDetail = (status: typeof currentBooking.status) => {
    switch (status) {
      case 'Requested': return 'Pending Acceptance. Dispatch immediately.';
      case 'Dispatched': return 'Speeding towards Patient pickup location.';
      case 'Arrived': return 'On-scene. Boarding and preparing patient.';
      case 'EnRouteToHospital': return 'Carrying patient. Speeding to ER bay.';
      case 'Completed': return 'Patient securely checked-in at hospital.';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row pb-24 md:pb-0">
      {/* Sidebar panel for jobs */}
      <div className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-red-500 animate-pulse" />
            <h1 className="text-base font-extrabold text-white font-display">Driver Console</h1>
          </div>
          <span className="text-[10px] bg-red-950 text-red-400 font-extrabold px-2 py-0.5 border border-red-900 rounded uppercase tracking-widest">
            Emergency
          </span>
        </div>
 
        {/* Driver Profile Summary */}
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-600/10 border border-red-500/20 text-red-400 flex items-center justify-center font-bold text-xs uppercase">
              {driverName.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">{driverName}</h4>
              <p className="text-[10px] text-slate-400 font-semibold">{driverPhone}</p>
              <p className="text-[9px] text-[#0B5A4B] font-extrabold uppercase mt-0.5">{driverHospital}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logoutDriver();
            }}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
 
        {/* Job list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Active Rescue dispatches</h3>
          {activeDispatches.length > 0 ? (
            activeDispatches.map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedBookingId(job.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  job.id === activeBookingId
                    ? 'bg-red-950/30 border-red-500 text-slate-100'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-100">{job.patientName}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-bold">SOS ID: {job.id}</p>
                  </div>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    job.status === 'Requested' ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {job.status}
                  </span>
                </div>
                
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2.5 flex items-start gap-1">
                  <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{job.pickupLocation}</span>
                </p>
              </div>
            ))
          ) : (
            <div className="p-6 text-center border border-dashed border-slate-800 rounded-2xl text-slate-600">
              <p className="text-xs font-semibold italic">No active dispatches.</p>
              <p className="text-[10px] mt-1 text-slate-700">Ready & awaiting hospital assignments.</p>
            </div>
          )}
        </div>
      </div>
 
      {/* Main Map & Navigation HUD */}
      <div className="flex-1 bg-slate-950 p-6 space-y-6 overflow-y-auto">
        {/* Header summary of current status */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-black font-display text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Cuvio Emergency Dispatch Control</span>
            </h2>
            <p className="text-xs font-bold text-slate-400">
              {currentBooking 
                ? `Active Mission: SOS to ${currentBooking.destinationHospitalName} (Patient: ${currentBooking.patientName})`
                : 'Standby mode. Live incoming emergency beacons mapped in real time.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => {
                logoutDriver();
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Driver Logout</span>
            </button>
          </div>
        </div>
 
        {/* Map is ALWAYS rendered as the core center of gravity */}
        <AmbulanceMap 
          booking={currentBooking || null} 
          userRole="driver" 
          onStatusUpdate={(nextStatus) => {
            if (currentBooking) {
              updateAmbulanceStatus(currentBooking.id, nextStatus);
            }
          }}
          onSelectBooking={(id) => {
            setSelectedBookingId(id);
          }}
        />
 
        {currentBooking ? (
          <>
            {/* Active Job Alert Info Card */}
            <div className="bg-red-900/10 border border-red-900/40 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1 z-10">
                <div className="inline-flex bg-red-600 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                  EMERGENCY DISPATCH IN PROGRESS
                </div>
                <h2 className="text-xl font-black font-display text-white tracking-tight">
                  SOS to {currentBooking.destinationHospitalName}
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  Patient Name: {currentBooking.patientName} • {currentBooking.patientPhone}
                </p>
              </div>
 
              {/* Status Badge */}
              <div className="text-left md:text-right z-10 bg-slate-950/80 px-4 py-2 rounded-2xl border border-red-900/30">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Ambulance Mode</p>
                <p className="text-sm font-black text-red-400 font-display mt-0.5">
                  {getStatusDetail(currentBooking.status)}
                </p>
              </div>
            </div>

            {/* Destination Reached Option Form */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
                <Navigation className="w-4 h-4 text-red-500" />
                <span>Driver Actions & Dispatch Progress</span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-3">
                {currentBooking.status === 'Requested' && (
                  <button
                    onClick={() => updateAmbulanceStatus(currentBooking.id, 'Dispatched')}
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Accept Job & Dispatch</span>
                  </button>
                )}

                {currentBooking.status === 'Dispatched' && (
                  <button
                    onClick={() => updateAmbulanceStatus(currentBooking.id, 'Arrived')}
                    className="flex-1 h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Arrival at Patient Location</span>
                  </button>
                )}

                {currentBooking.status === 'Arrived' && (
                  <button
                    onClick={() => updateAmbulanceStatus(currentBooking.id, 'EnRouteToHospital')}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <Navigation className="w-4 h-4 animate-bounce" />
                    <span>Patient Onboard - Start Transit to Hospital</span>
                  </button>
                )}

                {(currentBooking.status === 'EnRouteToHospital' || currentBooking.status === 'Arrived' || currentBooking.status === 'Dispatched') && (
                  <button
                    onClick={() => updateAmbulanceStatus(currentBooking.id, 'Completed')}
                    className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-750 text-white font-black rounded-2xl text-xs cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-950/20 hover:scale-[1.01]"
                  >
                    <Check className="w-4.5 h-4.5 stroke-[3]" />
                    <span>Tick: Destination Reached (Confirm Arrival at Hospital)</span>
                  </button>
                )}
                
                {currentBooking.status === 'Completed' && (
                  <div className="w-full bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-2xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-emerald-400">Destination Reached!</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">The Admin has been notified that the ambulance is ready for next assignment.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
 
            {/* Quick-Access Address Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span>Pickup Coordinates</span>
                </h4>
                <p className="text-sm font-bold text-slate-200">{currentBooking.pickupLocation}</p>
                <p className="text-xs text-slate-400 font-medium">Please locate safely. Sirens enabled. Watch out for road diversions.</p>
              </div>
 
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Destination Trauma Center</span>
                </h4>
                <p className="text-sm font-bold text-slate-200">{currentBooking.destinationHospitalName}</p>
                <p className="text-xs text-slate-400 font-medium">The emergency room management is notified and prepared for immediate trauma offloading.</p>
              </div>
            </div>
          </>
        ) : (
          /* Empty Active Selection state, guiding user to use the map */
          <div className="border border-dashed border-slate-800 rounded-3xl p-8 text-center space-y-3 bg-slate-950">
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Ambulance className="w-8 h-8 text-red-500/60" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">No Active Mission Selected</h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-md mx-auto">
                No active dispatches are currently assigned to your phone number ({driverPhone}) under {driverHospital}.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
