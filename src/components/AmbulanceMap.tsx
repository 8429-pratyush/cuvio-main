import React, { useState, useEffect } from 'react';
import { Ambulance, MapPin, Compass, Navigation, Info, ShieldAlert, Phone, Map as MapIcon, Layers, Bell, Shield } from 'lucide-react';
import { AmbulanceBooking } from '../types';
import { useCuvio } from '../context/CuvioContext';

interface AmbulanceMapProps {
  booking?: AmbulanceBooking | null;
  userRole: 'patient' | 'admin' | 'driver';
  onStatusUpdate?: (status: AmbulanceBooking['status']) => void;
  onSelectBooking?: (id: string) => void;
}

export default function AmbulanceMap({ booking, userRole, onStatusUpdate, onSelectBooking }: AmbulanceMapProps) {
  const { ambulanceBookings } = useCuvio();
  const [activeTab, setActiveTab] = useState<'tracker' | 'google-map'>('tracker');
  const [progress, setProgress] = useState(0); // 0 to 100% along the active segment
  const [speed, setSpeed] = useState(0); // in km/h

  // Coordinates mapping on an 800x500 layout grid
  const getCoordsForLocation = (pickupLocation: string, id: string) => {
    const locLower = (pickupLocation || '').toLowerCase();
    if (locLower.includes('jubilee')) return { x: 220, y: 350 };
    if (locLower.includes('gachibowli')) return { x: 150, y: 150 };
    if (locLower.includes('madhapur')) return { x: 380, y: 280 };
    if (locLower.includes('banjara')) return { x: 440, y: 200 };
    if (locLower.includes('begumpet')) return { x: 180, y: 240 };
    if (locLower.includes('koramangala')) return { x: 300, y: 380 };
    
    // Deterministic fallback based on id
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    const x = 120 + (sum % 25) * 16;
    const y = 100 + ((sum * 7) % 25) * 12;
    return { x, y };
  };

  const activeBookingCoords = booking 
    ? getCoordsForLocation(booking.pickupLocation, booking.id)
    : { x: 700, y: 380 };

  const locations: Record<string, { x: number; y: number; name: string }> = {
    patient: { x: activeBookingCoords.x, y: activeBookingCoords.y, name: booking?.pickupLocation || 'Patient Location' },
    apollo: { x: 620, y: 140, name: 'Apollo Specialty Hospital' },
    manipal: { x: 480, y: 410, name: 'Manipal Heart Institute' },
    fortis: { x: 310, y: 120, name: 'Fortis Memorial Hospital' },
    max: { x: 560, y: 310, name: 'Max Super Speciality' },
    station: { x: 700, y: 380, name: 'Ambulance Dispatch Hub' }
  };

  const targetHospitalKey = booking?.destinationHospitalId?.toLowerCase() || 'apollo';
  const hospitalCoord = locations[targetHospitalKey] || locations.apollo;
  const startCoord = locations.station;
  const patientCoord = locations.patient;

  // Compute current ambulance coordinate and rotation based on status and progress
  const getAmbulanceState = () => {
    let x = startCoord.x;
    let y = startCoord.y;
    let angle = 0;
    let phaseText = '';

    if (!booking) {
      return { x, y, angle, phaseText: 'Command Center Active. Standing by.' };
    }

    if (booking.status === 'Requested') {
      x = startCoord.x;
      y = startCoord.y;
      phaseText = 'Awaiting Dispatch Approval';
    } else if (booking.status === 'Dispatched') {
      // Moving from station to patient
      const pct = progress / 100;
      x = startCoord.x + (patientCoord.x - startCoord.x) * pct;
      y = startCoord.y + (patientCoord.y - startCoord.y) * pct;
      angle = Math.atan2(patientCoord.y - startCoord.y, patientCoord.x - startCoord.x) * (180 / Math.PI);
      phaseText = 'En Route to Patient (Speeding)';
    } else if (booking.status === 'Arrived') {
      x = patientCoord.x;
      y = patientCoord.y;
      phaseText = 'Boarding Patient / Critical Triage';
    } else if (booking.status === 'EnRouteToHospital') {
      // Moving from patient to hospital
      const pct = progress / 100;
      x = patientCoord.x + (hospitalCoord.x - patientCoord.x) * pct;
      y = patientCoord.y + (hospitalCoord.y - patientCoord.y) * pct;
      angle = Math.atan2(hospitalCoord.y - patientCoord.y, hospitalCoord.x - patientCoord.x) * (180 / Math.PI);
      phaseText = 'En Route to Emergency Ward';
    } else if (booking.status === 'Completed') {
      x = hospitalCoord.x;
      y = hospitalCoord.y;
      phaseText = 'Safely Checked-In / Emergency Handover';
    }

    return { x, y, angle, phaseText };
  };

  const { x: ambX, y: ambY, angle: ambAngle, phaseText } = getAmbulanceState();

  // Simulate progress and speed updates
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (booking && (booking.status === 'Dispatched' || booking.status === 'EnRouteToHospital')) {
      // Speed fluctuates realistically between 55 and 85 km/h
      setSpeed(Math.floor(58 + Math.random() * 24));
      
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            // Automatically simulate step change or wait for role buttons
            return 100;
          }
          return prev + 2;
        });
      }, 400);
    } else {
      setSpeed(0);
      setProgress(0);
    }

    return () => clearInterval(timer);
  }, [booking?.status]);

  // Build the real Google Maps dynamic search embed link
  const escapedPickup = encodeURIComponent(booking?.pickupLocation || 'India');
  const escapedHospital = encodeURIComponent(booking?.destinationHospitalName || 'Hospital');
  const googleMapEmbedUrl = `https://maps.google.com/maps?q=${escapedPickup}+to+${escapedHospital}&t=&z=13&ie=UTF8&iwloc=&output=embed`;

  // Get driver turn-by-turn simulation instructions
  const getNavigationText = () => {
    if (!booking) return 'Ready to receive emergency broadcasts. Pulse beacons plotted on active grid.';
    if (booking.status === 'Requested') return 'Standby. Waiting for emergency driver acceptance...';
    if (booking.status === 'Dispatched') {
      if (progress < 30) return 'Departing Ambulance Hub. Sirens active. Head West on Ring Road.';
      if (progress < 70) return 'Speeding past Central Crossing. Fast lane active. Traffic cleared by GPS strobe.';
      return 'Approaching patient pickup point. Slowing down, scanning for coordinates.';
    }
    if (booking.status === 'Arrived') return 'Vehicle parked at pickup point. Paramedics treating patient. Ready for boarding.';
    if (booking.status === 'EnRouteToHospital') {
      if (progress < 30) return `Departing pickup location. Accelerating towards ${booking.destinationHospitalName}.`;
      if (progress < 70) return 'Speeding on flyover. Live vitals telemetry shared with emergency room.';
      return 'Entering hospital emergency bay. Backup doctors standby. Preparing patient offload.';
    }
    return 'Rescue mission successfully completed. Patient admitted to intensive care unit.';
  };

  return (
    <div className="bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl space-y-0">
      {/* Map Tabs Header */}
      <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600/10 text-red-500 flex items-center justify-center">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-display">Live Tracking & Navigation</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SOS: {booking?.id || 'NO ACTIVE MISSION'} • {booking?.type || 'STANDARD'} Ambulance</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex shrink-0">
          <button
            onClick={() => setActiveTab('tracker')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'tracker'
                ? 'bg-red-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Dispatch Vector</span>
          </button>
          <button
            onClick={() => setActiveTab('google-map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'google-map'
                ? 'bg-[#0B5A4B] text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Google Map View</span>
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="relative h-96 bg-slate-950">
        {activeTab === 'tracker' ? (
          <>
            {/* VECTOR MAP BACKDROP */}
            <svg 
              viewBox="0 0 800 500" 
              className="w-full h-full bg-[#0a0f1d] select-none text-slate-500 font-bold font-sans"
              style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
            >
              {/* Grid Background */}
              <defs>
                <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                </pattern>
                <radialGradient id="hospitalGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="patientGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#mapGrid)" />

              {/* Geographical Decor: River */}
              <path 
                d="M -50 420 C 200 440, 350 250, 500 280 C 650 310, 750 480, 850 490" 
                fill="none" 
                stroke="#1e293b" 
                strokeWidth="45" 
                opacity="0.3"
              />
              <path 
                d="M -50 420 C 200 440, 350 250, 500 280 C 650 310, 750 480, 850 490" 
                fill="none" 
                stroke="#0f172a" 
                strokeWidth="35" 
                opacity="0.5"
              />

              {/* Park Lands */}
              <rect x="50" y="50" width="120" height="150" rx="15" fill="#064e3b" opacity="0.1" />
              <text x="110" y="130" fill="#064e3b" fontSize="10" opacity="0.5" textAnchor="middle">Sanjay Gandhi Park</text>

              <rect x="520" y="380" width="150" height="90" rx="15" fill="#064e3b" opacity="0.1" />

              {/* Street Networks / Road Grid */}
              {/* Outer Ring Road */}
              <path d="M 100 80 L 700 80 L 700 420 L 100 420 Z" fill="none" stroke="#334155" strokeWidth="8" opacity="0.4" />
              <path d="M 100 80 L 700 80 L 700 420 L 100 420 Z" fill="none" stroke="#1e293b" strokeWidth="4" opacity="0.8" />
              <text x="400" y="72" fill="#475569" fontSize="9" textAnchor="middle" letterSpacing="2">OUTER RING ROAD (FAST LANE)</text>

              {/* Central Avenue Splines */}
              <path d="M 100 250 L 700 250" fill="none" stroke="#334155" strokeWidth="8" opacity="0.4" />
              <path d="M 100 250 L 700 250" fill="none" stroke="#1e293b" strokeWidth="4" opacity="0.8" />
              <text x="250" y="242" fill="#475569" fontSize="9" letterSpacing="1">CUVIO BOULEVARD</text>

              {/* Cross Streets */}
              <path d="M 220 80 L 220 420" fill="none" stroke="#334155" strokeWidth="6" opacity="0.4" />
              <path d="M 220 80 L 220 420" fill="none" stroke="#1e293b" strokeWidth="3" opacity="0.8" />
              <text x="212" y="180" fill="#475569" fontSize="8" transform="rotate(-90 212 180)" textAnchor="middle">LINK ROAD 24</text>

              <path d="M 480 80 L 480 420" fill="none" stroke="#334155" strokeWidth="6" opacity="0.4" />
              <path d="M 480 80 L 480 420" fill="none" stroke="#1e293b" strokeWidth="3" opacity="0.8" />

              <path d="M 620 80 L 620 420" fill="none" stroke="#334155" strokeWidth="6" opacity="0.4" />
              <path d="M 620 80 L 620 420" fill="none" stroke="#1e293b" strokeWidth="3" opacity="0.8" />

              {/* Secondary Hospital Route Connection lines */}
              <path d="M 100 350 L 700 350" fill="none" stroke="#1e293b" strokeWidth="3" opacity="0.5" />
              <path d="M 310 80 L 310 250" fill="none" stroke="#1e293b" strokeWidth="3" opacity="0.5" />

              {/* ANIMATED ROUTE GUIDE LINES */}
              {/* Highlight active routing segment */}
              {booking && booking.status === 'Dispatched' && (
                <path 
                  d={`M ${startCoord.x} ${startCoord.y} L ${patientCoord.x} ${patientCoord.y}`}
                  fill="none" 
                  stroke="#ef4444" 
                  strokeWidth="4" 
                  strokeDasharray="8 6" 
                  className="animate-[dash_10s_linear_infinite]"
                  opacity="0.9"
                />
              )}

              {booking && booking.status === 'EnRouteToHospital' && (
                <path 
                  d={`M ${patientCoord.x} ${patientCoord.y} L ${hospitalCoord.x} ${hospitalCoord.y}`}
                  fill="none" 
                  stroke="#059669" 
                  strokeWidth="4" 
                  strokeDasharray="8 6" 
                  className="animate-[dash_10s_linear_infinite]"
                  opacity="0.9"
                />
              )}

              {/* Display All 4 Hospitals so the city feels populated and realistic */}
              {[
                { key: 'apollo', name: 'Apollo Specialty', x: 620, y: 140 },
                { key: 'manipal', name: 'Manipal Heart', x: 480, y: 410 },
                { key: 'fortis', name: 'Fortis Memorial', x: 310, y: 120 },
                { key: 'max', name: 'Max Trauma', x: 560, y: 310 }
              ].map((h) => {
                const isTarget = booking && targetHospitalKey === h.key;
                return (
                  <g key={h.key} transform={`translate(${h.x}, ${h.y})`}>
                    <circle cx="0" cy="0" r="35" fill="url(#hospitalGlow)" opacity={isTarget ? 1 : 0.4} />
                    <circle cx="0" cy="0" r="14" fill="#10b981" stroke="#047857" strokeWidth="2" className={isTarget ? "animate-pulse" : ""} />
                    <path d="M-5 0 L5 0 M0 -5 L0 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    <rect x="-40" y="-32" width="80" height="15" rx="4" fill="rgba(15,23,42,0.85)" stroke={isTarget ? "#10b981" : "#1e293b"} strokeWidth="1" />
                    <text x="0" y="-22" fill={isTarget ? "#10b981" : "#94a3b8"} fontSize="8" fontWeight="bold" textAnchor="middle">
                      {h.name}
                    </text>
                  </g>
                );
              })}

              {/* Plot ALL Incoming Emergency SOS Requests on the map */}
              {ambulanceBookings.filter(b => b.status === 'Requested').map((req) => {
                const reqCoords = getCoordsForLocation(req.pickupLocation, req.id);
                const isSelected = booking?.id === req.id;
                return (
                  <g 
                    key={req.id} 
                    className="cursor-pointer group"
                    onClick={() => {
                      if (onSelectBooking) {
                        onSelectBooking(req.id);
                      }
                    }}
                  >
                    {/* Ring glow */}
                    <circle cx={reqCoords.x} cy={reqCoords.y} r="25" fill="none" stroke="#ef4444" strokeWidth="1.5" className="animate-ping" style={{ animationDuration: '2.5s' }} />
                    {/* Outer core */}
                    <circle cx={reqCoords.x} cy={reqCoords.y} r="9" fill={isSelected ? "#b91c1c" : "#ef4444"} stroke="#ffffff" strokeWidth="1.5" />
                    {/* Inner pulse */}
                    <circle cx={reqCoords.x} cy={reqCoords.y} r="4" fill="#ffffff" />
                    
                    {/* Label floating */}
                    <g transform={`translate(${reqCoords.x}, ${reqCoords.y})`}>
                      <rect x="-45" y="14" width="90" height="28" rx="6" fill="rgba(15,23,42,0.95)" stroke="#ef4444" strokeWidth="1.5" />
                      <text x="0" y="24" fill="#ffffff" fontSize="7.5" fontWeight="extrabold" textAnchor="middle">
                        🚨 SOS CALL
                      </text>
                      <text x="0" y="34" fill="#fca5a5" fontSize="7" fontWeight="bold" textAnchor="middle">
                        {req.patientName.split(' ')[0]}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Active Patient Node (only if booking is active & enroute) */}
              {booking && booking.status !== 'Completed' && booking.status !== 'Requested' && (
                <g transform={`translate(${patientCoord.x}, ${patientCoord.y})`}>
                  <circle cx="0" cy="0" r="30" fill="url(#patientGlow)" />
                  <circle cx="0" cy="0" r="10" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />
                  <rect x="-45" y="16" width="90" height="15" rx="4" fill="rgba(15,23,42,0.85)" stroke="#3b82f6" strokeWidth="1" />
                  <text x="0" y="26" fill="#93c5fd" fontSize="8" fontWeight="bold" textAnchor="middle">
                    Active Patient
                  </text>
                </g>
              )}

              {/* Dispatch Station Node */}
              <g transform={`translate(${startCoord.x}, ${startCoord.y})`}>
                <circle cx="0" cy="0" r="8" fill="#3b82f6" stroke="#1d4ed8" strokeWidth="1.5" />
                <text x="0" y="18" fill="#93c5fd" fontSize="7" fontWeight="bold" textAnchor="middle">
                  Ambulance Hub
                </text>
              </g>

              {/* MOVING AMBULANCE GRAPHICAL MARKER */}
              <g transform={`translate(${ambX}, ${ambY}) rotate(${ambAngle})`}>
                {/* Vehicle Pulse shadow */}
                {booking && (booking.status === 'Dispatched' || booking.status === 'EnRouteToHospital') && (
                  <circle cx="0" cy="0" r="18" fill="rgba(239, 68, 68, 0.25)" className="animate-ping" />
                )}
                {/* Ambulance Box Chassis */}
                <rect x="-15" y="-8" width="30" height="16" rx="3" fill="#ffffff" stroke="#1e293b" strokeWidth="1" />
                <rect x="5" y="-8" width="8" height="16" fill="#334155" />
                <rect x="-12" y="-6" width="10" height="12" fill="#ef4444" rx="1" />
                {/* Flashing Beacon */}
                <circle cx="0" cy="-4" r="3" fill="#3b82f6" className="animate-pulse" />
                <circle cx="0" cy="4" r="3" fill="#ef4444" className="animate-pulse" />
              </g>
            </svg>

            {/* Float Overlay: Navigation / HUD Info */}
            <div className="absolute top-4 left-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center font-bold shrink-0">
                  <Navigation className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span>GPS Telemetry Active</span>
                  </p>
                  <p className="text-xs font-bold text-white leading-tight">
                    {phaseText}
                  </p>
                </div>
              </div>

              {/* Speed / ETA Stats Badge */}
              <div className="flex gap-4 items-center bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <div className="text-right">
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Live Speed</p>
                  <p className="text-sm font-black text-emerald-400 font-display">{speed} <span className="text-[9px]">km/h</span></p>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div className="text-right">
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Est. ETA</p>
                  <p className="text-sm font-black text-blue-400 font-display">
                    {!booking ? 'Standby' : booking.status === 'Completed' ? 'Arrived' : `${booking.driverEta} mins`}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom HUD: Navigation Turn-by-Turn Instruction */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 border border-slate-800/80 px-4 py-3 rounded-xl flex items-center gap-2.5 shadow-lg">
              <Info className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-slate-300 leading-normal line-clamp-1">
                {getNavigationText()}
              </p>
            </div>
          </>
        ) : (
          /* GOOGLE MAPS REAL ADDRESS EMBED PORTAL */
          <div className="w-full h-full relative bg-slate-900">
            <iframe
              title="Real-time Google Map Route"
              src={googleMapEmbedUrl}
              className="w-full h-full border-none opacity-85 hover:opacity-100 transition-opacity"
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            {/* Live Indicator Overlay */}
            <div className="absolute bottom-4 right-4 bg-slate-950/90 backdrop-blur px-3 py-1.5 rounded-lg border border-emerald-900/40 text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Geocoded Google Maps Layer</span>
            </div>
          </div>
        )}
      </div>

      {/* Driver Controls / Actions (Only visible for Driver Role) */}
      {userRole === 'driver' && onStatusUpdate && (
        <div className="bg-slate-900 p-6 border-t border-slate-800 space-y-4">
          {!booking ? (
            <div className="text-center py-4 space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/50 border border-red-900/40 text-red-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                <Bell className="w-3.5 h-3.5" />
                <span>Live Emergency Broadcast Terminal Active</span>
              </div>
              <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-lg mx-auto">
                No active rescue selected. Click any flashing red <strong className="text-red-400">SOS beacon</strong> on the interactive map above, or select from the sidebar list to inspect the patient and accept dispatch!
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center font-bold font-display">
                    SK
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Logged-in Ambulance Driver</p>
                    <h4 className="font-bold text-white text-sm font-display">{booking.driverName || 'Suresh Kumar'}</h4>
                  </div>
                </div>

                <span className={`text-xs font-black border px-3 py-1.5 rounded-lg uppercase tracking-wider ${
                  booking.status === 'Requested'
                    ? 'bg-red-950 border-red-500/50 text-red-400 animate-pulse'
                    : 'bg-slate-950 border-slate-800 text-slate-300'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  disabled={booking.status !== 'Requested'}
                  onClick={() => onStatusUpdate('Dispatched')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    booking.status === 'Requested'
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/10'
                      : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span>1. Accept & Dispatch</span>
                </button>

                <button
                  disabled={booking.status !== 'Dispatched'}
                  onClick={() => onStatusUpdate('Arrived')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    booking.status === 'Dispatched'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span>2. Arrived at Patient</span>
                </button>

                <button
                  disabled={booking.status !== 'Arrived'}
                  onClick={() => onStatusUpdate('EnRouteToHospital')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    booking.status === 'Arrived'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/10'
                      : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span>3. Depart to Hospital</span>
                </button>

                <button
                  disabled={booking.status !== 'EnRouteToHospital'}
                  onClick={() => onStatusUpdate('Completed')}
                  className={`h-11 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    booking.status === 'EnRouteToHospital'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950 text-slate-600 border border-slate-900 cursor-not-allowed'
                  }`}
                >
                  <span>4. Complete Handover</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
