import React, { useState, useEffect, useRef } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { Hospital, Doctor, BookingRequest, AmbulanceBooking, Prescription } from '../types';
import {
  Search, MapPin, Star, Shield, Activity, Clock, LogOut, Heart, Phone,
  Calendar, AlertCircle, FileText, Upload, ChevronRight, BadgePercent,
  Plus, CheckCircle, Eye, Info, Play, MessageSquare, Compass, Ambulance,
  User, Check, HeartCrack, Sparkles, Filter, RefreshCw, Smartphone, Download, Trash2,
  Loader2, Stethoscope, AlertTriangle, FileCheck, X, Share2, HelpCircle,
  ArrowRight, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AmbulanceMap from './AmbulanceMap';
import LiveQueueTrackingTicket from './LiveQueueTrackingTicket';
import AIHealthAdvisor from './AIHealthAdvisor';
import Medical3DVitalModel from './Medical3DVitalModel';

export default function PatientDashboard() {
  const [showAiAdvisorModal, setShowAiAdvisorModal] = useState(false);
  const {
    user,
    currentScreen,
    setScreen,
    logout,
    hospitals,
    doctors,
    bookings,
    ambulanceBookings,
    prescriptions,
    activeHospitalId,
    activeDoctorId,
    activeBookingId,
    activeAmbulanceId,
    selectHospital,
    selectDoctor,
    symptomsSearch,
    setSymptomsSearch,
    bookAppointment,
    requestAmbulance,
    updateAmbulanceStatus,
    updateUser,
    setRole,
    setAdminTab
  } = useCuvio();

  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('Orthopedics');
  const [activeTab, setActiveTab] = useState<'overview' | 'doctors' | 'costs'>('overview');
  const [ambulanceType, setAmbulanceType] = useState<'Basic' | 'ALS' | 'ICU'>('ALS');
  const [pickupAddress, setPickupAddress] = useState('My Current Location (Jubilee Hills, Hyd)');
  const [selectedHospitalForAmbulance, setSelectedHospitalForAmbulance] = useState('apollo');

  // User Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileDob, setProfileDob] = useState('');
  const [profileMedicalHistory, setProfileMedicalHistory] = useState('');
  const [profileEmergencyName, setProfileEmergencyName] = useState('');
  const [profileEmergencyPhone, setProfileEmergencyPhone] = useState('');
  const [profileEmergencyRelation, setProfileEmergencyRelation] = useState('');
  const [profileInsurer, setProfileInsurer] = useState('');
  const [profileSumInsured, setProfileSumInsured] = useState('');
  
  // Save Feedback state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Simulated live notification/reminder toast
  const [liveReminder, setLiveReminder] = useState<{ title: string, message: string } | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileDob(user.dob || '');
      setProfileMedicalHistory(user.medicalHistory || '');
      setProfileEmergencyName(user.emergencyContactName || '');
      setProfileEmergencyPhone(user.emergencyContactPhone || '');
      setProfileEmergencyRelation(user.emergencyContactRelation || '');
      setProfileInsurer(user.insuranceProvider || '');
      setProfileSumInsured(user.sumInsuredRange || '');
    }
  }, [user]);

  // Medical Vault States and Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [vaultFiles, setVaultFiles] = useState<Array<{id: string, name: string, type: string, size: string, date: string}>>(() => {
    const saved = localStorage.getItem('cuvio_vault_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { id: "f-1", name: "Blood_Test_Sept.pdf", type: "Reports", size: "2.4 MB", date: "2026-06-15" },
      { id: "f-2", name: "Chest_XRay_Result.jpg", type: "Imaging", size: "5.1 MB", date: "2026-06-18" }
    ];
  });

  useEffect(() => {
    localStorage.setItem('cuvio_vault_files', JSON.stringify(vaultFiles));
  }, [vaultFiles]);

  const handleDownloadFile = (file: { name: string, type: string }) => {
    const content = `CUVIO MEDICAL VAULT REPORT\nFile Name: ${file.name}\nCategory: ${file.type}\nDownload Timestamp: ${new Date().toLocaleString()}\nStatus: Verified Decrypted Copy\nThis is a securely retrieved file from your Cuvio Health Vault.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPrescription = (rx: Prescription) => {
    const medList = rx.medications.map(m => `- ${m.name}: ${m.dosage} | ${m.frequency} | ${m.duration}`).join('\n');
    const content = `=========================================\n       CUVIO CLINICAL PRESCRIPTION\n=========================================\nID: ${rx.id}\nIssued Date: ${rx.date}\nStatus: Completed & Verified ✓\n\nPatient Name: ${rx.patientName}\nHospital: ${rx.hospitalName}\nDoctor: ${rx.doctorName}\n\nDiagnosis:\n${rx.diagnosis}\n\nPrescribed Medications:\n${medList}\n\nDoctor's Notes:\n${rx.notes || 'None'}\n\n=========================================\nDigitally signed by St. Jude Faculty / Cuvio Health Sync`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Prescription_${rx.id}_${rx.doctorName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const ext = uploadedFile.name.split('.').pop()?.toLowerCase();
    let fileType = 'Reports';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) {
      fileType = 'Imaging';
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(ext || '')) {
      fileType = 'Prescriptions';
    }

    const sizeInMB = (uploadedFile.size / (1024 * 1024)).toFixed(1);
    const formattedSize = `${sizeInMB === '0.0' ? '0.1' : sizeInMB} MB`;

    const newFile = {
      id: `f-${Math.floor(1000 + Math.random() * 9000)}`,
      name: uploadedFile.name,
      type: fileType,
      size: formattedSize,
      date: new Date().toISOString().split('T')[0]
    };

    setVaultFiles(prev => [newFile, ...prev]);
    
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDeleteFile = (fileId: string) => {
    setVaultFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Filter chips in hospital selection
  const [hospitalFilter, setHospitalWaitFilter] = useState<'all' | 'near' | 'insurance' | 'rating'>('all');
  
  // Hospital discovery sliders & specific search
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [maxDistanceLimit, setMaxDistanceLimit] = useState<number>(10);
  const [maxDoctorFee, setMaxDoctorFee] = useState<number>(2000);

  // Interactive Cost Calculator state
  const [selectedProcedure, setSelectedProcedure] = useState('Total Knee Replacement');
  const [selectedInsurer, setSelectedInsurer] = useState(user?.insuranceProvider || 'Niva Bupa (Max Bupa)');
  const [selectedSumInsured, setSelectedSumInsured] = useState(user?.sumInsuredRange || '₹5,00,000 - ₹10,00,000');
  const [isDiseaseDetected, setIsDiseaseDetected] = useState<boolean>(false);

  // Symptoms helper list
  const symptomsList = [
    "Severe joint pain", "Chronic back ache", "Chest tightness", "Toddler fever", "Rashes/Acne", "Migraine"
  ];

  // Current active booking being tracked
  const trackingBooking = bookings.find(b => b.id === activeBookingId);
  const activeAmbulance = ambulanceBookings.find(b => b.id === activeAmbulanceId);

  // Dynamic ambulance styles
  let ambulanceStyle: React.CSSProperties = { bottom: '33%', right: '33%' };
  let statusMessage = 'Dispatching Ambulance...';
  let statusBadgeColor = 'bg-slate-700 text-slate-100';

  if (activeAmbulance) {
    if (activeAmbulance.status === 'Requested') {
      ambulanceStyle = { bottom: '10%', right: '10%' }; // Far away at dispatch station
      statusMessage = 'Awaiting hospital confirmation & dispatch authorization.';
      statusBadgeColor = 'bg-red-600 text-white animate-pulse';
    } else if (activeAmbulance.status === 'Dispatched') {
      ambulanceStyle = { bottom: '25%', right: '40%' }; // Moving towards Patient
      statusMessage = 'Ambulance is speeding to your location.';
      statusBadgeColor = 'bg-blue-600 text-white';
    } else if (activeAmbulance.status === 'Arrived') {
      ambulanceStyle = { top: '33%', left: '33%' }; // Reached Patient (Me)
      statusMessage = 'Ambulance has arrived at your location! Boarding patient...';
      statusBadgeColor = 'bg-amber-600 text-white';
    } else if (activeAmbulance.status === 'EnRouteToHospital') {
      ambulanceStyle = { top: '42%', left: '55%' }; // Mid-transit to Hospital
      statusMessage = 'Patient onboard! Speeding en-route to emergency ward.';
      statusBadgeColor = 'bg-blue-600 text-white animate-pulse';
    } else if (activeAmbulance.status === 'Completed') {
      ambulanceStyle = { top: '50%', right: '24%' }; // Reached Hospital
      statusMessage = 'Patient checked in safely at Emergency Ward. Mission complete!';
      statusBadgeColor = 'bg-emerald-600 text-white';
    }
  }

  // Simulated GPS route marker countdown for ambulance
  const [simulatedEta, setSimulatedEta] = useState<number>(activeAmbulance?.driverEta || 8);
  useEffect(() => {
    if (activeAmbulance && activeAmbulance.status === 'Dispatched') {
      const interval = setInterval(() => {
        setSimulatedEta(prev => {
          if (prev <= 1) {
            updateAmbulanceStatus(activeAmbulance.id, 'Arrived');
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 10000); // Reduce ETA every 10 seconds for demo pacing
      return () => clearInterval(interval);
    }
  }, [activeAmbulance]);

  // Handle Symptom Search
  const handleSymptomSearch = (text: string) => {
    setSymptomsSearch(text);
    generateClinicalAssessment(text);
    setScreen('health-concern');
  };

  // AI Generation States
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [aiAssessment, setAiAssessment] = useState<any>(null);
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);
  const [assessmentError, setAssessmentError] = useState<string | null>(null);

  // AI Tariff Audit State
  const [aiTariffAudit, setAiTariffAudit] = useState<any>(null);
  const [isGeneratingAudit, setIsGeneratingAudit] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // AI Prescription Guide State
  const [prescriptionGuides, setPrescriptionGuides] = useState<Record<string, any>>({});
  const [generatingRxId, setGeneratingRxId] = useState<string | null>(null);
  const [activeRxGuideModal, setActiveRxGuideModal] = useState<any>(null);

  const generateClinicalAssessment = async (symptomQuery?: string) => {
    const query = symptomQuery || customSymptomInput || symptomsSearch || "Severe joint pain";
    setSymptomsSearch(query);
    setIsGeneratingAssessment(true);
    setAssessmentError(null);
    try {
      const res = await fetch("/api/gemini/generate-clinical-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: query,
          userHistory: user?.medicalHistory || "",
          patientName: user?.name || "Patient"
        })
      });
      const data = await res.json();
      if (data.status === "success" && data.assessment) {
        setAiAssessment(data.assessment);
        if (data.assessment.department) {
          setSelectedSpecialty(data.assessment.department);
        }
      } else {
        throw new Error(data.error || "Failed to generate assessment");
      }
    } catch (e: any) {
      console.warn("AI Clinical Assessment error, using smart fallback:", e);
    } finally {
      setIsGeneratingAssessment(false);
    }
  };

  const generateTariffAudit = async (procName?: string, hospName?: string, cost?: number) => {
    setIsGeneratingAudit(true);
    setShowAuditModal(true);
    try {
      const res = await fetch("/api/gemini/generate-tariff-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          procedure: procName || selectedProcedure,
          hospitalName: hospName || "Apollo Hospitals",
          insuranceProvider: selectedInsurer,
          sumInsured: selectedSumInsured,
          baseCost: cost || costData.total,
          isDiagnosed: isDiseaseDetected
        })
      });
      const data = await res.json();
      if (data.status === "success" && data.audit) {
        setAiTariffAudit(data.audit);
      }
    } catch (e: any) {
      console.warn("Tariff audit generation error:", e);
    } finally {
      setIsGeneratingAudit(false);
    }
  };

  const generatePrescriptionGuide = async (rx: Prescription) => {
    if (prescriptionGuides[rx.id]) {
      setActiveRxGuideModal({ rxId: rx.id, guide: prescriptionGuides[rx.id], rx });
      return;
    }
    setGeneratingRxId(rx.id);
    try {
      const res = await fetch("/api/gemini/generate-prescription-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnosis: rx.diagnosis,
          medications: rx.medications,
          doctorName: rx.doctorName,
          hospitalName: rx.hospitalName,
          notes: rx.notes
        })
      });
      const data = await res.json();
      if (data.status === "success" && data.guide) {
        setPrescriptionGuides(prev => ({ ...prev, [rx.id]: data.guide }));
        setActiveRxGuideModal({ rxId: rx.id, guide: data.guide, rx });
      }
    } catch (e: any) {
      console.warn("Prescription guide error:", e);
    } finally {
      setGeneratingRxId(null);
    }
  };

  // Formatted Cost Calculations
  const getProcedureCosts = (proc: string) => {
    switch (proc) {
      case 'Cancer Treatment (Chemo & Tumor)':
      case 'Cancer':
        return { total: 360000, consultation: 1200, operation: 180000, medicine: 95000, icu: 45000, bandage: 12000, other: 28000 };
      case 'Total Knee Replacement':
        return { total: 263000, consultation: 800, operation: 140000, medicine: 65000, icu: 35000, bandage: 8000, other: 15000 };
      case 'Heart Angioplasty / Bypass':
      case 'Angioplasty':
        return { total: 280000, consultation: 1000, operation: 160000, medicine: 50000, icu: 40000, bandage: 9000, other: 21000 };
      case 'Appendectomy (Appendix Surgery)':
        return { total: 80000, consultation: 600, operation: 45000, medicine: 15000, icu: 10000, bandage: 4000, other: 6000 };
      case 'Kidney Stone Laser Removal':
        return { total: 85000, consultation: 700, operation: 55000, medicine: 12000, icu: 8000, bandage: 3000, other: 7000 };
      case 'Cataract Eye Surgery':
      case 'Cataract Surgery':
        return { total: 38000, consultation: 500, operation: 25000, medicine: 8000, icu: 0, bandage: 2000, other: 3000 };
      default:
        return { total: 263000, consultation: 800, operation: 140000, medicine: 65000, icu: 35000, bandage: 8000, other: 15000 };
    }
  };

  const costData = getProcedureCosts(selectedProcedure);
  const isNoInsurance = selectedInsurer === 'No Insurance (Self Pay)';
  const coveragePercent = isNoInsurance ? 0 : selectedSumInsured.includes('₹10,00,000') ? 0.90 : selectedSumInsured.includes('₹5,00,000') ? 0.82 : 0.70;
  
  // Only if disease is detected do we apply the operation insurance coverage and costs
  const estimatedInsurerCover = isDiseaseDetected ? Math.round(costData.total * coveragePercent) : 0;
  const outOfPocket = isDiseaseDetected 
    ? (costData.total - estimatedInsurerCover) + costData.consultation 
    : costData.consultation;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-32">
      {/* Dynamic Top App Bar */}
      <header className="sticky top-0 w-full flex justify-between items-center px-4 h-16 bg-white/95 backdrop-blur-md z-40 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          {currentScreen !== 'dashboard' && (
            <button
              onClick={() => {
                if (currentScreen === 'hospital-profile') setScreen('hospital-selection');
                else if (currentScreen === 'specialist-suggestion') setScreen('health-concern');
                else if (currentScreen === 'cost-calculator') setScreen('specialist-suggestion');
                else setScreen('dashboard');
              }}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-6 h-6 rotate-180 text-slate-700" />
            </button>
          )}
          <span className="material-symbols-outlined text-[#0B5A4B] text-3xl font-extrabold flex items-center">
            <Compass className="w-8 h-8 text-[#0B5A4B]" />
          </span>
          <span className="text-xl font-bold tracking-tight text-[#0B5A4B] font-display">CUVIO</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiAdvisorModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-[#0B5A4B] text-white text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="Open AI Health & Cost Advisor"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">AI Health Advisor</span>
            <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full font-extrabold uppercase">Dual AI</span>
          </button>

          <div 
            onClick={() => setScreen('profile')} 
            className="text-right hidden sm:block cursor-pointer hover:opacity-80 transition-opacity"
          >
            <p className="text-xs font-bold text-slate-800">{user?.name || 'Rahul Verma'}</p>
            <p className="text-[10px] text-[#0B5A4B] font-semibold tracking-wide">View Profile & Settings</p>
          </div>
          <div 
            onClick={() => setScreen('profile')} 
            className="w-10 h-10 rounded-full border border-slate-100 overflow-hidden bg-emerald-50 text-[#0B5A4B] flex items-center justify-center font-bold shadow-inner cursor-pointer hover:scale-105 transition-all"
          >
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'RV'}
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors text-slate-400 cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-6">
        <AnimatePresence mode="wait">
          
          {/* SCREEN 1: CLIENT PATIENT DASHBOARD */}
          {currentScreen === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Welcome Headline */}
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">PATIENT DASHBOARD</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-0.5">
                  Hello, {user?.name ? user.name.split(' ')[0] : 'Rahul'}
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Access transparent medical pricing, real-time queues, and ambulance dispatches.
                </p>
              </div>

              {/* CUVIO CLINICAL AI HEALTH & OPD QUEUE ADVISOR HERO CARD */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#073D33] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-700">
                <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles className="w-40 h-40 text-emerald-400" />
                </div>
                <div className="relative z-10 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                      <Sparkles className="w-3.5 h-3.5" />
                      Autonomous Clinical AI
                    </span>
                    <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      Immediate Care Action Plan
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                      Live OPD Queue Token
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight font-display text-white">
                    Need Health Advice or Surgery Cost Estimates?
                  </h2>
                  <p className="text-slate-300 text-xs max-w-xl leading-relaxed">
                    Experiencing symptoms or evaluating hospital tariffs? Get instant clinical triage, step-by-step at-home relief guidance, automatic OPD queue token allocation, and itemized cost estimation across Government, Private, and Corporate super-specialty hospitals.
                  </p>
                  
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => setShowAiAdvisorModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Stethoscope className="w-4 h-4 text-slate-950" />
                      <span>Start AI Health Consult</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setShowAiAdvisorModal(true)}
                      className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Compare Surgery & Treatment Costs</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 3D BIOMETRIC EXPLORER & ANATOMICAL ORGAN SCANNER */}
              <div className="space-y-2">
                <Medical3DVitalModel
                  onSelectRegion={(reg, sym) => {
                    setSymptomsSearch(sym);
                    setShowAiAdvisorModal(true);
                  }}
                />
              </div>

              {/* HOSPITAL-FIRST BOOKING GATEWAY CARD */}
              <div className="bg-gradient-to-br from-emerald-900 to-[#0B5A4B] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-emerald-800">
                <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                  <Shield className="w-40 h-40 text-white" />
                </div>
                <div className="relative z-10 space-y-2">
                  <span className="inline-flex items-center gap-1.5 bg-emerald-850/80 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-emerald-700">
                    🏥 Hospital-First Consultation Gateway
                  </span>
                  <h2 className="text-2xl font-extrabold tracking-tight font-display">Book Your Consultation</h2>
                  <p className="text-emerald-100 text-xs max-w-xl leading-relaxed">
                    Patients must choose a hospital account (Medanta, Max, Apollo, etc.) first to book a consultation and view real-time OPD wait lists. Choose your preferred discovery mode:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-2">
                    <button
                      onClick={() => {
                        setHospitalWaitFilter('near');
                        setMaxDistanceLimit(3);
                        setHospitalSearch('');
                        setScreen('hospital-selection');
                      }}
                      className="bg-white hover:bg-emerald-50 text-slate-900 p-4 rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0B5A4B] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">📍 Nearest Hospital</span>
                        <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">Filter hospitals closest to you (within 3 km)</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setHospitalWaitFilter('all');
                        setMaxDistanceLimit(15);
                        setHospitalSearch('');
                        setScreen('hospital-selection');
                      }}
                      className="bg-[#094136] hover:bg-[#062d25] text-white p-4 rounded-2xl text-left border border-emerald-800/50 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-start gap-3 cursor-pointer group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Search className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">🏥 Specific Hospital</span>
                        <span className="text-[10px] text-emerald-250 leading-tight block mt-0.5">Directly search Medanta, Max, Apollo, Manipal...</span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Symptoms Search */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Describe Symptoms & Let CUVIO Guide You
                </h3>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Describe symptoms (e.g. chronic knee stiffness, joint ache...)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSymptomSearch((e.target as HTMLInputElement).value);
                    }}
                    className="w-full h-14 pl-12 pr-28 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-sm font-medium"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <button
                    onClick={() => handleSymptomSearch("Severe joint pain")}
                    className="absolute right-2 top-2 h-10 px-4 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all shadow shadow-blue-500/10 cursor-pointer"
                  >
                    Analyze
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {symptomsList.map((sym, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSymptomSearch(sym)}
                      className="text-xs text-slate-600 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-3 py-1.5 rounded-full transition-colors cursor-pointer font-medium"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emergency SOS Banner (Rapido style visual "wow") */}
              <div className="bg-red-500 text-white rounded-3xl p-6 shadow-lg shadow-red-500/20 relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border border-red-400">
                <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
                  <Ambulance className="w-40 h-44 text-white" />
                </div>
                <div className="relative z-10 space-y-1 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 bg-red-600/50 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-red-400/30 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" />
                    EMERGENCY TRANS-PORT SOS
                  </div>
                  <h3 className="text-xl font-bold font-display">Rapido for Healthcare Dispatch</h3>
                  <p className="text-red-100 text-xs leading-relaxed">
                    Experiencing a medical emergency? Trigger an ambulance immediately. Select nearby hospitals, check type availability, and view live ETA tracking.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setScreen('ambulance');
                  }}
                  className="relative z-10 bg-white text-red-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer shadow-md shadow-red-600/10 hover:scale-105 active:scale-95 flex-shrink-0"
                >
                  Request Ambulance
                </button>
              </div>

              {/* Quick Actions (Bento) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setScreen('hospital-selection')}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-display">Browse Nearby Hospitals</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Filter hospitals by live OPD wait times, rating, distance, and verified cashless insurance compatibility.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setScreen('health-concern')}
                  className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900 font-display">Search Health Concerns</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Select categories and symptoms. Let our AI Clinical advisor suggesting matching doctors instantly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Active / Pending Bookings & Ticker */}
              {bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length > 0 && (
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    My Active Appointments
                  </h3>
                  <div className="space-y-3">
                    {bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').map((booking) => (
                      <div
                        key={booking.id}
                        onClick={() => {
                          if (booking.status === 'Confirmed') {
                            setScreen('queue-tracking');
                          }
                        }}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                          booking.status === 'Confirmed'
                            ? 'bg-blue-50/50 border-blue-100 hover:border-blue-300'
                            : 'bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {booking.status === 'Confirmed' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{booking.doctorName}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{booking.hospitalName} • {booking.time}</p>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          {booking.status === 'Confirmed' ? (
                            <div>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded uppercase">
                                Token #{booking.tokenNumber}
                              </span>
                              <p className="text-xs text-slate-700 font-bold mt-1">~{booking.estimatedWaitTime}m wait</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                              Waiting Confirmation
                            </span>
                          )}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Vault & Prescriptions Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Reports Vault */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Medical Vault
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
                      />
                      <button 
                        onClick={triggerFileUpload}
                        className="text-[11px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {vaultFiles.length > 0 ? (
                      vaultFiles.map((file) => (
                        <div key={file.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-100/55 transition-all">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${
                              file.type === 'Imaging' ? 'bg-blue-100 text-blue-600' :
                              file.type === 'Prescriptions' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-red-100 text-red-600'
                            }`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">
                                {file.type} • {file.size}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleDownloadFile(file)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                              title="Download Copy"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-xs text-slate-400 italic font-medium">Your medical vault is empty.</p>
                        <p className="text-[10px] text-slate-300">Upload reports or prescriptions for cloud backup.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Digital Prescriptions Vault */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      Digital Prescriptions
                    </h3>
                    <button
                      onClick={() => setScreen('prescriptions')}
                      className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {prescriptions.length > 0 ? (
                      prescriptions.slice(0, 2).map((rx) => (
                        <div
                          key={rx.id}
                          onClick={() => setScreen('prescriptions')}
                          className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between cursor-pointer hover:bg-emerald-50 transition-all"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{rx.doctorName}</p>
                              <p className="text-[10px] text-slate-500 font-medium truncate max-w-[140px]">{rx.diagnosis}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                              <span>Completed</span>
                              <span>✓</span>
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {rx.date}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-4">
                        No prescriptions issued yet. Consult with an admin or doctor.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Medical Disclaimer */}
              <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200">
                <p className="text-[11px] leading-relaxed text-slate-500 flex items-start gap-2">
                  <Info className="w-4 h-4 flex-shrink-0 text-slate-400 mt-0.5" />
                  <span>
                    Disclaimer: CUVIO provides predictive cost comparisons and rule-based queue estimators based on clinic data. All information is for demo and educational reference. Consult licensed medical professionals for actual diagnosis or emergency procedures.
                  </span>
                </p>
              </div>
            </motion.div>
          )}

          {/* SCREEN 2: HOSPITAL SELECTION */}
          {currentScreen === 'hospital-selection' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full">
                  HOSPITAL DISCOVERY & FILTERS
                </span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-2">
                  Top Specialty Hospitals
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Adjust distance and doctor consultation charges dynamically to locate your optimal provider.
                </p>
              </div>

              {/* Filter Toggles: Nearest vs Specific */}
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  onClick={() => {
                    setHospitalWaitFilter('near');
                    setMaxDistanceLimit(3);
                    setHospitalSearch('');
                  }}
                  className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    hospitalFilter === 'near' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-[#0B5A4B]" />
                  <span>📍 Nearest Hospitals (Distance Basis)</span>
                </button>
                <button
                  onClick={() => {
                    setHospitalWaitFilter('all');
                    setMaxDistanceLimit(15);
                  }}
                  className={`py-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    hospitalFilter !== 'near' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search className="w-4 h-4 text-blue-600" />
                  <span>🏥 Specific Hospital (Account Basis)</span>
                </button>
              </div>

              {/* Advanced Search & Adjustment Panel */}
              <div className="bg-white border border-slate-150 rounded-[24px] p-5 shadow-sm space-y-4">
                
                {/* Specific Search */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                    Search Specific Hospital / Specialty
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={hospitalSearch}
                      onChange={(e) => setHospitalSearch(e.target.value)}
                      placeholder="e.g. Apollo, Manipal, Orthopedics, Cardiology..."
                      className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 transition-all text-slate-800"
                    />
                    <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-slate-400" />
                    {hospitalSearch && (
                      <button
                        onClick={() => setHospitalSearch('')}
                        className="absolute right-4 top-3 text-xs font-bold text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid of Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
                  
                  {/* Distance Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0B5A4B]" />
                        Search Distance Radius
                      </span>
                      <span className="text-xs font-bold text-[#0B5A4B] bg-emerald-50 px-2.5 py-1 rounded-lg">
                        Within {maxDistanceLimit} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={maxDistanceLimit}
                      onChange={(e) => setMaxDistanceLimit(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0B5A4B]"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>1 km (Nearest)</span>
                      <span>5 km</span>
                      <span>10 km</span>
                      <span>15 km (Max)</span>
                    </div>
                  </div>

                  {/* Consultation Charge Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <BadgePercent className="w-3.5 h-3.5 text-emerald-500" />
                        Doctor Consultation Fee Limit
                      </span>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        Max ₹{maxDoctorFee}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="2000"
                      step="100"
                      value={maxDoctorFee}
                      onChange={(e) => setMaxDoctorFee(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      <span>₹500 (Economy)</span>
                      <span>₹1,000</span>
                      <span>₹1,500</span>
                      <span>₹2,000 (Premium)</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setHospitalWaitFilter('all')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    hospitalFilter === 'all' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Hospitals
                </button>
                <button
                  onClick={() => {
                    setHospitalWaitFilter('near');
                    setMaxDistanceLimit(5); // Adjust distance limit automatically to sync
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    hospitalFilter === 'near' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Within 5 km
                </button>
                <button
                  onClick={() => setHospitalWaitFilter('insurance')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    hospitalFilter === 'insurance' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Insurance Compatible
                </button>
                <button
                  onClick={() => setHospitalWaitFilter('rating')}
                  className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                    hospitalFilter === 'rating' ? 'bg-slate-900 text-white shadow' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Top Rated (4.6+)
                </button>
              </div>

              {/* List */}
              <div className="space-y-4">
                {(() => {
                  const filteredHospitals = hospitals.filter(h => {
                    // 1. Search filter
                    if (hospitalSearch) {
                      const searchStr = hospitalSearch.toLowerCase();
                      const matchesName = h.name.toLowerCase().includes(searchStr);
                      const matchesLoc = h.location.toLowerCase().includes(searchStr);
                      const matchesSpecialties = h.specialties.some(s => s.toLowerCase().includes(searchStr));
                      if (!matchesName && !matchesLoc && !matchesSpecialties) return false;
                    }

                    // 2. Chip filters
                    if (hospitalFilter === 'near') {
                      const distanceVal = parseFloat(h.distance.replace(/[^\d.]/g, '')) || 0;
                      if (distanceVal > 5) return false;
                    }
                    if (hospitalFilter === 'insurance') {
                      if (h.qualityScore < 90) return false;
                    }
                    if (hospitalFilter === 'rating') {
                      if (h.rating < 4.6) return false;
                    }

                    // 3. Distance Slider filter
                    const distanceVal = parseFloat(h.distance.replace(/[^\d.]/g, '')) || 0;
                    if (distanceVal > maxDistanceLimit) return false;

                    // 4. Consultation Fee Slider filter
                    // Filter hospitals that have doctors matching the price constraint, or if hospital startsAt is within limit
                    const hospitalDocs = doctors.filter(d => d.hospitalId === h.id);
                    const hasMatchingDoctor = hospitalDocs.length > 0 
                      ? hospitalDocs.some(d => d.fee <= maxDoctorFee)
                      : h.startsAt <= maxDoctorFee;
                    
                    if (!hasMatchingDoctor) return false;

                    return true;
                  });

                  if (filteredHospitals.length === 0) {
                    return (
                      <div className="bg-white border border-slate-100 rounded-3xl p-10 text-center space-y-3">
                        <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                          <Filter className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-800">No Hospitals Match Your Criteria</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Try adjusting the search query, increasing your search distance radius, or raising the doctor consultation fee limit.
                        </p>
                        <button
                          onClick={() => {
                            setHospitalSearch('');
                            setMaxDistanceLimit(15);
                            setMaxDoctorFee(2000);
                            setHospitalWaitFilter('all');
                          }}
                          className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                        >
                          Reset Filters
                        </button>
                      </div>
                    );
                  }

                  return filteredHospitals.map((hospital) => {
                    const hospitalDocs = doctors.filter(d => d.hospitalId === hospital.id);
                    const matchingDocs = hospitalDocs.filter(d => d.fee <= maxDoctorFee);
                    
                    return (
                      <div
                        key={hospital.id}
                        className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row"
                      >
                        {/* Image */}
                        <div className="md:w-64 aspect-[16/9] md:aspect-auto relative bg-slate-100 flex-shrink-0">
                          <img
                            src={hospital.image}
                            alt={hospital.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                            {hospital.distance}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between items-start">
                              <h3 className="text-lg font-bold text-slate-900 font-display leading-snug">
                                {hospital.name}
                              </h3>
                              <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 font-semibold text-xs">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>{hospital.rating}</span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{hospital.location}</p>
                          </div>

                          {/* Specialties badge cloud */}
                          <div className="flex flex-wrap gap-1.5">
                            {hospital.specialties.map(spec => (
                              <button
                                key={spec}
                                onClick={() => {
                                  selectHospital(hospital.id);
                                  setSelectedSpecialty(spec);
                                  setActiveTab('doctors');
                                  setScreen('hospital-profile');
                                }}
                                className="text-[9px] font-bold uppercase tracking-wider bg-emerald-50 hover:bg-emerald-100 text-[#0B5A4B] px-2.5 py-1 rounded-md border border-emerald-100 cursor-pointer transition-colors"
                              >
                                {spec}
                              </button>
                            ))}
                          </div>

                          {/* Matching Doctors List info / Cost indicators */}
                          <div className="flex flex-col gap-2 bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                            <div className="flex gap-4">
                              <div className="bg-white border border-slate-150 rounded-xl px-3 py-1.5">
                                <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider">Starting at</p>
                                <p className="text-sm font-extrabold text-blue-600 font-display">₹{hospital.startsAt}</p>
                              </div>

                              <div className={`bg-white rounded-xl px-3 py-1.5 border ${
                                hospital.currentQueueWait < 15
                                  ? 'border-emerald-100 text-emerald-700'
                                  : 'border-amber-100 text-amber-700'
                              }`}>
                                <p className="text-[8px] font-extrabold uppercase tracking-wider opacity-65">Avg wait time</p>
                                <p className="text-sm font-extrabold font-display">~{hospital.currentQueueWait} mins</p>
                              </div>
                            </div>

                            {matchingDocs.length > 0 && (
                              <div className="border-t border-slate-150 pt-2 text-[10px]">
                                <span className="font-extrabold text-slate-400 uppercase tracking-wider">Matching Doctors (under ₹{maxDoctorFee}):</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {matchingDocs.map(doc => (
                                    <span key={doc.id} className="bg-white text-slate-600 px-2 py-0.5 rounded-lg border border-slate-100 font-medium">
                                      {doc.name} (<span className="text-emerald-600 font-bold">₹{doc.fee}</span>)
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Select Button */}
                          <button
                            onClick={() => {
                              selectHospital(hospital.id);
                              setActiveTab('doctors');
                              setSelectedSpecialty('');
                              setScreen('hospital-profile');
                            }}
                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Select Hospital & View Doctors</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}

          {/* SCREEN 3: HOSPITAL PROFILE & WORKINGS */}
          {currentScreen === 'hospital-profile' && activeHospitalId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {(() => {
                const hospital = hospitals.find(h => h.id === activeHospitalId);
                const hospitalDocs = doctors.filter(d => d.hospitalId === activeHospitalId);
                if (!hospital) return null;

                return (
                  <>
                    {/* Header Image Card */}
                    <div className="relative h-64 rounded-3xl overflow-hidden shadow-md">
                      <img
                        src={hospital.image}
                        alt={hospital.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1.5">
                        <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider w-fit">
                          JCI Accredited
                        </span>
                        <h1 className="text-2xl font-extrabold text-white font-display leading-tight">{hospital.name}</h1>
                        <p className="text-slate-200 text-xs flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-300" />
                          <span>{hospital.location}</span>
                        </p>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                      <div className="space-y-0.5">
                        <p className="text-[20px] font-extrabold text-blue-600 font-display">{hospital.qualityScore}%</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Transparency</p>
                      </div>
                      <div className="space-y-0.5 border-x border-slate-100">
                        <p className="text-[20px] font-extrabold text-slate-800 font-display">{hospital.rating} ★</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{hospital.reviews} Reviews</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[20px] font-extrabold text-slate-800 font-display">{hospital.distance.split(' ')[0]} km</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Distance</p>
                      </div>
                    </div>

                    {/* Trauma Unit Warning */}
                    {hospital.emergencyAvailable ? (
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between text-red-700 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          <span>Active Emergency Trauma Unit: Operating 24/7 with zero dispatch queue.</span>
                        </div>
                        <span className="bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Ready
                        </span>
                      </div>
                    ) : null}

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 gap-6">
                      <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-2.5 text-sm font-bold tracking-tight transition-all cursor-pointer ${
                          activeTab === 'overview' ? 'border-b-2 border-[#0B5A4B] text-[#0B5A4B]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab('doctors')}
                        className={`pb-2.5 text-sm font-bold tracking-tight transition-all cursor-pointer ${
                          activeTab === 'doctors' ? 'border-b-2 border-[#0B5A4B] text-[#0B5A4B]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Doctors
                      </button>
                      <button
                        onClick={() => setActiveTab('costs')}
                        className={`pb-2.5 text-sm font-bold tracking-tight transition-all cursor-pointer ${
                          activeTab === 'costs' ? 'border-b-2 border-[#0B5A4B] text-[#0B5A4B]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Transparency Pricing
                      </button>
                    </div>

                    {/* Tab Contents */}
                    {activeTab === 'overview' && (
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 font-display">About the Facility</h3>
                        <p className="text-slate-500 text-sm leading-relaxed">{hospital.about}</p>
                        
                        <div className="space-y-2 pt-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Specializations Available (Click to view doctors)</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {hospital.specialties.map((spec, i) => {
                              const isSelected = selectedSpecialty.toLowerCase() === spec.toLowerCase();
                              return (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedSpecialty(spec);
                                    setActiveTab('doctors');
                                  }}
                                  className={`text-xs px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-[#0B5A4B] text-white shadow-md' 
                                      : 'text-[#0B5A4B] bg-emerald-50 hover:bg-emerald-100 border border-emerald-100'
                                  }`}
                                >
                                  {spec}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'doctors' && (
                      <div className="space-y-4">
                        {/* Clinical Department Filter Panel */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Department Filter</h4>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setSelectedSpecialty('')}
                              className={`text-xs px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                                !selectedSpecialty 
                                  ? 'bg-[#0B5A4B] text-white shadow-sm' 
                                  : 'text-[#0B5A4B] bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-100/50'
                              }`}
                            >
                              🏥 All Departments
                            </button>
                            {hospital.specialties.map((spec) => {
                              const isSelected = selectedSpecialty.toLowerCase() === spec.toLowerCase();
                              return (
                                <button
                                  key={spec}
                                  onClick={() => setSelectedSpecialty(spec)}
                                  className={`text-xs px-3.5 py-2 rounded-full font-semibold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#0B5A4B] text-white shadow-sm' 
                                      : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100'
                                  }`}
                                >
                                  {spec}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 font-display flex items-center justify-between">
                          <span>
                            {selectedSpecialty ? `${selectedSpecialty} Specialists` : 'All Affiliated Specialists'}
                          </span>
                          <span className="text-xs font-semibold text-slate-400">
                            {hospitalDocs.filter(d => !selectedSpecialty || d.specialty.toLowerCase() === selectedSpecialty.toLowerCase()).length} Found
                          </span>
                        </h3>

                        {hospitalDocs
                          .filter(doc => !selectedSpecialty || doc.specialty.toLowerCase() === selectedSpecialty.toLowerCase())
                          .map((doc) => (
                            <div key={doc.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                              <div className="flex gap-4">
                                <div className="w-16 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 relative">
                                  <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                                  {doc.availability === 'Available' && (
                                    <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                                  )}
                                </div>
                                <div className="flex-grow space-y-1">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-headline-md text-base font-bold text-on-surface">{doc.name}</h4>
                                      <p className="text-xs text-[#0B5A4B] font-semibold uppercase">{doc.specialty} • {doc.experience}</p>
                                    </div>
                                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                      ★ {doc.rating}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 pt-1.5">
                                    <div>
                                      <p className="text-[10px] text-on-surface-variant uppercase">Consultation Fee</p>
                                      <p className="font-semibold text-sm">₹{doc.fee}</p>
                                    </div>
                                    <div className="w-px h-6 bg-slate-200" />
                                    <div>
                                      <p className="text-[10px] text-on-surface-variant uppercase">Status</p>
                                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                        doc.availability === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                                        doc.availability === 'On Break' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {doc.availability}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                              <div>
                                <p className="text-[#0B5A4B] font-medium flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#0B5A4B]" />
                                  <span>Live Queue: {doc.queuePatientsAhead} patients ahead</span>
                                </p>
                                <p className="text-slate-500 mt-0.5">Next Available Slot: {doc.nextSlot}</p>
                              </div>
                              <button
                                onClick={() => {
                                  selectDoctor(doc.id);
                                  setScreen('cost-calculator');
                                }}
                                className="bg-[#0B5A4B] text-white hover:bg-[#073D33] active:scale-[0.98] transition-all px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-[#0B5A4B]/10 cursor-pointer"
                              >
                                Book Now
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'costs' && (
                      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <h3 className="text-base font-bold text-slate-900 font-display">Transparent Pricing Guidelines</h3>
                        <p className="text-slate-500 text-xs leading-relaxed">
                          CUVIO works closely with clinical administration to verify diagnostic and procedural base rates. Below are our approved room and consulting rates for this facility.
                        </p>

                        <div className="divide-y divide-slate-100 text-xs">
                          <div className="py-3 flex justify-between">
                            <span className="text-slate-600 font-medium">Standard OPD Consultation Fee</span>
                            <span className="font-bold text-slate-800">₹800</span>
                          </div>
                          <div className="py-3 flex justify-between">
                            <span className="text-slate-600 font-medium">Private General Room Charges (Per Day)</span>
                            <span className="font-bold text-slate-800">₹15,000</span>
                          </div>
                          <div className="py-3 flex justify-between">
                            <span className="text-slate-600 font-medium">Intensive Care Unit (ICU) Charges (Per Day)</span>
                            <span className="font-bold text-slate-800">₹25,000</span>
                          </div>
                          <div className="py-3 flex justify-between">
                            <span className="text-slate-600 font-medium">Total Knee Replacement Base rate</span>
                            <span className="font-bold text-slate-800">₹3,45,000</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setScreen('cost-calculator')}
                          className="w-full py-3.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold tracking-tight transition-colors cursor-pointer"
                        >
                          Use Cost Estimator Comparison Tool
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* SCREEN 4: HEALTH CONCERN DEPARTMENT SELECTION */}
          {currentScreen === 'health-concern' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-bold text-[#0B5A4B] uppercase tracking-widest">CLINICAL DIRECTORY</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-0.5">
                  Select Health Concern
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Choose a department or let the CUVIO Symptom analyzer guide you.
                </p>
              </div>

              {/* AI Guidance Block */}
              <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#0B5A4B] text-white flex items-center justify-center shadow-lg shadow-[#0B5A4B]/15 shrink-0">
                      <Sparkles className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                          <span>AI Clinical Triage & Specialist Matcher</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-[#0B5A4B] px-2 py-0.5 rounded-full">Autonomous Clinical AI</span>
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                          Describe symptoms or clinical concerns. Cuvio AI analyzes urgency, generates pre-consultation questions, and projects treatment costs.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowAiAdvisorModal(true)}
                        className="self-start sm:self-auto px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-[#0B5A4B] text-white rounded-xl text-xs font-bold hover:opacity-90 shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Launch Full Advisor</span>
                      </button>
                    </div>
                  </div>

                  {/* Input form */}
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={customSymptomInput}
                        onChange={(e) => setCustomSymptomInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') generateClinicalAssessment(customSymptomInput);
                        }}
                        placeholder="e.g. sharp knee ache when climbing stairs, severe migraines with dizziness..."
                        className="w-full h-12 pl-4 pr-32 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B] focus:ring-2 focus:ring-[#0B5A4B]/10 transition-all placeholder:text-slate-400"
                      />
                      <button
                        onClick={() => generateClinicalAssessment(customSymptomInput)}
                        disabled={isGeneratingAssessment}
                        className="absolute right-1.5 top-1.5 h-9 px-4 bg-[#0B5A4B] hover:bg-[#073D33] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                      >
                        {isGeneratingAssessment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Analyzing...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Generate AI Advice</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick suggestion chips */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Prompts:</span>
                      {[
                        "Severe joint pain & knee stiffness",
                        "Chest tightness & irregular palpitations",
                        "Chronic migraine & visual aura",
                        "Persistent toddler fever with cough",
                        "Acute lower abdomen cramping"
                      ].map((sym, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCustomSymptomInput(sym);
                            generateClinicalAssessment(sym);
                          }}
                          className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-emerald-50 hover:text-[#0B5A4B] hover:border-emerald-200 border border-transparent px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Render Generated AI Assessment Card */}
                  {aiAssessment && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-5 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 border border-emerald-100 rounded-2xl space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100/70 pb-3">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-[#0B5A4B]" />
                          <h4 className="font-bold text-[#0B5A4B] text-sm font-display">
                            Clinical Assessment: {aiAssessment.department} Recommended
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            aiAssessment.urgencyColor === 'red'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : aiAssessment.urgencyColor === 'amber'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {aiAssessment.urgency}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 bg-white/80 px-2 py-1 rounded-full border border-slate-200">
                            {aiAssessment.confidenceScore}% Confidence
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {aiAssessment.summary}
                      </p>

                      {aiAssessment.keyObservations && aiAssessment.keyObservations.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold text-[#0B5A4B] uppercase tracking-wider">Clinical Observations:</p>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                            {aiAssessment.keyObservations.map((obs: string, i: number) => (
                              <li key={i} className="flex items-start gap-1.5 bg-white/70 p-2 rounded-xl border border-emerald-100/40">
                                <span className="text-[#0B5A4B] font-bold">•</span>
                                <span>{obs}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiAssessment.questionsForDoctor && aiAssessment.questionsForDoctor.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Recommended Questions For Your Doctor:</p>
                          <div className="space-y-1 text-xs text-slate-700">
                            {aiAssessment.questionsForDoctor.map((q: string, i: number) => (
                              <div key={i} className="bg-white p-2 rounded-lg border border-slate-200/60 flex items-start gap-2">
                                <span className="font-bold text-blue-600 shrink-0">Q{i + 1}:</span>
                                <span>{q}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {aiAssessment.homeCareAdvice && (
                        <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Pre-Visit Guidance:</span>
                            <span className="text-amber-800">{aiAssessment.homeCareAdvice}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <p className="text-[10px] text-slate-400 italic">
                          {aiAssessment.disclaimer}
                        </p>
                        <button
                          onClick={() => {
                            if (aiAssessment.department) {
                              setSelectedSpecialty(aiAssessment.department);
                            }
                            setScreen('specialist-suggestion');
                          }}
                          className="px-5 py-2.5 bg-[#0B5A4B] hover:bg-[#073D33] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-[#0B5A4B]/20 transition-all cursor-pointer"
                        >
                          <span>Consult {aiAssessment.department || 'Specialist'} Doctors</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'Cardiology', icon: '❤️', desc: 'Heart health' },
                  { name: 'Orthopedics', icon: '🦴', desc: 'Joints & Bones' },
                  { name: 'Pediatrics', icon: '👶', desc: 'Child health' },
                  { name: 'Neurology', icon: '🧠', desc: 'Brain & Spine' },
                  { name: 'ENT', icon: '👂', desc: 'Ear, Nose, Throat' },
                  { name: 'Dermatology', icon: '🩺', desc: 'Skin health' },
                  { name: 'Ophthalmology', icon: '👁️', desc: 'Eye procedures' },
                  { name: 'Gastroenterology', icon: '🍏', desc: 'Digestive tract' }
                ].map((dep) => (
                  <div
                    key={dep.name}
                    onClick={() => {
                      setSelectedSpecialty(dep.name);
                      setSymptomsSearch(`My ${dep.name.toLowerCase()} concern`);
                      setScreen('specialist-suggestion');
                    }}
                    className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-[#0B5A4B]/40 hover:shadow-md text-center flex flex-col items-center justify-center space-y-3 transition-all group"
                  >
                    <div className="text-3xl group-hover:scale-110 transition-transform">{dep.icon}</div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-slate-800">{dep.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{dep.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCREEN 5: SPECIALIST SUGGESTION */}
          {currentScreen === 'specialist-suggestion' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Clinical Match Banner */}
              <div className="bg-[#0B5A4B] text-white rounded-3xl p-6 shadow-lg shadow-[#0B5A4B]/10 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-100">AI CLINICAL SUGGESTION</span>
                </div>
                <h2 className="text-xl font-bold font-display leading-snug">
                  Based on: <span className="text-emerald-300">"{symptomsSearch || 'Severe joint pain'}"</span>, we recommend consulting a <span className="text-emerald-300">{selectedSpecialty || 'Orthopedic'} Specialist</span>.
                </h2>
                <span className="inline-flex bg-white/10 px-2.5 py-1 rounded-full text-[10px] font-bold">
                  {aiAssessment?.confidenceScore || 96}% Clinical Match Accuracy
                </span>
              </div>

              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Top Affiliated Specialists ({selectedSpecialty || 'All'})</h3>
                <span className="text-xs text-slate-500 font-semibold">Recommended by Proximity</span>
              </div>

              {/* Doctors List */}
              <div className="space-y-4">
                {(doctors.filter(d => d.specialty.toLowerCase().includes((selectedSpecialty || 'Orthopedics').toLowerCase())).length > 0
                  ? doctors.filter(d => d.specialty.toLowerCase().includes((selectedSpecialty || 'Orthopedics').toLowerCase()))
                  : doctors.slice(0, 3)
                ).map((doc) => {
                    const hospital = hospitals.find(h => h.id === doc.hospitalId);
                    return (
                      <div key={doc.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 relative">
                            <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                            {doc.availability === 'Available' && (
                              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-grow space-y-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-headline-md text-base font-bold text-on-surface">{doc.name}</h4>
                                <p className="text-xs text-blue-600 font-semibold uppercase">{doc.specialty} • {doc.experience}</p>
                              </div>
                              <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                                ★ {doc.rating}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{hospital?.name}</p>
                            <div className="flex items-center gap-4 pt-1.5">
                              <div>
                                <p className="text-[10px] text-on-surface-variant uppercase">Consultation Fee</p>
                                <p className="font-semibold text-sm">₹{doc.fee}</p>
                              </div>
                              <div className="w-px h-6 bg-slate-200" />
                              <div>
                                <p className="text-[10px] text-on-surface-variant uppercase">Status</p>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  doc.availability === 'Available' ? 'bg-emerald-100 text-emerald-800' :
                                  doc.availability === 'On Break' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {doc.availability}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                          <div>
                            <p className="text-blue-600 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                              <span>Live Queue: {doc.queuePatientsAhead} patients ahead</span>
                            </p>
                            <p className="text-slate-400 mt-0.5">Estimated Wait Time: ~{(doc.queuePatientsAhead * 15) + (doc.availability === 'On Break' ? 20 : 0)} mins</p>
                          </div>
                          <button
                            onClick={() => {
                              selectHospital(doc.hospitalId);
                              setSelectedSpecialty(doc.specialty);
                              setActiveTab('doctors');
                              setScreen('hospital-profile');
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 cursor-pointer transition-all active:scale-[0.98]"
                          >
                            Choose Hospital First
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </motion.div>
          )}

          {/* SCREEN 6: TRANSPARENT COST ESTIMATOR */}
          {currentScreen === 'cost-calculator' && activeDoctorId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {(() => {
                const doctor = doctors.find(d => d.id === activeDoctorId);
                const hospital = hospitals.find(h => h.id === activeHospitalId);
                if (!doctor || !hospital) return null;

                return (
                  <>
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">TRANSPARENT COST ESTIMATOR</span>
                        <span className="bg-emerald-100 text-[#0B5A4B] text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          🏥 Chosen Hospital: {hospital.name}
                        </span>
                      </div>
                      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-0.5">
                        Interactive Treatment Price Sheet
                      </h1>
                      <p className="text-slate-500 text-sm mt-1">
                        Select treatments to visualize insurer copay checkups. Booking will automatically forward a booking message to <strong className="text-slate-700">{hospital.name}</strong> admin.
                      </p>
                    </div>

                    {/* Input Controls */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Procedure Select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Disease & Operation</label>
                        <select
                          value={selectedProcedure}
                          onChange={(e) => setSelectedProcedure(e.target.value)}
                          className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 text-xs transition-all"
                        >
                          <option value="Total Knee Replacement">Total Knee Replacement</option>
                          <option value="Cancer Treatment (Chemo & Tumor)">Cancer Treatment (Chemo & Tumor)</option>
                          <option value="Heart Angioplasty / Bypass">Heart Angioplasty / Bypass</option>
                          <option value="Appendectomy (Appendix Surgery)">Appendectomy (Appendix Surgery)</option>
                          <option value="Kidney Stone Laser Removal">Kidney Stone Laser Removal</option>
                          <option value="Cataract Eye Surgery">Cataract Eye Surgery</option>
                        </select>
                      </div>

                      {/* Insurer Select */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Insurance Provider</label>
                        <select
                          value={selectedInsurer}
                          onChange={(e) => {
                            setSelectedInsurer(e.target.value);
                          }}
                          className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 text-xs transition-all"
                        >
                          <option>Niva Bupa (Max Bupa)</option>
                          <option>Star Health Insurance</option>
                          <option>HDFC Ergo</option>
                          <option>ICICI Lombard</option>
                          <option>No Insurance (Self Pay)</option>
                        </select>
                      </div>

                      {/* Sum Insured Limit */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sum Insured Limit</label>
                        <select
                          value={selectedSumInsured}
                          onChange={(e) => setSelectedSumInsured(e.target.value)}
                          disabled={selectedInsurer === 'No Insurance (Self Pay)'}
                          className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 text-xs transition-all disabled:opacity-40"
                        >
                          <option>₹3,00,000 - ₹5,00,000</option>
                          <option>₹5,00,000 - ₹10,00,000</option>
                          <option>₹10,00,000+</option>
                        </select>
                      </div>
                    </div>

                    {/* DYNAMIC SEPARATION BOX: CONSULTATION vs OPERATION */}
                    <div className="bg-gradient-to-r from-emerald-50/30 to-teal-50/10 rounded-3xl p-6 border border-emerald-100/60 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
                      <div className="space-y-1">
                        <p className="text-[11px] font-extrabold text-[#0B5A4B] uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#0B5A4B] animate-pulse"></span>
                          Choose Current Patient Condition
                        </p>
                        <h4 className="font-bold text-slate-800 text-sm">
                          {isDiseaseDetected 
                            ? "🚨 Disease Diagnosed: Operation & Surgery Required" 
                            : "🩺 Simple Checkup: Consultation Only"}
                        </h4>
                        <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
                          {isDiseaseDetected 
                            ? "Patient's diagnosis has been confirmed. Surgery costs, ICU, medication, and dressings have been activated and can be covered by insurance copay or self-pay."
                            : "Currently, only the doctor consultation fee is due. If any illness is diagnosed, the corresponding surgery and insurance calculations shown below will apply."}
                        </p>
                      </div>

                      <div className="flex bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm self-stretch md:self-auto justify-center">
                        <button
                          onClick={() => setIsDiseaseDetected(false)}
                          className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            !isDiseaseDetected 
                              ? 'bg-[#0B5A4B] text-white shadow-sm' 
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Only Consultation
                        </button>
                        <button
                          onClick={() => setIsDiseaseDetected(true)}
                          className={`flex-1 md:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isDiseaseDetected 
                              ? 'bg-rose-600 text-white shadow-sm' 
                              : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Operation Required
                        </button>
                      </div>
                    </div>

                    {/* Hospital Comparison Row */}
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                      {hospitals.map(h => {
                        const hCostData = getProcedureCosts(selectedProcedure);
                        // Total rate displayed is conditional
                        const displayedCost = isDiseaseDetected 
                          ? hCostData.total + hCostData.consultation 
                          : hCostData.consultation;
                        const isMain = h.id === hospital.id;

                        return (
                          <div
                            key={h.id}
                            className={`min-w-[260px] flex-1 p-5 rounded-3xl border transition-all ${
                              isMain
                                ? 'bg-emerald-50/10 border-emerald-100 shadow-md relative'
                                : 'bg-white border-slate-100 opacity-70 hover:opacity-100'
                            }`}
                          >
                            {isMain && (
                              <span className="absolute -top-3 right-4 bg-emerald-500 text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                                Selected
                              </span>
                            )}
                            <h4 className="font-bold text-slate-800 text-sm font-display truncate">{h.name}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{h.location}</p>
                            
                            <div className="mt-4 space-y-1">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">Estimated Bill</p>
                              <p className="text-xl font-extrabold text-slate-800 font-display">₹{displayedCost.toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-slate-500 italic">
                                {isDiseaseDetected ? "Consultation + Full Surgery" : "Consultation Only"}
                              </p>
                            </div>

                            {isDiseaseDetected && (
                              <>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500"
                                    style={{ width: `${coveragePercent * 100}%` }}
                                  />
                                </div>
                                <p className="text-[10px] font-bold text-emerald-600 mt-1.5">
                                  {isNoInsurance ? '0% Covered (Self Pay)' : `${Math.round(coveragePercent * 100)}% Copay Approved`}
                                </p>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Itemized Cost Sheet */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                      <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-[#0B5A4B]" />
                          <h3 className="font-bold text-slate-900 text-sm font-display">
                            Itemized Bill Estimate ({hospital.name})
                          </h3>
                        </div>
                        <span className="text-[10px] font-extrabold text-[#0B5A4B] bg-emerald-100/50 px-3 py-1 rounded-full uppercase tracking-wider">
                          {isDiseaseDetected ? "Operation Approved" : "Consultation Mode"}
                        </span>
                      </div>

                      <div className="p-6 space-y-5">
                        {/* Always Payable Upfront consultation charge first */}
                        <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[#0B5A4B] text-sm">🩺</span>
                              <div>
                                <p className="font-bold text-[#0B5A4B]">Consultation & OPD Registration Fee</p>
                                <p className="text-[10px] text-slate-500">Always Payable to start treatment. Non-refundable.</p>
                              </div>
                            </div>
                            <p className="font-extrabold text-[#0B5A4B] text-sm">₹{costData.consultation.toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        {/* Disease/Operation Charges listed only if diagnosed */}
                        <div className="divide-y divide-slate-100">
                          {isDiseaseDetected ? (
                            <>
                              {/* 1. kharch for operation */}
                              <div className="py-3.5 flex justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">⚡</span>
                                  <div>
                                    <span className="text-slate-800 font-bold block">Surgery & Operation Charges</span>
                                    <span className="text-[10px] text-slate-400 block">Surgeon, anesthesia, and OT rent charges</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">₹{costData.operation.toLocaleString('en-IN')}</p>
                                  <p className="text-[10px] text-emerald-600 font-bold">100% Cashless Covered</p>
                                </div>
                              </div>

                              {/* 2. kharch for medicine */}
                              <div className="py-3.5 flex justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">💊</span>
                                  <div>
                                    <span className="text-slate-800 font-bold block">Prescribed Medicines & Pharmacy</span>
                                    <span className="text-[10px] text-slate-400 block">Required medicines & intra-operative pharmacy</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">₹{costData.medicine.toLocaleString('en-IN')}</p>
                                  <p className="text-[10px] text-amber-600 font-bold">Partially Covered (₹50k limit)</p>
                                </div>
                              </div>

                              {/* 3. kharch for icu */}
                              <div className="py-3.5 flex justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">🏥</span>
                                  <div>
                                    <span className="text-slate-800 font-bold block">ICU & Special Ward Room Rent</span>
                                    <span className="text-[10px] text-slate-400 block">Post-operative monitoring cabin & standard ward room</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">₹{costData.icu.toLocaleString('en-IN')}</p>
                                  <p className="text-[10px] text-emerald-600 font-bold">100% Cashless Covered</p>
                                </div>
                              </div>

                              {/* 4. kharch bandage etc */}
                              <div className="py-3.5 flex justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">🩹</span>
                                  <div>
                                    <span className="text-slate-800 font-bold block">Bandages & Sterile Dressings</span>
                                    <span className="text-[10px] text-slate-400 block">Sterilized bandages, adhesive plaster, clinical cotton</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">₹{costData.bandage.toLocaleString('en-IN')}</p>
                                  <p className="text-[10px] text-emerald-600 font-bold">100% Cashless Covered</p>
                                </div>
                              </div>

                              {/* 5. kharch other */}
                              <div className="py-3.5 flex justify-between text-xs">
                                <div className="flex items-center gap-2.5">
                                  <span className="text-slate-400">🚶</span>
                                  <div>
                                    <span className="text-slate-800 font-bold block">Other Medical & Care Charges</span>
                                    <span className="text-[10px] text-slate-400 block">Specialist visits, physiotherapy & nurse support</span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-slate-800">₹{costData.other.toLocaleString('en-IN')}</p>
                                  <p className="text-[10px] text-red-500 font-bold">Policy Copay Cap excluded</p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                              <p className="text-xs font-bold text-slate-600">No Disease/Illness Diagnosed Yet</p>
                              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                                Operation charges (Kharch for Operation, Medicines, ICU, Bandages, and Others) will only be applied if a specific medical condition is found during checkup.
                              </p>
                              <button
                                onClick={() => setIsDiseaseDetected(true)}
                                className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded-xl cursor-pointer transition-all"
                              >
                                Activate Diagnosis Simulation
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Totals Box */}
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div className="text-center md:text-left">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">My Out of Pocket Expense</p>
                            <p className="text-2xl font-extrabold text-red-600 font-display">₹{outOfPocket.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {isDiseaseDetected ? "Includes Consultation Charge (upfront) + Copay" : "Consultation Only"}
                            </p>
                          </div>
                          
                          <div className="text-center md:text-right">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Insurer Copay Claim</p>
                            <p className="text-xl font-extrabold text-emerald-600 font-display">₹{estimatedInsurerCover.toLocaleString('en-IN')}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5">
                              {isDiseaseDetected ? "Covered by Cashless Insurance" : "No insurance claim on consultation"}
                            </p>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
                            <button
                              onClick={() => generateTariffAudit(selectedProcedure, hospital.name, costData.total)}
                              disabled={isGeneratingAudit}
                              className="w-full sm:w-auto h-12 px-5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-700/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                            >
                              {isGeneratingAudit ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Auditing Tariff...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 text-emerald-200" />
                                  <span>✨ Generate AI Tariff Audit</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                bookAppointment(hospital.id, doctor.id, doctor.specialty, "Today", doctor.nextSlot);
                                setScreen('queue-tracking');
                              }}
                              className="w-full sm:w-auto h-12 px-6 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/15 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <span>Book Consultation Slot</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          )}

          {/* SCREEN 7: LIVE QUEUE TRACKING TICKET */}
          {currentScreen === 'queue-tracking' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {trackingBooking ? (
                <LiveQueueTrackingTicket
                  booking={trackingBooking}
                  onBackToDashboard={() => setScreen('dashboard')}
                  onCancel={() => setScreen('dashboard')}
                />
              ) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base font-display">No Active Queue Token</h3>
                  <p className="text-xs text-slate-500">
                    You do not have an active queue token for today. Choose a doctor or procedure to join a live outpatient queue.
                  </p>
                  <button
                    onClick={() => setScreen('hospital-selection')}
                    className="bg-[#0B5A4B] text-white px-5 py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-md"
                  >
                    Find a Doctor & Join Queue
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 8: EMERGENCY AMBULANCE DISPATCH TRACKER */}
          {currentScreen === 'ambulance' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {activeAmbulance ? (
                <>
                  {/* Flashing Alert Header */}
                  <div className="bg-red-500 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex items-center justify-between">
                    <div className="space-y-1">
                      <div className={`inline-flex ${statusBadgeColor} text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider border border-white/20`}>
                        {activeAmbulance.status === 'Requested' ? 'Requested' : activeAmbulance.status === 'Dispatched' ? 'Dispatched' : activeAmbulance.status === 'Arrived' ? 'Arrived at Patient' : activeAmbulance.status === 'EnRouteToHospital' ? 'En Route to Hospital' : 'Arrived at Hospital'}
                      </div>
                      <h2 className="text-xl font-black font-display tracking-tight">SOS Dispatch ID: {activeAmbulance.id}</h2>
                      <p className="text-red-100 text-xs font-medium">Destination: {activeAmbulance.destinationHospitalName}</p>
                    </div>
                    <span className="material-symbols-outlined text-[48px] opacity-20">
                      <Ambulance className="w-12 h-12 text-white animate-pulse" />
                    </span>
                  </div>

                  {/* Simulated SMS Alert Notification (Satisfies "message chala jaye") */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-950 text-emerald-100 border border-emerald-800/40 p-5 rounded-3xl shadow-lg flex items-start gap-3"
                  >
                    <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">📱 SMS Dispatch Message Sent Successfully</p>
                      <p className="text-xs font-semibold leading-relaxed mt-1 text-emerald-200">
                        &ldquo;Emergency alert routed to <strong className="text-white">{activeAmbulance.destinationHospitalName}</strong> & assigned Driver <strong className="text-white">{activeAmbulance.driverName} ({activeAmbulance.driverPhone})</strong>. Live coordinates shared. Sirens active.&rdquo;
                      </p>
                    </div>
                  </motion.div>

                  {/* Dynamic Status Notification Banner */}
                  <div className="bg-[#0B5A4B]/10 border border-[#0B5A4B]/20 p-4 rounded-2xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0B5A4B] text-white flex items-center justify-center font-bold text-xs shrink-0">
                      SOS
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Hospital Status Update</p>
                      <p className="text-[11px] text-[#0B5A4B] font-semibold mt-0.5">{statusMessage}</p>
                    </div>
                  </div>

                  {/* Live Interactive Map and Routing Layer */}
                  <AmbulanceMap booking={activeAmbulance} userRole="patient" />

                  {/* Visual Stepper Progress Bar */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Rescue Mission Progress</h3>
                    <div className="flex items-center justify-between relative">
                      {/* Connecting Line */}
                      <div className="absolute left-4 right-4 top-4.5 h-1 bg-slate-100 -z-0" />
                      <div 
                        className="absolute left-4 top-4.5 h-1 bg-[#0B5A4B] transition-all duration-500 -z-0"
                        style={{
                          width: activeAmbulance.status === 'Requested' ? '0%' :
                                 activeAmbulance.status === 'Dispatched' ? '25%' :
                                 activeAmbulance.status === 'Arrived' ? '50%' :
                                 activeAmbulance.status === 'EnRouteToHospital' ? '75%' : '100%'
                        }}
                      />

                      {/* Step 1 */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                          activeAmbulance.status === 'Requested' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-[#0B5A4B] text-white border-[#0B5A4B]'
                        }`}>
                          1
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">SOS Sent</span>
                      </div>

                      {/* Step 2 */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                          activeAmbulance.status === 'Dispatched' ? 'bg-blue-600 text-white border-blue-600 shadow-md' :
                          ['Arrived', 'EnRouteToHospital', 'Completed'].includes(activeAmbulance.status) ? 'bg-[#0B5A4B] text-white border-[#0B5A4B]' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          2
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">Dispatched</span>
                      </div>

                      {/* Step 3 */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                          activeAmbulance.status === 'Arrived' ? 'bg-amber-600 text-white border-amber-600 shadow-md' :
                          ['EnRouteToHospital', 'Completed'].includes(activeAmbulance.status) ? 'bg-[#0B5A4B] text-white border-[#0B5A4B]' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          3
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">At Patient</span>
                      </div>

                      {/* Step 4 */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                          activeAmbulance.status === 'EnRouteToHospital' ? 'bg-blue-600 text-white border-blue-600 shadow-md' :
                          activeAmbulance.status === 'Completed' ? 'bg-[#0B5A4B] text-white border-[#0B5A4B]' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          4
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">En Route</span>
                      </div>

                      {/* Step 5 */}
                      <div className="flex flex-col items-center z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-xs transition-colors ${
                          activeAmbulance.status === 'Completed' ? 'bg-[#0B5A4B] text-white border-[#0B5A4B]' : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          5
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 mt-1.5 text-center">Arrived</span>
                      </div>
                    </div>
                  </div>

                  {/* Driver Card & Route info */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Driver details */}
                    <div className="flex items-center gap-4 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 pr-0 md:pr-6">
                      <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-600">
                        SK
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Ambulance Driver</p>
                        <h4 className="font-bold text-slate-800 text-sm font-display">{activeAmbulance.driverName}</h4>
                        <a
                          href={`tel:${activeAmbulance.driverPhone}`}
                          className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline mt-1"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call Dispatch Driver
                        </a>
                      </div>
                    </div>

                    {/* ETA Countdown details */}
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Simulated ETA</p>
                        <p className="text-xl font-extrabold text-blue-600 font-display mt-1">
                          {simulatedEta > 0 ? `${simulatedEta} mins` : 'Arrived'}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Distance</p>
                        <p className="text-xl font-extrabold text-slate-800 font-display mt-1">{activeAmbulance.distance} km</p>
                      </div>
                    </div>
                  </div>

                  {/* Switcher details */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setScreen('dashboard')}
                      className="flex-grow h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Back to Dashboard
                    </button>
                    
                    <button
                      onClick={() => {
                        // Securely redirect to admin login
                        setRole('admin');
                        setScreen('login');
                      }}
                      className="flex-grow h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <span>Admin Login to Manage Dispatch</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Ambulance Request Flow */
                <div className="bg-white rounded-3xl p-7 border border-[#0B5A4B]/10 shadow-2xl space-y-6 max-w-lg mx-auto cuvio-shadow-premium">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-md border border-red-100/50 mb-1 animate-pulse">
                      <Ambulance className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-black font-display tracking-tight text-slate-900">Request Medical Transport</h2>
                    <p className="text-slate-500 text-xs">Instantly dispatch an equipped emergency ambulance and alert local trauma rooms.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Pickup field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pickup Location (Home Address or GPS)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/20 focus:border-[#0B5A4B] transition-all text-xs"
                          placeholder="Loading current coordinates..."
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                    </div>

                    {/* Destination Hospital field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Destination Trauma Center</label>
                      <select
                        value={selectedHospitalForAmbulance}
                        onChange={(e) => setSelectedHospitalForAmbulance(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B5A4B]/20 focus:border-[#0B5A4B] transition-all text-xs cursor-pointer appearance-none"
                      >
                        {hospitals.map(h => (
                          <option key={h.id} value={h.id}>{h.name} ({h.distance})</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Choice */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ambulance Resource Tier</label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'Basic', label: 'Basic BLS', desc: 'Oxygen & Standard Gurney', fee: '1500' },
                          { id: 'ALS', label: 'Advanced ALS', desc: 'ECG, Defib & Airway Drugs', fee: '3000' },
                          { id: 'ICU', label: 'Intensive ICU', desc: 'Ventilator & ICU Physician', fee: '5500' }
                        ].map((item) => {
                          const isSelected = ambulanceType === item.id;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setAmbulanceType(item.id as any)}
                              className={`p-3.5 rounded-2xl border text-center cursor-pointer transition-all duration-200 ${
                                isSelected
                                  ? 'bg-red-50/50 border-red-500 text-red-950 shadow-md ring-2 ring-red-500/10 scale-[1.02]'
                                  : 'bg-slate-50/60 border-slate-200 text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                              }`}
                            >
                              <p className={`text-xs font-black font-display ${isSelected ? 'text-red-700' : 'text-slate-800'}`}>{item.label}</p>
                              <p className="text-[9px] text-slate-400 font-medium leading-snug mt-1">{item.desc}</p>
                              <p className={`text-[11px] font-black mt-2 ${isSelected ? 'text-red-600' : 'text-slate-700'}`}>₹{item.fee}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      requestAmbulance(pickupAddress, selectedHospitalForAmbulance, ambulanceType);
                    }}
                    className="w-full h-13 bg-red-600 text-white hover:bg-red-700 active:scale-[0.98] rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-lg shadow-red-500/20 flex items-center justify-center gap-1.5 pt-0.5"
                  >
                    <Ambulance className="w-4 h-4" />
                    <span>Confirm & Dispatch Transport SOS</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* SCREEN 9: DIGITAL PRESCRIPTIONS VAULT */}
          {currentScreen === 'prescriptions' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">DIGITAL PRESCRIPTION VAULT</span>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-0.5">
                  My Prescriptions
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  View and securely download medication notes issued during completed clinic checkups.
                </p>
              </div>

              {/* List */}
              <div className="space-y-4">
                {prescriptions.map((rx) => (
                  <div key={rx.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-base font-display">{rx.doctorName}</h3>
                          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                            <span>Completed</span>
                            <span>✓</span>
                          </span>
                        </div>
                        <p className="text-xs text-blue-600 font-semibold uppercase">{rx.hospitalName}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                          ID: {rx.id}
                        </span>
                        <p className="text-xs text-slate-400 font-medium mt-1">Issued on: {rx.date}</p>
                      </div>
                    </div>

                    {/* Completion Alert Box */}
                    <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Consultation Completed Successfully</p>
                        <p className="text-[10px] text-emerald-600/90 font-semibold leading-relaxed">This prescription has been digitally signed and verified by the consulting doctor & hospital faculty.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnosis</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{rx.diagnosis}</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prescribed Medicines</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {rx.medications.map((med, i) => (
                            <div key={i} className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                              <p className="font-bold text-slate-800">{med.name}</p>
                              <p className="text-slate-500 mt-1">Dosage: {med.dosage}</p>
                              <p className="text-slate-500">Frequency: {med.frequency}</p>
                              <p className="text-slate-500 font-medium text-emerald-600">Duration: {med.duration}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {rx.notes && (
                        <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs text-blue-800">
                          <p className="font-bold uppercase text-[9px] tracking-wider text-blue-600">Doctor's Special Instructions</p>
                          <p className="mt-1 leading-relaxed">{rx.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Download simulation action */}
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        onClick={() => handleDownloadPrescription(rx)}
                        className="h-10 px-4 border border-blue-600 text-blue-600 font-semibold rounded-xl text-xs hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SCREEN 10: SECURE USER PROFILE & SETTINGS */}
          {currentScreen === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 pb-12"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-[#0B5A4B] uppercase tracking-widest">PATIENT PROFILE CONTROL</span>
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-display mt-0.5">
                    My Security & Profile
                  </h1>
                  <p className="text-slate-500 text-sm mt-1">
                    Manage your medical history, configure automated reminders, and set critical emergency contacts.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#0B5A4B] text-[11px] font-bold shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Firestore Backend Sync: Active</span>
                  </div>
                  <button
                    onClick={() => setScreen('dashboard')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Back to Home
                  </button>
                </div>
              </div>

              {/* Alert sandbox banner */}
              {liveReminder && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex gap-3 shadow-md"
                >
                  <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                    🔔
                  </span>
                  <div>
                    <h4 className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider">{liveReminder.title}</h4>
                    <p className="text-xs text-emerald-800 leading-normal mt-0.5">{liveReminder.message}</p>
                    <button 
                      onClick={() => setLiveReminder(null)}
                      className="text-[10px] font-bold text-emerald-700 underline mt-1.5"
                    >
                      Dismiss Alert
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Toast notifier */}
              {saveSuccess && (
                <div className="bg-gradient-to-r from-[#0B5A4B] to-emerald-700 text-white p-4 rounded-2xl flex items-center gap-2.5 shadow-xl transition-all border border-emerald-500/30">
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                  <span className="text-xs font-bold">Profile, clinical history, and reminder settings synchronized permanently to Firestore Cloud Database!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left column: Personal and Insurance */}
                <div className="space-y-6">
                  {/* Card 1: Identification */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-[#0B5A4B]" />
                      Personal Identification
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</label>
                          <input
                            type="text"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                            placeholder="+91 98765 43210"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Birth</label>
                          <input
                            type="date"
                            value={profileDob}
                            onChange={(e) => setProfileDob(e.target.value)}
                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Insurance Policy */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-[#0B5A4B]" />
                      Insurance Policy Details
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preferred Provider</label>
                        <select
                          value={profileInsurer}
                          onChange={(e) => setProfileInsurer(e.target.value)}
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                        >
                          <option value="Star Health Insurance">Star Health Insurance</option>
                          <option value="Niva Bupa (Max Bupa)">Niva Bupa (Max Bupa)</option>
                          <option value="HDFC ERGO General">HDFC ERGO General</option>
                          <option value="Care Health Insurance">Care Health Insurance</option>
                          <option value="ICICI Lombard General">ICICI Lombard General</option>
                          <option value="No Insurance (Self Pay)">No Insurance (Self Pay)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved Sum Insured Range</label>
                        <select
                          value={profileSumInsured}
                          onChange={(e) => setProfileSumInsured(e.target.value)}
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                        >
                          <option value="₹2,00,000 - ₹5,00,000">₹2,00,000 - ₹5,00,000</option>
                          <option value="₹5,00,000 - ₹10,00,000">₹5,00,000 - ₹10,00,000</option>
                          <option value="₹10,00,000 - ₹25,00,000">₹10,00,000 - ₹25,00,000</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Emergency & Medical History */}
                <div className="space-y-6">
                  {/* Card 3: Emergency Contact */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      Emergency SOS Contact
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contact Name</label>
                        <input
                          type="text"
                          value={profileEmergencyName}
                          onChange={(e) => setProfileEmergencyName(e.target.value)}
                          className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                          placeholder="Spouse, Parent, Friend name"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                          <input
                            type="text"
                            value={profileEmergencyPhone}
                            onChange={(e) => setProfileEmergencyPhone(e.target.value)}
                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                            placeholder="+91 XXXXX XXXXX"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relationship</label>
                          <input
                            type="text"
                            value={profileEmergencyRelation}
                            onChange={(e) => setProfileEmergencyRelation(e.target.value)}
                            className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all"
                            placeholder="e.g. Spouse, Father"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Medical History */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-rose-500" />
                      Basic Medical History
                    </h3>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chronic Illnesses, Allergies, or Implants</label>
                      <textarea
                        value={profileMedicalHistory}
                        onChange={(e) => setProfileMedicalHistory(e.target.value)}
                        className="w-full h-24 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-none focus:border-[#0B5A4B] transition-all resize-none"
                        placeholder="e.g., Type-2 Diabetes diagnosed 2021, Penicillin allergy, Hypertension."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Automated Appointment Reminder Settings */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      Automated Appointment Reminders & Preferences
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Configure intervals at which CUVIO sends automated SMS & App alerts before checking in.</p>
                  </div>

                  {/* Live Playground Button */}
                  <button
                    onClick={() => {
                      const nextBooking = bookings[0] || { doctorName: 'Dr. Arjun Mehta', hospitalName: 'Apollo Specialty Hospital', time: '11:30 AM', tokenNumber: 12 };
                      let alertsSent = [];
                      if (user?.reminder24hEnabled !== false) alertsSent.push('24 Hours Prior Notification');
                      if (user?.reminder1hEnabled !== false) alertsSent.push('1 Hour Prior Notification');
                      if (user?.reminder15mEnabled !== false) alertsSent.push('15 Minutes In-App Alert');
                      
                      const listString = alertsSent.length > 0 ? alertsSent.join(', ') : 'None (All disabled)';

                      setLiveReminder({
                        title: '🔔 Automated Reminder Simulation',
                        message: `Reminder dispatch successful! Following user preferences, alerts scheduled: [${listString}]. SMS text sent: "Cuvio Alert: Your appointment with ${nextBooking.doctorName} is confirmed at ${nextBooking.hospitalName} at ${nextBooking.time} (Token #${nextBooking.tokenNumber || 10})"`
                      });
                    }}
                    className="h-9 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#0B5A4B] rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 self-start md:self-auto"
                  >
                    <span>Test Reminder Delivery</span>
                    <span>⚡</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {[
                    { key: 'reminder24hEnabled', label: '24h Prior', desc: 'SMS / WhatsApp reminder' },
                    { key: 'reminder1hEnabled', label: '1h Prior', desc: 'SMS reminder + live token link' },
                    { key: 'reminder15mEnabled', label: '15m Prior', desc: 'In-app push & ETA estimate' },
                    { key: 'reminderInAppEnabled', label: 'In-App Alert', desc: 'Trigger persistent banners' }
                  ].map((pref) => {
                    const isEnabled = (user as any)?.[pref.key] !== false;
                    return (
                      <div key={pref.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{pref.label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{pref.desc}</p>
                        </div>
                        <button
                          onClick={() => {
                            updateUser({ [pref.key]: !isEnabled });
                          }}
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative flex items-center ${isEnabled ? 'bg-[#0B5A4B]' : 'bg-slate-300'}`}
                        >
                          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Save Controls */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setScreen('dashboard')}
                  className="px-6 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateUser({
                      name: profileName,
                      phone: profilePhone,
                      dob: profileDob,
                      insuranceProvider: profileInsurer,
                      sumInsuredRange: profileSumInsured,
                      medicalHistory: profileMedicalHistory,
                      emergencyContactName: profileEmergencyName,
                      emergencyContactPhone: profileEmergencyPhone,
                      emergencyContactRelation: profileEmergencyRelation
                    });
                    setSaveSuccess(true);
                    setTimeout(() => setSaveSuccess(false), 4000);
                  }}
                  className="px-8 h-12 bg-[#0B5A4B] hover:bg-[#073c32] text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  Save Profile Settings
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Patient Bottom Navigation bar (suppressed on desktop for layout precision) */}
      <footer className="fixed bottom-0 w-full z-30 flex md:hidden justify-around items-center pt-2 pb-6 px-4 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl">
        <button
          onClick={() => setScreen('dashboard')}
          className={`flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
            currentScreen === 'dashboard' ? 'text-[#0B5A4B]' : 'text-slate-400'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>

        <button
          onClick={() => setScreen('hospital-selection')}
          className={`flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
            currentScreen === 'hospital-selection' || currentScreen === 'hospital-profile' ? 'text-[#0B5A4B]' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Hospitals</span>
        </button>

        <button
          onClick={() => setShowAiAdvisorModal(true)}
          className="flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer text-[#0B5A4B] relative"
        >
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-[#0B5A4B]" />
          </div>
          <span className="text-[10px] font-bold mt-0.5">AI Advisor</span>
        </button>

        <button
          onClick={() => setScreen('prescriptions')}
          className={`flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
            currentScreen === 'prescriptions' ? 'text-[#0B5A4B]' : 'text-slate-400'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Records</span>
        </button>

        <button
          onClick={() => setScreen('ambulance')}
          className={`flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
            currentScreen === 'ambulance' ? 'text-red-500' : 'text-slate-400'
          }`}
        >
          <Ambulance className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">SOS</span>
        </button>

        <button
          onClick={() => setScreen('profile')}
          className={`flex flex-col items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
            currentScreen === 'profile' ? 'text-[#0B5A4B]' : 'text-slate-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Profile</span>
        </button>
      </footer>

      {/* Full Screen AI Health & Cost Advisor Modal */}
      {showAiAdvisorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl">
            <AIHealthAdvisor
              initialSymptom={symptomsSearch}
              onClose={() => setShowAiAdvisorModal(false)}
              onSelectSpecialist={(spec) => {
                setSelectedSpecialty(spec);
                setShowAiAdvisorModal(false);
                setScreen('specialist-suggestion');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
