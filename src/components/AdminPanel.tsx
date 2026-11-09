import React, { useState, useEffect } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { BookingRequest, Doctor, AmbulanceBooking } from '../types';
import {
  Calendar, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw,
  User, Check, X, ShieldAlert, Award, Power, Sparkles, LogOut, ArrowRight, Ambulance, Bell, Plus, Trash2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AmbulanceMap from './AmbulanceMap';
import AdminDoctorQueue from './AdminDoctorQueue';

export default function AdminPanel() {
  const {
    bookings: globalBookings,
    doctors: globalDoctors,
    hospitals,
    ambulanceBookings: globalAmbulances,
    updateBookingStatus,
    updateQueueToken,
    updateDoctorStatus,
    updateAmbulanceStatus,
    updateHospitalCharges,
    updateHospitalAmbulancePhone,
    registerHospital,
    registerDriver,
    adminTab,
    setAdminTab,
    setRole,
    adminHospitalId,
    setAdminHospitalId,
    addDoctor,
    removeDoctor,
    requestAmbulance,
    messages,
    sendMessage,
    setPortal
  } = useCuvio();

  // Find logged-in hospital admin context
  const activeHosp = hospitals.find(h => h.id === adminHospitalId) || hospitals[0];
  const displayHospitalName = activeHosp ? activeHosp.name : 'St. Jude Specialty Hospital';

  // Filter all data arrays so this admin only manages and sees their own hospital's data
  const bookings = activeHosp ? globalBookings.filter(b => b.hospitalId === activeHosp.id) : [];
  const doctors = activeHosp ? globalDoctors.filter(d => d.hospitalId === activeHosp.id) : [];
  const ambulanceBookings = activeHosp ? globalAmbulances.filter(a => a.destinationHospitalId === activeHosp.id) : [];

  const [rescheduleBookingId, setRescheduleBookingId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState('02:00 PM');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Hospital Ambulance Department Hotline States
  const [hospAmbulancePhone, setHospAmbulancePhone] = useState(activeHosp?.ambulancePhone || '+91 40 2360 7777');
  const [hospHotline, setHospHotline] = useState(activeHosp?.emergencyHotline || '1066');
  const [isSavingAmbulancePhone, setIsSavingAmbulancePhone] = useState(false);

  useEffect(() => {
    if (activeHosp) {
      setHospAmbulancePhone(activeHosp.ambulancePhone || '+91 40 2360 7777');
      setHospHotline(activeHosp.emergencyHotline || '1066');
    }
  }, [activeHosp]);

  // Hospital Rates States
  const [editHospitalId, setEditHospitalId] = useState('');
  const [chargeConsultation, setChargeConsultation] = useState(500);
  const [chargeAmbulanceBasic, setChargeAmbulanceBasic] = useState(1200);
  const [chargeAmbulanceALS, setChargeAmbulanceALS] = useState(2500);
  const [chargeAmbulanceICU, setChargeAmbulanceICU] = useState(4000);
  const [chargeBandage, setChargeBandage] = useState(150);
  const [chargeOperation, setChargeOperation] = useState(15000);
  const [chargeMedicine, setChargeMedicine] = useState(1200);
  const [chargeIcu, setChargeIcu] = useState(5000);
  const [chargeOther, setChargeOther] = useState(1000);

  // New Hospital Onboarding States
  const [newHospName, setNewHospName] = useState('');
  const [newHospLocation, setNewHospLocation] = useState('');
  const [newHospAbout, setNewHospAbout] = useState('');
  const [newHospSpecialties, setNewHospSpecialties] = useState('General Medicine, Cardiology, Orthopedics');
  const [newHospImage, setNewHospImage] = useState('');
  const [newHospEmergency, setNewHospEmergency] = useState(true);
  const [newHospParking, setNewHospParking] = useState(true);

  // New Doctor form states
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocExperience, setNewDocExperience] = useState('10 yrs exp');
  const [newDocFee, setNewDocFee] = useState<number>(800);
  const [newDocImage, setNewDocImage] = useState('');

  // Emergency Dispatch States
  const [dispatchPatientName, setDispatchPatientName] = useState('');
  const [dispatchPatientPhone, setDispatchPatientPhone] = useState('');
  const [dispatchPickupLocation, setDispatchPickupLocation] = useState('');
  const [dispatchAmbulanceType, setDispatchAmbulanceType] = useState<'Basic' | 'ALS' | 'ICU'>('Basic');
  const [dispatchDriverPhone, setDispatchDriverPhone] = useState('');
  const [dispatchDriverName, setDispatchDriverName] = useState('');
  const [registeredDrivers, setRegisteredDrivers] = useState<any[]>([]);

  // Driver Onboarding States
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverPhone, setNewDriverPhone] = useState('');
  const [driverRefreshCount, setDriverRefreshCount] = useState(0);

  // Fetch registered drivers under this hospital on load and when activeHosp changes
  useEffect(() => {
    try {
      const savedDriversRaw = localStorage.getItem('cuvio_registered_drivers');
      const savedDrivers = savedDriversRaw ? JSON.parse(savedDriversRaw) : {};
      const driverList = Object.values(savedDrivers).filter((d: any) => d.hospitalId === activeHosp?.id || d.hospitalId === activeHosp?.id.toLowerCase());
      
      // Add default Suresh Kumar driver as option
      const defaultDriver = {
        name: 'Suresh Kumar',
        phone: '+91 98888 77777',
        hospitalId: activeHosp?.id,
        hospitalName: activeHosp?.name
      };
      setRegisteredDrivers([defaultDriver, ...driverList]);
      
      // Auto-fill first driver
      setDispatchDriverName(defaultDriver.name);
      setDispatchDriverPhone(defaultDriver.phone);
    } catch (e) {
      console.error("Error loading registered drivers:", e);
    }
  }, [activeHosp, driverRefreshCount]);

  const handleDispatchAmbulance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchPickupLocation || !dispatchPatientName || !dispatchPatientPhone || !dispatchDriverPhone) {
      alert("Please fill all dispatch details.");
      return;
    }
    
    requestAmbulance(
      dispatchPickupLocation,
      activeHosp?.id || hospitals[0]?.id || 'apollo',
      dispatchAmbulanceType,
      dispatchPatientName,
      dispatchPatientPhone,
      dispatchDriverName,
      dispatchDriverPhone,
      'Dispatched'
    );
    
    // Clear inputs
    setDispatchPatientName('');
    setDispatchPatientPhone('');
    setDispatchPickupLocation('');
    setDispatchAmbulanceType('Basic');
  };

  // Default specialty dropdown to hospital's first specialty
  useEffect(() => {
    if (activeHosp && activeHosp.specialties && activeHosp.specialties.length > 0) {
      setNewDocSpecialty(activeHosp.specialties[0]);
    } else {
      setNewDocSpecialty('General Medicine');
    }
  }, [activeHosp]);

  // Synchronize dynamic inputs when editHospitalId or adminHospitalId changes
  useEffect(() => {
    const targetHospId = adminHospitalId || editHospitalId || (hospitals[0]?.id || '');
    const activeHospForCharges = hospitals.find(h => h.id === targetHospId) || hospitals[0];
    if (activeHospForCharges) {
      if (!editHospitalId || editHospitalId !== activeHospForCharges.id) {
        setEditHospitalId(activeHospForCharges.id);
      }
      const charges = activeHospForCharges.charges || {
        consultation: activeHospForCharges.startsAt || 500,
        ambulanceBasic: 1200,
        ambulanceALS: 2500,
        ambulanceICU: 4000,
        bandage: 150,
        operation: 15000,
        medicine: 1200,
        icu: 5000,
        other: 1000
      };
      setChargeConsultation(charges.consultation);
      setChargeAmbulanceBasic(charges.ambulanceBasic);
      setChargeAmbulanceALS(charges.ambulanceALS);
      setChargeAmbulanceICU(charges.ambulanceICU);
      setChargeBandage(charges.bandage);
      setChargeOperation(charges.operation);
      setChargeMedicine(charges.medicine);
      setChargeIcu(charges.icu);
      setChargeOther(charges.other);
    }
  }, [editHospitalId, hospitals, adminHospitalId]);

  // Remind patient helper function
  const triggerReminder = (patientName: string, phone: string, doctorName: string, token: string | number = "12") => {
    setToastMessage(`📱 SMS Sent to ${patientName} (${phone}): "Next is you! Token #${token}, please proceed to Dr. ${doctorName}'s cabin immediately."`);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  // Counts for badge notifications
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const activeQueueCount = bookings.filter(b => b.status === 'Confirmed').length;
  const activeEmergencies = ambulanceBookings.filter(b => b.status === 'Requested' || b.status === 'Dispatched').length;
  const clinicMessages = activeHosp ? messages.filter(m => m.clinicId === activeHosp.id) : [];
  const patientMessagesCount = clinicMessages.filter(m => m.from === 'patient').length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-32">
      {/* Top Banner Header */}
      <header className="sticky top-0 w-full flex justify-between items-center px-6 h-16 bg-slate-950/80 backdrop-blur border-b border-slate-800 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B5A4B] flex items-center justify-center font-bold text-white shadow-lg">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={adminHospitalId || (hospitals[0]?.id || '')}
                onChange={(e) => setAdminHospitalId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white px-2.5 py-1 focus:outline-none focus:border-[#0B5A4B] cursor-pointer"
              >
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id} className="bg-slate-900 text-white font-sans">
                    {h.name} Account
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Hospital Admin Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <span className="text-xs font-bold text-white">Chief Admin Desk</span>
            <p className="text-[9px] text-emerald-400 font-bold uppercase flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live Server Synced
            </p>
          </div>
          <button
            onClick={() => setRole('patient')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Patient Mode</span>
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow">
          <button
            onClick={() => setAdminTab('bookings')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer relative ${
              adminTab === 'bookings' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Booking Requests</span>
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('queue')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
              adminTab === 'queue' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active Queue
            {activeQueueCount > 0 && (
              <span className="ml-1.5 bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                {activeQueueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('doctors')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer ${
              adminTab === 'doctors' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Doctor Status
          </button>

          <button
            onClick={() => setAdminTab('emergency')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer relative ${
              adminTab === 'emergency' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Emergency Alerts</span>
            {activeEmergencies > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-ping" />
            )}
          </button>

          <button
            onClick={() => setAdminTab('messages')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer relative ${
              adminTab === 'messages' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Patient Messages</span>
            {patientMessagesCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {patientMessagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`flex-1 py-3 text-center rounded-xl text-xs font-bold font-display transition-all cursor-pointer relative ${
              adminTab === 'settings' ? 'bg-[#0B5A4B] text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Hospital Settings</span>
          </button>
        </div>

        {/* Tab Content Canvas */}
        <AnimatePresence mode="wait">
          
          {/* TAB 1: BOOKING REQUESTS MANAGER */}
          {adminTab === 'bookings' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Real-time administrative notifications feed */}
              <div className="bg-[#0B5A4B]/10 border border-[#0B5A4B]/30 p-5 rounded-3xl space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live Patient Booking Alerts Inbox</p>
                </div>
                {bookings.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No alerts received yet. Awaiting patient bookings.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {bookings.map((b) => (
                      <div key={b.id} className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-2.5 text-xs">
                        <span className="text-lg shrink-0">📱</span>
                        <div className="space-y-0.5">
                          <p className="text-slate-300 leading-relaxed">
                            <strong>SMS Alert:</strong> Patient <strong className="text-white">{b.patientName}</strong> has requested <strong className="text-emerald-400">{b.department}</strong> consultation at our facility.
                          </p>
                          <p className="text-[10px] text-slate-500 font-bold">Ref: #{b.id} • Patient Contact: {b.patientPhone || '+91 98765 43210'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Incoming Booking Requests</h2>
                  <p className="text-xs text-slate-400">Review patient consultation appointments, assign tokens, and accept/reject claims.</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl uppercase">
                  {pendingCount} Pending
                </span>
              </div>

              {bookings.filter(b => b.status === 'Pending').length > 0 ? (
                bookings.filter(b => b.status === 'Pending').map((booking) => (
                  <div key={booking.id} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white font-display">{booking.patientName}</h4>
                          <p className="text-xs text-slate-400">{booking.patientPhone || '+91 98765 43210'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-blue-400 bg-blue-950/50 border border-blue-900/30 px-3 py-1 rounded-full uppercase tracking-wider">
                          {booking.department}
                        </span>
                        <p className="text-xs text-slate-400 font-bold mt-1.5">{booking.time}</p>
                      </div>
                    </div>

                    {/* Reschedule Mode */}
                    {rescheduleBookingId === booking.id ? (
                      <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                        <p className="text-xs font-bold text-slate-300">Select Reschedule Time Slot</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            placeholder="e.g. 02:30 PM"
                            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none w-36"
                          />
                          <button
                            onClick={() => {
                              updateBookingStatus(booking.id, 'Rescheduled', rescheduleTime);
                              setRescheduleBookingId(null);
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setRescheduleBookingId(null)}
                            className="bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => updateBookingStatus(booking.id, 'Confirmed')}
                        className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm & Assign Token</span>
                      </button>

                      <button
                        onClick={() => setRescheduleBookingId(booking.id)}
                        className="h-11 px-4 border border-slate-700 text-slate-300 hover:bg-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                      >
                        Reschedule
                      </button>

                      <button
                        onClick={() => updateBookingStatus(booking.id, 'Rejected')}
                        className="h-11 px-3.5 hover:bg-red-950/20 text-red-500 rounded-xl text-xs font-bold border border-red-900/30 cursor-pointer transition-all"
                        title="Reject Appointment"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950 rounded-3xl p-12 text-center border border-slate-800 shadow">
                  <p className="text-slate-500 text-sm font-semibold italic">No pending appointment requests at this moment.</p>
                  <p className="text-xs text-slate-600 mt-1">Switch to Patient View and book an appointment to see requests instantly synced here.</p>
                </div>
              )}

              {/* HISTORICAL BOOKING AUDIT LOGS */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow space-y-4 mt-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                      All Patient Booking History & Logs
                    </h3>
                    <p className="text-[11px] text-slate-400">Complete historical timeline of when and what each patient booked.</p>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl uppercase">
                    Total Bookings: {bookings.length}
                  </div>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {bookings.length > 0 ? (
                    bookings.map((b) => (
                      <div key={b.id} className="p-4 bg-slate-900/65 rounded-2xl border border-slate-800/60 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-900 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                            b.status === 'Completed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                            b.status === 'Confirmed' ? 'bg-blue-950 text-blue-400 border border-blue-900/30' :
                            b.status === 'Rescheduled' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                            b.status === 'Rejected' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            <User className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-xs">{b.patientName}</p>
                              <span className="text-[9px] text-slate-500 font-medium">({b.patientPhone || 'No Phone'})</span>
                            </div>
                            <p className="text-[11px] text-slate-300 mt-0.5">
                              Booked <span className="font-bold text-blue-400">{b.doctorName}</span> ({b.department})
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                              Hospital: {b.hospitalName}
                            </p>
                          </div>
                        </div>

                        <div className="text-left sm:text-right flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2 sm:gap-1.5">
                          <div>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                              b.status === 'Completed' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-900/40' :
                              b.status === 'Confirmed' ? 'bg-blue-950/80 text-blue-400 border-blue-900/40' :
                              b.status === 'Rescheduled' ? 'bg-amber-950/80 text-amber-400 border-amber-900/40' :
                              b.status === 'Rejected' ? 'bg-rose-950/80 text-rose-400 border-rose-900/40' :
                              'bg-slate-900 text-slate-400 border-slate-800'
                            }`}>
                              {b.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{b.date} • {b.time}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 italic text-center py-4">No historical bookings logged.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: LIVE QUEUE CONTROL */}
          {adminTab === 'queue' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-white font-display">Live Queue Operations</h2>
                <p className="text-xs text-slate-400">Mark tokens Waiting, In Consultation, or Completed to shift patients forward and auto-recalculate waiting delays.</p>
              </div>

              <div className="space-y-6">
                {doctors.map(doc => (
                  <AdminDoctorQueue
                    key={doc.id}
                    doctor={doc}
                    hospital={activeHosp}
                    allBookings={globalBookings}
                    onTriggerReminder={(name, phone, docName, token) => {
                      // Trigger SMS/reminder feedback in UI
                      setToastMessage(`SMS Alert dispatched to ${name} (${phone}) for Token #${token}`);
                      setTimeout(() => setToastMessage(null), 4000);
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: DOCTOR STATUS & DELAYS PANEL */}
          {adminTab === 'doctors' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Specialist Availability & Rosters</h2>
                  <p className="text-xs text-slate-400">Add or remove specialists, select clinical departments, and toggle active shift statuses.</p>
                </div>
              </div>

              {/* Add New Doctor Form Card */}
              <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
                <div className="flex items-center gap-2 border-b border-slate-850 pb-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0B5A4B] to-[#10b981] flex items-center justify-center shadow-lg shadow-emerald-950/40">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">Onboard Medical Specialist</h3>
                    <p className="text-[10px] text-slate-400">Register new doctors and add them to the available specialties.</p>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!newDocName.trim()) return;
                  addDoctor({
                    hospitalId: activeHosp.id,
                    name: newDocName,
                    specialty: newDocSpecialty || activeHosp.specialties[0] || 'General Medicine',
                    experience: newDocExperience || '8 yrs exp',
                    fee: Number(newDocFee) || 500,
                    image: newDocImage || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
                    nextSlot: '10:00 AM'
                  });
                  setNewDocName('');
                  setNewDocImage('');
                  setToastMessage(`✓ Specialist ${newDocName} registered successfully!`);
                  setTimeout(() => setToastMessage(null), 3000);
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doctor Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Ramesh Patel"
                        value={newDocName}
                        onChange={(e) => setNewDocName(e.target.value)}
                        className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/30 focus:border-[#0B5A4B] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Department</label>
                      <select
                        value={newDocSpecialty}
                        onChange={(e) => setNewDocSpecialty(e.target.value)}
                        className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/30 focus:border-[#0B5A4B] transition-all cursor-pointer"
                      >
                        {(activeHosp?.specialties || ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'ENT', 'Dermatology']).map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Years of Experience</label>
                      <input
                        type="text"
                        placeholder="e.g. 12 yrs exp"
                        value={newDocExperience}
                        onChange={(e) => setNewDocExperience(e.target.value)}
                        className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/30 focus:border-[#0B5A4B] transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consultation Fee (₹)</label>
                      <input
                        type="number"
                        placeholder="800"
                        value={newDocFee || ''}
                        onChange={(e) => setNewDocFee(Number(e.target.value))}
                        className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/30 focus:border-[#0B5A4B] transition-all"
                      />
                    </div>
                  </div>

                  {/* PRESET AVATAR QUICK SELECTOR (Anti-AI template, Bespoke UI feel) */}
                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Specialist Avatar</label>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                      {[
                        { name: 'Male 1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500' },
                        { name: 'Female 1', url: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=500' },
                        { name: 'Male 2', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=500' },
                        { name: 'Female 2', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500' },
                      ].map((avatar) => {
                        const isSelected = newDocImage === avatar.url;
                        return (
                          <button
                            key={avatar.url}
                            type="button"
                            onClick={() => setNewDocImage(avatar.url)}
                            className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer focus:outline-none ${
                              isSelected ? 'border-emerald-400 scale-105 shadow-md shadow-emerald-950' : 'border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                            {isSelected && (
                              <span className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                                <Check className="w-5 h-5 text-emerald-400 font-bold" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <div className="col-span-4 sm:col-span-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl p-1">
                        <span className="text-[9px] text-slate-500 font-semibold text-center leading-tight">Or paste URL below</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Photo URL</label>
                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={newDocImage}
                      onChange={(e) => setNewDocImage(e.target.value)}
                      className="w-full h-11 bg-slate-900 border border-slate-800 rounded-xl px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0B5A4B] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-[#0B5A4B] to-[#073D33] hover:from-[#0E705D] hover:to-[#0B5A4B] active:scale-[0.99] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer pt-0.5 mt-4"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Onboard & Synchronize Specialist</span>
                  </button>
                </form>
              </div>

              {/* Roster list */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Specialist Roster</h3>
                  <span className="text-[10px] bg-[#0B5A4B]/20 border border-[#0B5A4B]/30 px-2.5 py-1 rounded-full text-emerald-400 font-bold">{doctors.length} Registered</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map(doc => (
                    <div key={doc.id} className="bg-slate-950 p-5 rounded-3xl border border-slate-800/60 shadow-lg hover:border-slate-700 transition-all duration-300 relative group flex flex-col justify-between gap-4">
                      {/* Delete button at top right */}
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${doc.name}?`)) {
                            removeDoctor(doc.id);
                            setToastMessage(`✗ Specialist ${doc.name} removed from roster.`);
                            setTimeout(() => setToastMessage(null), 3000);
                          }
                        }}
                        className="absolute right-3.5 top-3.5 p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-xl transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Doctor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex gap-4">
                        <div className="w-16 h-18 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 shadow-inner">
                          <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow space-y-1 pr-6">
                          <h4 className="font-bold text-white font-display text-sm leading-snug">{doc.name}</h4>
                          <span className="inline-block text-[10px] bg-slate-900 text-emerald-400 border border-emerald-950/50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{doc.specialty}</span>
                          <p className="text-[11px] text-slate-400 font-medium">{doc.experience}</p>
                          
                          <div className="flex gap-4 pt-1">
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Fee: <span className="text-slate-200 font-extrabold">₹{doc.fee}</span></p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Status: <span className={`${
                              doc.availability === 'Available' ? 'text-emerald-400' : doc.availability === 'On Break' ? 'text-amber-400' : 'text-rose-400'
                            } font-extrabold`}>{doc.availability}</span></p>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-900">
                        <button
                          onClick={() => updateDoctorStatus(doc.id, 'Available')}
                          className={`py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            doc.availability === 'Available'
                              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-950/20'
                              : 'bg-slate-900/60 border border-slate-850 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Available
                        </button>

                        <button
                          onClick={() => updateDoctorStatus(doc.id, 'On Break')}
                          className={`py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            doc.availability === 'On Break'
                              ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-950/20'
                              : 'bg-slate-900/60 border border-slate-850 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          On Break
                        </button>

                        <button
                          onClick={() => updateDoctorStatus(doc.id, 'Unavailable')}
                          className={`py-2 rounded-xl text-[10px] font-bold cursor-pointer transition-all ${
                            doc.availability === 'Unavailable'
                              ? 'bg-gradient-to-br from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/20'
                              : 'bg-slate-900/60 border border-slate-850 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          Unavailable
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: EMERGENCY ALERTS */}
          {adminTab === 'emergency' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div>
                <h2 className="text-lg font-bold text-white font-display">Real-Time Emergency SOS alerts</h2>
                <p className="text-xs text-slate-400">Blinking distress alerts synchronized with active patient GPS triggers. Approve dispatches immediately.</p>
              </div>

              {/* HOSPITAL AMBULANCE DEPARTMENT NUMBER & HOTLINE CONFIGURATION */}
              <div className="bg-gradient-to-r from-red-950/40 via-slate-950 to-slate-950 border border-red-900/60 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-md">
                      <Ambulance className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">
                        Hospital Ambulance Department Contact
                      </h3>
                      <p className="text-xs text-slate-400">
                        Official ambulance dispatch contact for {displayHospitalName}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-3 py-1 rounded-full font-bold uppercase tracking-wider self-start sm:self-auto">
                    Patient 1-Tap Dialing Active
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!hospAmbulancePhone.trim()) {
                      setToastMessage("⚠️ Please provide a valid phone number.");
                      setTimeout(() => setToastMessage(null), 3000);
                      return;
                    }
                    setIsSavingAmbulancePhone(true);
                    try {
                      await updateHospitalAmbulancePhone(activeHosp.id, hospAmbulancePhone.trim(), hospHotline.trim());
                      setToastMessage(`✓ Ambulance Department contact updated for ${activeHosp.name}! Patients can now call ${hospAmbulancePhone}.`);
                      setTimeout(() => setToastMessage(null), 5000);
                    } catch (err: any) {
                      setToastMessage(`❌ Failed to update ambulance department: ${err.message || 'Error'}`);
                      setTimeout(() => setToastMessage(null), 5000);
                    } finally {
                      setIsSavingAmbulancePhone(false);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Ambulance Department Direct Number
                    </label>
                    <input
                      type="text"
                      required
                      value={hospAmbulancePhone}
                      onChange={(e) => setHospAmbulancePhone(e.target.value)}
                      placeholder="+91 40 2360 7777"
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      24/7 Trauma Hotline Extension
                    </label>
                    <input
                      type="text"
                      value={hospHotline}
                      onChange={(e) => setHospHotline(e.target.value)}
                      placeholder="1066 (24/7 Trauma)"
                      className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={isSavingAmbulancePhone}
                      className="w-full h-11 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      {isSavingAmbulancePhone ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Check className="w-4 h-4 text-white" />
                      )}
                      <span>Save Ambulance Dept Number</span>
                    </button>
                  </div>
                </form>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 This verified telephone number appears automatically on patient hospital cards, landing page emergency directories, and is provided by the Cuvio AI Assistant whenever patients ask for emergency ambulance contact.
                </p>
              </div>

              {/* GRID CONTAINER FOR DISPATCH & REGISTRATION */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* ADMIN DISPATCH FORM */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Ambulance className="w-5 h-5 text-red-500 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">
                      Assign & Dispatch Ambulance Destination
                    </h3>
                  </div>
                  <form onSubmit={handleDispatchAmbulance} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Patient Name */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Patient Name
                      </label>
                      <input
                        type="text"
                        required
                        value={dispatchPatientName}
                        onChange={(e) => setDispatchPatientName(e.target.value)}
                        placeholder="e.g. Ramesh Chandra"
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Patient Phone */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Patient Phone
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={dispatchPatientPhone}
                        onChange={(e) => setDispatchPatientPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Pickup Location / Patient Location */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Patient Pickup Location (Address / GPS Coordinates)
                      </label>
                      <input
                        type="text"
                        required
                        value={dispatchPickupLocation}
                        onChange={(e) => setDispatchPickupLocation(e.target.value)}
                        placeholder="e.g. Flat 302, Sector-4, Near Central Park"
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Ambulance Type */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Ambulance Service Type
                      </label>
                      <select
                        value={dispatchAmbulanceType}
                        onChange={(e) => setDispatchAmbulanceType(e.target.value as any)}
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                      >
                        <option value="Basic">Basic Life Support (BLS)</option>
                        <option value="ALS">Advanced Life Support (ALS)</option>
                        <option value="ICU">Mobile ICU Cardiac Care</option>
                      </select>
                    </div>

                    {/* Driver Selection */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Select Ambulance & Driver
                      </label>
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'custom') {
                            setDispatchDriverName('');
                            setDispatchDriverPhone('');
                          } else {
                            const d = registeredDrivers.find(drv => drv.phone === val);
                            if (d) {
                              setDispatchDriverName(d.name);
                              setDispatchDriverPhone(d.phone);
                            }
                          }
                        }}
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer animate-none"
                      >
                        {registeredDrivers.map(d => (
                          <option key={d.phone} value={d.phone}>
                            {d.name} ({d.phone})
                          </option>
                        ))}
                        <option value="custom">+ Assign Unregistered Driver...</option>
                      </select>
                    </div>

                    {/* Custom Driver Fields (if custom selected) */}
                    {!registeredDrivers.some(d => d.phone === dispatchDriverPhone) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2 border-t border-slate-900 pt-4 mt-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            Custom Driver Name
                          </label>
                          <input
                            type="text"
                            required
                            value={dispatchDriverName}
                            onChange={(e) => setDispatchDriverName(e.target.value)}
                            placeholder="Driver Name"
                            className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                            Custom Driver Mobile Number
                          </label>
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            value={dispatchDriverPhone}
                            onChange={(e) => setDispatchDriverPhone(e.target.value.replace(/\D/g, ''))}
                            placeholder="9876543210"
                            className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="md:col-span-2 pt-2">
                      <button
                        type="submit"
                        className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-red-950/20"
                      >
                        <span>Create Assignment & Dispatch Driver</span>
                      </button>
                    </div>

                  </form>
                </div>

                {/* ONBOARD NEW AMBULANCE & DRIVER FORM */}
                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Plus className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-display">
                      Onboard New Ambulance & Driver
                    </h3>
                  </div>
                  
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newDriverName.trim() || !newDriverPhone.trim() || newDriverPhone.replace(/\D/g, '').length < 10) {
                      setToastMessage("⚠️ Please enter a valid name and 10-digit mobile number.");
                      setTimeout(() => setToastMessage(null), 3000);
                      return;
                    }
                    try {
                      await registerDriver(newDriverName, newDriverPhone.replace(/\D/g, ''), activeHosp.id, activeHosp.name);
                      setNewDriverName('');
                      setNewDriverPhone('');
                      setDriverRefreshCount(prev => prev + 1);
                      setToastMessage(`✓ New Ambulance Driver ${newDriverName} registered and assigned to ${activeHosp.name}!`);
                      setTimeout(() => setToastMessage(null), 5000);
                    } catch (err: any) {
                      setToastMessage(`❌ Error: ${err.message || 'Could not register driver'}`);
                      setTimeout(() => setToastMessage(null), 5000);
                    }
                  }} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Driver Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={newDriverName}
                        onChange={(e) => setNewDriverName(e.target.value)}
                        placeholder="e.g. Mukesh Kumar"
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Driver 10-Digit Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={newDriverPhone}
                        onChange={(e) => setNewDriverPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 9888812345"
                        className="w-full h-11 px-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                      <p className="text-[10px] text-slate-500">This number will log into the Driver App console to manage dispatches.</p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        className="w-full h-11 bg-[#0B5A4B] hover:bg-[#073c32] text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/20"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Register Driver & Add Ambulance</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {ambulanceBookings.length > 0 ? (
                ambulanceBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-3xl border shadow space-y-4 transition-all relative overflow-hidden ${
                      b.status === 'Requested'
                        ? 'bg-red-950/30 border-red-900/60 animate-pulse'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    {/* Glowing background decor for emergency */}
                    {b.status === 'Requested' && (
                      <div className="absolute right-0 top-0 p-6 text-red-500/20">
                        <ShieldAlert className="w-24 h-24" />
                      </div>
                    )}

                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold ${
                          b.status === 'Requested' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          <Ambulance className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white font-display">{b.patientName}</h4>
                          <p className="text-xs text-slate-400">Phone: {b.patientPhone}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                          b.status === 'Requested' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {b.status}
                        </span>
                        <p className="text-xs text-slate-400 font-bold mt-1.5">{b.type} Ambulance type</p>
                      </div>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-xs space-y-2 relative z-10">
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Pickup Address:</strong> {b.pickupLocation}
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Simulated Route Distance:</strong> {b.distance} km • ETA: {b.driverEta} mins
                      </p>
                    </div>

                    {/* Live Synchronized Tracker Map */}
                    <div className="relative z-10">
                      <AmbulanceMap booking={b} userRole="admin" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 relative z-10">
                      {b.status === 'Requested' && (
                        <button
                          onClick={() => updateAmbulanceStatus(b.id, 'Dispatched')}
                          className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                        >
                          Approve SOS & Dispatch Ambulance
                        </button>
                      )}

                      {b.status === 'Dispatched' && (
                        <button
                          onClick={() => updateAmbulanceStatus(b.id, 'Arrived')}
                          className="flex-1 h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                        >
                          Confirm Arrival at Patient Location
                        </button>
                      )}

                      {b.status === 'Arrived' && (
                        <div className="flex-1 space-y-2">
                          <p className="text-xs text-amber-400 font-bold">● Ambulance reached patient! Prepare transit.</p>
                          <button
                            onClick={() => updateAmbulanceStatus(b.id, 'EnRouteToHospital')}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            Patient Onboard - Head En-Route to Hospital
                          </button>
                        </div>
                      )}

                      {b.status === 'EnRouteToHospital' && (
                        <div className="flex-1 space-y-2">
                          <p className="text-xs text-blue-400 font-bold">● Ambulance speeding en-route to Emergency Ward.</p>
                          <button
                            onClick={() => updateAmbulanceStatus(b.id, 'Completed')}
                            className="w-full h-11 bg-emerald-600 hover:bg-[#0B5A4B] text-white font-bold rounded-xl text-xs cursor-pointer"
                          >
                            Confirm Check-In at Emergency Ward
                          </button>
                        </div>
                      )}

                      {b.status === 'Completed' && (
                        <span className="text-xs text-emerald-500 font-bold flex items-center gap-1.5 bg-emerald-950/40 p-3 rounded-xl border border-emerald-900/40">
                          <CheckCircle className="w-4 h-4" />
                          <span>Ambulance has safely arrived at Hospital & Checked-In at Emergency Ward!</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950 rounded-3xl p-12 text-center border border-slate-800 shadow">
                  <p className="text-slate-500 text-sm font-semibold italic">No active Emergency SOS requests at this moment.</p>
                  <p className="text-xs text-slate-600 mt-1">Switch to Patient View, click the Emergency SOS Ambulance card, and send a dispatch request to see a real-time ringing alert here.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 5: HOSPITAL CHARGES & REGISTRATION SETTINGS */}
          {adminTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-lg font-bold text-white font-display">Hospital Settings & Rates Controller</h2>
                <p className="text-xs text-slate-400">Edit billing charges dynamically, register brand-new hospitals instantly, and audit system-wide rates in real-time.</p>
              </div>

              {/* Grid with Edit Charges and Register New Hospital */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Block: Dynamic Rate Controller */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Dynamic Rate Controller
                  </h3>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital Under Modification</label>
                    {adminHospitalId ? (
                      <div className="w-full h-11 px-3.5 bg-slate-900 border border-emerald-900 rounded-xl text-emerald-400 text-xs font-semibold flex items-center justify-between">
                        <span>{activeHosp?.name}</span>
                        <span className="text-[9px] bg-emerald-950 px-2 py-0.5 border border-emerald-800 rounded font-bold text-emerald-400 uppercase">Logged In</span>
                      </div>
                    ) : (
                      <select
                        value={editHospitalId}
                        onChange={(e) => setEditHospitalId(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold focus:outline-none focus:border-[#0B5A4B]"
                      >
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Grid of charges */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">OPD Consultation (₹)</label>
                      <input
                        type="number"
                        value={chargeConsultation}
                        onChange={(e) => setChargeConsultation(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">OPD Dressing/Patti (₹)</label>
                      <input
                        type="number"
                        value={chargeBandage}
                        onChange={(e) => setChargeBandage(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Base Medicine Fee (₹)</label>
                      <input
                        type="number"
                        value={chargeMedicine}
                        onChange={(e) => setChargeMedicine(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ICU Daily Rate (₹)</label>
                      <input
                        type="number"
                        value={chargeIcu}
                        onChange={(e) => setChargeIcu(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Standard Surgical Op (₹)</label>
                      <input
                        type="number"
                        value={chargeOperation}
                        onChange={(e) => setChargeOperation(Number(e.target.value))}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                  </div>

                  {/* Ambulance Rates header */}
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pt-2">Ambulance SOS Charges (₹)</p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">Basic Ambulance</label>
                      <input
                        type="number"
                        value={chargeAmbulanceBasic}
                        onChange={(e) => setChargeAmbulanceBasic(Number(e.target.value))}
                        className="w-full h-10 px-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">ALS Ambulance</label>
                      <input
                        type="number"
                        value={chargeAmbulanceALS}
                        onChange={(e) => setChargeAmbulanceALS(Number(e.target.value))}
                        className="w-full h-10 px-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-500 uppercase">ICU Ambulance</label>
                      <input
                        type="number"
                        value={chargeAmbulanceICU}
                        onChange={(e) => setChargeAmbulanceICU(Number(e.target.value))}
                        className="w-full h-10 px-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      updateHospitalCharges(editHospitalId, {
                        consultation: chargeConsultation,
                        ambulanceBasic: chargeAmbulanceBasic,
                        ambulanceALS: chargeAmbulanceALS,
                        ambulanceICU: chargeAmbulanceICU,
                        bandage: chargeBandage,
                        operation: chargeOperation,
                        medicine: chargeMedicine,
                        icu: chargeIcu,
                        other: chargeOther
                      });
                      const selectedHosp = hospitals.find(h => h.id === editHospitalId);
                      setToastMessage(`⚡ Dynamic rates updated for "${selectedHosp?.name || 'Hospital'}"! Patients will instantly see the new price structure.`);
                      setTimeout(() => setToastMessage(null), 5000);
                    }}
                    className="w-full h-11 bg-[#0B5A4B] hover:bg-[#073c32] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer mt-4"
                  >
                    Sync & Update Charges Now
                  </button>
                </div>

                {/* Right Block: Onboard New Hospital */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-3">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Onboard New Hospital Facility
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hospital Name</label>
                      <input
                        type="text"
                        value={newHospName}
                        onChange={(e) => setNewHospName(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                        placeholder="e.g. Max Super Speciality Hospital"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location / Address</label>
                      <input
                        type="text"
                        value={newHospLocation}
                        onChange={(e) => setNewHospLocation(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                        placeholder="e.g. Hitech City, Hyderabad"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialties (comma-separated)</label>
                      <input
                        type="text"
                        value={newHospSpecialties}
                        onChange={(e) => setNewHospSpecialties(e.target.value)}
                        className="w-full h-10 px-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">About / Description</label>
                      <textarea
                        value={newHospAbout}
                        onChange={(e) => setNewHospAbout(e.target.value)}
                        className="w-full h-14 p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] resize-none"
                        placeholder="Provide details about care quality, bed capacity, or history..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Emergency Ward</span>
                        <button
                          onClick={() => setNewHospEmergency(!newHospEmergency)}
                          className={`w-10 h-5.5 rounded-full p-0.5 relative transition-colors cursor-pointer ${newHospEmergency ? 'bg-[#0B5A4B]' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${newHospEmergency ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Valet Parking</span>
                        <button
                          onClick={() => setNewHospParking(!newHospParking)}
                          className={`w-10 h-5.5 rounded-full p-0.5 relative transition-colors cursor-pointer ${newHospParking ? 'bg-[#0B5A4B]' : 'bg-slate-700'}`}
                        >
                          <div className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${newHospParking ? 'translate-x-4.5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!newHospName || !newHospLocation) {
                        setToastMessage('❌ Please provide at least Hospital Name and Location address!');
                        setTimeout(() => setToastMessage(null), 4000);
                        return;
                      }
                      
                      const specialtyArray = newHospSpecialties.split(',').map(s => s.trim()).filter(Boolean);

                      registerHospital({
                        name: newHospName,
                        location: newHospLocation,
                        about: newHospAbout || `${newHospName} is a state-of-the-art medical center dedicated to patient welfare.`,
                        specialties: specialtyArray,
                        image: newHospImage || 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?auto=format&fit=crop&q=80&w=1200',
                        emergencyAvailable: newHospEmergency,
                        parkingAvailable: newHospParking,
                        charges: {
                          consultation: 500,
                          ambulanceBasic: 1200,
                          ambulanceALS: 2500,
                          ambulanceICU: 4000,
                          bandage: 150,
                          operation: 15000,
                          medicine: 1200,
                          icu: 5000,
                          other: 1000
                        }
                      });

                      setToastMessage(`🎉 Hospital "${newHospName}" registered successfully! Doctors have been assigned automatically.`);
                      setTimeout(() => setToastMessage(null), 5000);
                      
                      // Clear form
                      setNewHospName('');
                      setNewHospLocation('');
                      setNewHospAbout('');
                    }}
                    className="w-full h-11 bg-[#0B5A4B] hover:bg-[#073c32] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer mt-2"
                  >
                    Register & Onboard Hospital
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 6: PATIENT MESSAGES DESK */}
          {adminTab === 'messages' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <span>Patient Front Desk Messages</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h2>
                  <p className="text-xs text-slate-400">Direct real-time inquiries from patients connected to {displayHospitalName}</p>
                </div>
                <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
                  Live Firestore Channel
                </div>
              </div>

              {/* Messages Container */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                <div className="max-h-[420px] min-h-[200px] overflow-y-auto space-y-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80">
                  {clinicMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm font-bold text-slate-400">No Patient Messages Yet</p>
                      <p className="text-xs mt-1 text-slate-500">When patients ask questions via the Patient Portal, their messages will arrive here immediately.</p>
                    </div>
                  ) : (
                    clinicMessages
                      .sort((a, b) => (a.createdAt || a.timestamp || 0) - (b.createdAt || b.timestamp || 0))
                      .map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${msg.from === 'hospital' ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                              msg.from === 'hospital'
                                ? 'bg-gradient-to-r from-[#6C8CFF] to-[#3552C8] text-white rounded-br-none shadow-md'
                                : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none shadow'
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-80 mb-0.5 flex items-center gap-1.5">
                              {msg.from === 'hospital' ? 'You (Hospital Desk)' : 'Patient Inquirer'}
                            </div>
                            <div className="text-xs font-medium">{msg.text}</div>
                          </div>
                          <span className="text-[9px] text-slate-500 mt-1 px-1">
                            {new Date(msg.createdAt || msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                  )}
                </div>

                {/* Reply Bar */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!replyText.trim() || isSendingReply || !activeHosp) return;
                    setIsSendingReply(true);
                    try {
                      await sendMessage(activeHosp.id, activeHosp.name, replyText.trim(), 'hospital');
                      setReplyText('');
                      setToastMessage("Reply dispatched to patient!");
                      setTimeout(() => setToastMessage(null), 3000);
                    } catch (err) {
                      console.error("Failed to reply:", err);
                    } finally {
                      setIsSendingReply(false);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type reply to patient..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#6C8CFF]"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-[#6C8CFF] to-[#3552C8] hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg"
                  >
                    {isSendingReply ? 'Sending...' : 'Reply'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Persistent Swapper bar just for Admin mode */}
      <footer className="fixed bottom-0 w-full z-30 flex md:hidden justify-around items-center pt-2 pb-6 px-4 bg-slate-950 border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.2)] rounded-t-3xl text-xs">
        <button
          onClick={() => setAdminTab('bookings')}
          className={`flex flex-col items-center justify-center p-1.5 cursor-pointer ${
            adminTab === 'bookings' ? 'text-blue-500' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Bookings</span>
        </button>

        <button
          onClick={() => setAdminTab('queue')}
          className={`flex flex-col items-center justify-center p-1.5 cursor-pointer ${
            adminTab === 'queue' ? 'text-blue-500' : 'text-slate-500'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Live Queue</span>
        </button>

        <button
          onClick={() => setAdminTab('messages')}
          className={`flex flex-col items-center justify-center p-1.5 cursor-pointer ${
            adminTab === 'messages' ? 'text-emerald-400' : 'text-slate-500'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Messages</span>
        </button>

        <button
          onClick={() => setAdminTab('emergency')}
          className={`flex flex-col items-center justify-center p-1.5 cursor-pointer ${
            adminTab === 'emergency' ? 'text-red-500' : 'text-slate-500'
          }`}
        >
          <Ambulance className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">SOS</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`flex flex-col items-center justify-center p-1.5 cursor-pointer ${
            adminTab === 'settings' ? 'text-[#0B5A4B]' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Settings</span>
        </button>
      </footer>

      {/* Toast Notification Banner */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-blue-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-start gap-3 border border-blue-500"
          >
            <Bell className="w-5 h-5 flex-shrink-0 text-white animate-bounce mt-0.5" />
            <div className="flex-grow">
              <p className="text-xs font-bold leading-relaxed">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setToastMessage(null)} 
              className="text-white hover:text-blue-200 cursor-pointer font-bold text-xs"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
