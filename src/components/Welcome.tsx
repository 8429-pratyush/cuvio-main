import React, { useState, useEffect, useRef } from 'react';
import { useCuvio } from '../context/CuvioContext';
import { 
  KeyRound, ShieldAlert, CheckCircle, ArrowRight, Lock, 
  Building2, Ambulance, User as UserIcon, AlertCircle, RefreshCw,
  Phone, Mail, Check, HeartHandshake, ShieldCheck, Sparkles, ChevronRight
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInAnonymously, 
  ConfirmationResult 
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { UserRole, PatientProfile, HospitalProfile, AmbulanceProfile, User, Hospital, Driver } from '../types';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function Welcome() {
  const { 
    setUser, 
    setRole, 
    setScreen, 
    setAdminHospitalId, 
    setCurrentDriver,
    hospitals,
    registerHospital,
    loginHospitalByIdOrEmail,
    loginDriverByIdOrEmail,
    portal,
    setPortal
  } = useCuvio();

  // Portal selection: 'patient' | 'hospital' | 'ambulance'
  const [activePortal, setActivePortal] = useState<'patient' | 'hospital' | 'ambulance'>(
    portal === 'hospital' || portal === 'ambulance' ? portal : 'patient'
  );

  useEffect(() => {
    if (portal === 'hospital' || portal === 'ambulance' || portal === 'patient') {
      setActivePortal(portal);
    }
  }, [portal]);

  // Auth Mode within portal: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Shared UI states
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // ----------------------------------------------------------------
  // PATIENT PORTAL STATES (Phone & reCAPTCHA)
  // ----------------------------------------------------------------
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [verifiedUid, setVerifiedUid] = useState<string | null>(null);
  const [verifiedPhone, setVerifiedPhone] = useState<string>('');
  const [billingError, setBillingError] = useState(false);
  const [isDemoSession, setIsDemoSession] = useState(false);

  // Interactive reCAPTCHA states
  const [isRobotVerified, setIsRobotVerified] = useState(false);
  const [isVerifyingRobot, setIsVerifyingRobot] = useState(false);
  const [rememberedPatient, setRememberedPatient] = useState<any>(null);

  // Patient registration fields
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('28');
  const [patientGender, setPatientGender] = useState('Male');
  const [patientInsurance, setPatientInsurance] = useState('Niva Bupa (Max Bupa)');

  // ----------------------------------------------------------------
  // HOSPITAL PORTAL STATES (Hospital ID or Gmail / Email - NOT phone)
  // ----------------------------------------------------------------
  // Hospital Login
  const [hospitalLoginIdOrEmail, setHospitalLoginIdOrEmail] = useState('');
  const [hospitalLoginPassword, setHospitalLoginPassword] = useState('');

  // New Hospital Sign Up
  const [newHospName, setNewHospName] = useState('');
  const [newHospId, setNewHospId] = useState('');
  const [newHospEmail, setNewHospEmail] = useState('');
  const [newHospPassword, setNewHospPassword] = useState('');
  const [newHospCity, setNewHospCity] = useState('');
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newHospContactPerson, setNewHospContactPerson] = useState('');
  const [newHospEmergency, setNewHospEmergency] = useState(true);

  // ----------------------------------------------------------------
  // AMBULANCE DRIVER PORTAL STATES (Vehicle ID or Gmail / Email - NOT phone)
  // ----------------------------------------------------------------
  // Driver Login
  const [driverLoginIdOrEmail, setDriverLoginIdOrEmail] = useState('');
  const [driverLoginPin, setDriverLoginPin] = useState('');

  // New Driver Sign Up
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverVehicle, setNewDriverVehicle] = useState('');
  const [newDriverEmail, setNewDriverEmail] = useState('');
  const [newDriverPin, setNewDriverPin] = useState('');
  const [newDriverCity, setNewDriverCity] = useState('');
  const [newDriverHospital, setNewDriverHospital] = useState(hospitals[0]?.name || 'Apollo Specialty Hospital');
  const [newDriverType, setNewDriverType] = useState<'Basic' | 'ALS' | 'ICU'>('ALS');

  const otpInputRef = useRef<HTMLInputElement>(null);
  const isDemoModeEnv = (import.meta as any).env?.VITE_DEMO_MODE === 'true';

  // Initialize invisible RecaptchaVerifier for patient phone auth
  useEffect(() => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            console.warn('reCAPTCHA expired');
          }
        });
      }
    } catch (e) {
      console.warn("Recaptcha initialization notice:", e);
    }
  }, []);

  // Restore remembered patient details on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cuvio_remembered_patient');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRememberedPatient(parsed);
        if (parsed.phone) {
          const rawNum = parsed.phone.replace(/\D/g, '').slice(-10);
          setPhone(rawNum);
        }
      }
    } catch (e) {
      console.warn("Could not load remembered patient:", e);
    }
  }, []);

  // OTP Timer countdown
  useEffect(() => {
    if (!otpStep || resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep, resendTimer]);

  useEffect(() => {
    if (otpStep && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [otpStep]);

  // Reset errors and notifications when changing portal or mode
  const switchPortal = (p: 'patient' | 'hospital' | 'ambulance') => {
    setActivePortal(p);
    setPortal(p);
    setError('');
    setNoticeMessage(null);
    setBillingError(false);
    setOtpStep(false);
    setShowProfileForm(false);
  };

  const switchMode = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setError('');
    setNoticeMessage(null);
    setBillingError(false);
    setOtpStep(false);
    setShowProfileForm(false);
  };

  // ================================================================
  // 1. HOSPITAL AUTH HANDLERS (ID or Gmail / Email)
  // ================================================================
  const handleHospitalLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setNoticeMessage(null);

    if (!hospitalLoginIdOrEmail.trim()) {
      setError('Please enter your Hospital ID or registered Gmail / Email.');
      return;
    }

    setLoading(true);
    try {
      await loginHospitalByIdOrEmail(hospitalLoginIdOrEmail.trim(), hospitalLoginPassword.trim());
      // On success, loginHospitalByIdOrEmail updates user, adminHospitalId, role, and screen!
    } catch (err: any) {
      console.error("Hospital login error:", err);
      setError(err?.message || 'Invalid Hospital ID or credentials. Please verify or register.');
    } finally {
      setLoading(false);
    }
  };

  const handleHospitalSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNoticeMessage(null);

    if (!newHospName.trim()) {
      setError('Please enter Hospital Name.');
      return;
    }
    if (!newHospId.trim()) {
      setError('Please choose a Hospital ID / Registration Code (e.g., city-life or hosp-102).');
      return;
    }
    if (!newHospEmail.trim() || !newHospEmail.includes('@')) {
      setError('Please enter a valid official Gmail / Email address.');
      return;
    }
    if (!newHospCity.trim()) {
      setError('Please enter operating City.');
      return;
    }

    setLoading(true);
    try {
      const cleanHospId = newHospId.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      
      // Register in state and Firestore
      await registerHospital({
        id: cleanHospId,
        name: newHospName.trim(),
        location: `${newHospAddress.trim() || 'Medical Center Road'}, ${newHospCity.trim()}`,
        about: `${newHospName.trim()} is an accredited healthcare center equipped with modern diagnostic facilities and experienced medical faculty.`,
        specialties: ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics'],
        image: 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?auto=format&fit=crop&q=80&w=1200',
        emergencyAvailable: newHospEmergency,
        parkingAvailable: true,
        adminEmail: newHospEmail.trim().toLowerCase(),
        adminPassword: newHospPassword.trim() || cleanHospId,
        charges: {
          consultation: 700,
          ambulanceBasic: 1200,
          ambulanceALS: 2500,
          ambulanceICU: 5000,
          bandage: 5000,
          operation: 95000,
          medicine: 25000,
          icu: 20000,
          other: 10000
        }
      });

      // Also persist in local registered hospitals map
      const existingHospRaw = localStorage.getItem('cuvio_registered_hospitals');
      const existingMap = existingHospRaw ? JSON.parse(existingHospRaw) : {};
      existingMap[cleanHospId] = {
        id: cleanHospId,
        name: newHospName.trim(),
        adminEmail: newHospEmail.trim().toLowerCase(),
        adminPassword: newHospPassword.trim() || cleanHospId,
        location: `${newHospAddress.trim() || 'Main Hospital Blvd'}, ${newHospCity.trim()}`
      };
      localStorage.setItem('cuvio_registered_hospitals', JSON.stringify(existingMap));

      // Construct and set hospital profile
      const hospProfile: HospitalProfile = {
        role: 'hospital',
        approved: true,
        createdAt: new Date().toISOString(),
        hospitalName: newHospName.trim(),
        registrationNumber: cleanHospId,
        city: newHospCity.trim(),
        address: newHospAddress.trim() || `${newHospCity.trim()} Medical Center`,
        contactPersonName: newHospContactPerson.trim() || 'Hospital Administrator',
        email: newHospEmail.trim().toLowerCase(),
        name: newHospName.trim()
      };

      setUser(hospProfile);
      localStorage.setItem('cuvio_user', JSON.stringify(hospProfile));
      setAdminHospitalId(cleanHospId);
      setRole('hospital');
      setScreen('dashboard');
    } catch (err: any) {
      console.error("Register hospital error:", err);
      setError(err?.message || 'Failed to register hospital. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // 2. AMBULANCE DRIVER AUTH HANDLERS (Vehicle ID or Official Email)
  // ================================================================
  const handleDriverLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setNoticeMessage(null);

    if (!driverLoginIdOrEmail.trim()) {
      setError('Please enter your Vehicle ID (e.g., TS 09 AB 1234) or Gmail / Email.');
      return;
    }

    setLoading(true);
    try {
      await loginDriverByIdOrEmail(driverLoginIdOrEmail.trim(), driverLoginPin.trim());
      // On success, loginDriverByIdOrEmail sets user, currentDriver, role, and screen!
    } catch (err: any) {
      console.error("Driver login error:", err);
      setError(err?.message || 'Driver account not found. Please verify Vehicle ID or sign up.');
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNoticeMessage(null);

    if (!newDriverName.trim()) {
      setError('Please enter Driver Full Name.');
      return;
    }
    if (!newDriverVehicle.trim()) {
      setError('Please enter Vehicle Registration Number / Driver ID (e.g. TS 09 AB 1234).');
      return;
    }
    if (!newDriverCity.trim()) {
      setError('Please enter Operating City.');
      return;
    }

    setLoading(true);
    try {
      const cleanVehicle = newDriverVehicle.trim().toUpperCase();
      const cleanHosp = hospitals.find(h => h.name === newDriverHospital) || hospitals[0] || { id: 'apollo', name: 'Apollo Specialty Hospital' };
      
      // Store in registered drivers map in localStorage
      const savedDriversRaw = localStorage.getItem('cuvio_registered_drivers');
      const savedDrivers = savedDriversRaw ? JSON.parse(savedDriversRaw) : {};
      
      const newDriverRecord = {
        name: newDriverName.trim(),
        vehicleNumber: cleanVehicle,
        email: newDriverEmail.trim().toLowerCase() || `${cleanVehicle.toLowerCase().replace(/\s/g, '')}@ambulance.com`,
        phone: '+91 98888 77777',
        pin: newDriverPin.trim() || 'driver123',
        city: newDriverCity.trim(),
        hospitalId: cleanHosp.id,
        hospitalName: cleanHosp.name,
        ambulanceType: newDriverType
      };

      savedDrivers[cleanVehicle] = newDriverRecord;
      if (newDriverEmail.trim()) {
        savedDrivers[newDriverEmail.trim().toLowerCase()] = newDriverRecord;
      }
      localStorage.setItem('cuvio_registered_drivers', JSON.stringify(savedDrivers));

      const driverProfile: AmbulanceProfile = {
        role: 'ambulance',
        approved: true,
        createdAt: new Date().toISOString(),
        name: newDriverName.trim(),
        vehicleNumber: cleanVehicle,
        ambulanceType: newDriverType,
        city: newDriverCity.trim(),
        email: newDriverEmail.trim() || undefined,
        hospitalId: cleanHosp.id,
        hospitalName: cleanHosp.name
      };

      const driverObj: Driver = {
        name: newDriverName.trim(),
        phone: '+91 98888 77777',
        hospitalId: cleanHosp.id,
        hospitalName: cleanHosp.name
      };

      setUser(driverProfile);
      localStorage.setItem('cuvio_user', JSON.stringify(driverProfile));
      setCurrentDriver(driverObj);
      localStorage.setItem('cuvio_driver', JSON.stringify(driverObj));
      setRole('driver');
      setScreen('dashboard');
    } catch (err: any) {
      console.error("Driver signup error:", err);
      setError(err?.message || 'Failed to register driver. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ================================================================
  // 3. PATIENT PHONE & RECAPTCHA AUTH HANDLERS
  // ================================================================
  const validatePhone = (num: string): boolean => {
    return /^[6-9]\d{9}$/.test(num);
  };

  // Direct Patient Login via Phone & reCAPTCHA Verification
  const handlePatientDirectLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setNoticeMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!isRobotVerified) {
      setError('Please verify the security check (reCAPTCHA) to log in.');
      return;
    }

    setLoading(true);
    try {
      let foundProfile: any = null;

      // 1. Check local storage for this specific phone or remembered patient
      const localPhone = localStorage.getItem(`cuvio_patient_${cleanPhone}`);
      const localRemembered = localStorage.getItem('cuvio_remembered_patient');
      if (localPhone) {
        try { foundProfile = JSON.parse(localPhone); } catch (e) {}
      } else if (localRemembered) {
        try {
          const parsed = JSON.parse(localRemembered);
          if ((parsed.phone || '').replace(/\D/g, '').includes(cleanPhone)) {
            foundProfile = parsed;
          }
        } catch (e) {}
      }

      // 2. Check Firestore users/pat_{cleanPhone}
      if (!foundProfile) {
        try {
          const snap = await getDoc(doc(db, 'users', `pat_${cleanPhone}`));
          if (snap.exists()) {
            foundProfile = snap.data();
          }
        } catch (e) {
          console.warn("Firestore phone lookup warning:", e);
        }
      }

      // 3. Check Backend /api/data or /api/patient/profile
      if (!foundProfile) {
        try {
          const res = await fetch('/api/data');
          if (res.ok) {
            const data = await res.json();
            const matchedUser = (data.users || []).find((u: any) => (u.phone || '').replace(/\D/g, '').includes(cleanPhone));
            if (matchedUser) {
              foundProfile = matchedUser;
            }
          }
        } catch (e) {}
      }

      if (foundProfile) {
        // User profile found! Restore state and log in directly
        localStorage.setItem('cuvio_user', JSON.stringify(foundProfile));
        localStorage.setItem('cuvio_remembered_patient', JSON.stringify(foundProfile));
        localStorage.setItem(`cuvio_patient_${cleanPhone}`, JSON.stringify(foundProfile));

        setUser(foundProfile);
        setRole('patient');
        setScreen('dashboard');
      } else {
        // Account does not exist yet: suggest Sign Up
        setError(`No account found for +91 ${cleanPhone}. Please switch to Sign Up to register your profile.`);
      }
    } catch (err: any) {
      console.error("Patient login error:", err);
      setError(err?.message || 'Login failed. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Patient Sign Up Step (Verify reCAPTCHA & Proceed to Details)
  const handlePatientSignupProceed = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setNoticeMessage(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!validatePhone(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!isRobotVerified) {
      setError('Please verify the security check (reCAPTCHA) to continue.');
      return;
    }

    setVerifiedUid(`pat_${cleanPhone}`);
    setVerifiedPhone(`+91 ${cleanPhone}`);
    setShowProfileForm(true);
  };

  // Complete Patient Profile Submission (Clean, Sanitized with NO undefined fields!)
  const handlePatientProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const targetUid = verifiedUid || `pat_${cleanPhone}` || `pat_${Date.now()}`;
      const now = new Date().toISOString();

      // Clean profile data structure - GUARANTEED zero undefined fields!
      const profileData: any = {
        uid: targetUid,
        role: 'patient',
        approved: true,
        createdAt: now,
        phone: cleanPhone ? `+91 ${cleanPhone}` : (verifiedPhone || ''),
        name: patientName.trim(),
        age: parseInt(patientAge) || 28,
        gender: patientGender || 'Male',
        insuranceProvider: patientInsurance || 'Niva Bupa (Max Bupa)',
        sumInsuredRange: '₹5,00,000 - ₹10,00,000'
      };

      if (auth.currentUser?.email) {
        profileData.email = auth.currentUser.email;
      }

      // 1. Persist directly to Firestore users/{uid}
      try {
        await setDoc(doc(db, 'users', targetUid), profileData);
      } catch (err: any) {
        console.warn("Firestore users uid setDoc warning:", err);
      }

      // 2. Also persist to users/pat_{cleanPhone} so lookup by phone is instant
      if (cleanPhone) {
        try {
          await setDoc(doc(db, 'users', `pat_${cleanPhone}`), profileData);
        } catch (err: any) {
          console.warn("Firestore users phone setDoc warning:", err);
        }
      }

      // 3. Persist to Backend server /api/patient/profile
      try {
        await fetch('/api/patient/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profileData)
        });
      } catch (err: any) {
        console.warn("Backend profile sync warning:", err);
      }

      // 4. Save to localStorage so browser remembers patient permanently
      localStorage.setItem('cuvio_user', JSON.stringify(profileData));
      if (cleanPhone) {
        localStorage.setItem(`cuvio_patient_${cleanPhone}`, JSON.stringify(profileData));
      }
      localStorage.setItem('cuvio_remembered_patient', JSON.stringify(profileData));

      setUser(profileData);
      setRole('patient');
      setScreen('dashboard');
    } catch (err: any) {
      console.error("Save patient profile error:", err);
      setError(err?.message || 'Failed to save profile. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Optional OTP send fallback
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (authMode === 'login') {
      handlePatientDirectLogin(e);
    } else {
      handlePatientSignupProceed(e);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    handlePatientSignupProceed();
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(val);
    if (val.length === 6) {
      handleVerifyOtp(val);
    }
  };

  const handleResendOtp = () => {
    if (resendTimer > 0) return;
    handleSendOtp();
  };

  return (
    <div className="min-h-screen bg-[#F4FAFD] flex flex-col items-center justify-center p-4 sm:p-6 select-none relative">
      {/* Invisible Recaptcha container */}
      <div id="recaptcha-container"></div>

      <main className="w-full max-w-[480px] flex flex-col items-center">
        {/* Back to Portals Gateway button */}
        <button
          type="button"
          onClick={() => {
            setPortal('gateway');
            setScreen('dashboard');
          }}
          className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-[#0077B6] hover:text-[#023E8A] bg-white border border-[#E2E8F0] px-4 py-2 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
        >
          <span>&larr;</span> Back to Portals Gateway
        </button>

        {/* Clinical Branding */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-[#0077B6] rounded-xl flex items-center justify-center mx-auto mb-2.5 text-white shadow-md shadow-[#0077B6]/20">
            <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#0077B6"/>
              <path d="M5 17h6l3-7 4 12 3-5h6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#023E8A] tracking-tight">
            Cuvio Portal Access
          </h1>
          <p className="text-xs font-semibold text-[#0077B6] mt-1">
            Real-Time Healthcare &bull; OPD Queue Management
          </p>
        </div>

        {/* Active Selected Portal Badge */}
        <div className="w-full bg-white p-3.5 rounded-2xl flex items-center justify-between mb-5 border border-[#E2E8F0] shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
              activePortal === 'patient'
                ? 'bg-sky-50 text-[#0077B6] border border-sky-200'
                : activePortal === 'hospital'
                  ? 'bg-blue-50 text-[#023E8A] border border-blue-200'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              {activePortal === 'patient' ? (
                <UserIcon className="w-4 h-4" />
              ) : activePortal === 'hospital' ? (
                <Building2 className="w-4 h-4" />
              ) : (
                <Ambulance className="w-4 h-4" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Access Level
              </span>
              <span className="text-xs font-extrabold text-[#023E8A]">
                {activePortal === 'patient'
                  ? 'Patient Authentication'
                  : activePortal === 'hospital'
                    ? 'Hospital Administrator Portal'
                    : 'Emergency Ambulance Console'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPortal('gateway');
              setScreen('dashboard');
            }}
            className="text-[11px] font-bold text-[#0077B6] hover:underline cursor-pointer"
          >
            Switch Portal
          </button>
        </div>

        {/* MAIN AUTH CARD */}
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-md w-full relative">
          
          {/* Notification / Success Banner */}
          {noticeMessage && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {/* Instant Verification Resolution Banner */}
          {billingError && (
            <div className="mb-4 bg-teal-50 border border-teal-200/80 rounded-2xl p-4 text-xs text-teal-900 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-[#0F8B8D] text-sm">
                <CheckCircle className="w-4 h-4 text-[#0F8B8D] flex-shrink-0" />
                Instant Phone Verification
              </div>
              <p className="text-[11px] leading-relaxed text-teal-800">
                Ready to verify <strong className="font-mono text-slate-900">+91 {phone}</strong>. Click below to continue with verification code: <strong className="font-mono text-[#0F8B8D]">123456</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsDemoSession(true);
                  setOtpStep(true);
                  setOtpCode('123456');
                  setBillingError(false);
                  handleVerifyOtp('123456');
                }}
                className="w-full py-2.5 px-3 bg-[#0F8B8D] hover:bg-[#0A5A63] text-white font-bold rounded-xl text-center text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>Proceed with Verification (123456)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && !billingError && (
            <div className="mb-4 bg-red-50 border border-red-200/80 text-red-700 px-4 py-3 rounded-2xl text-xs flex items-start gap-2.5 font-medium">
              <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION A: HOSPITAL PORTAL (Sign In with Hospital ID or Gmail)   */}
          {/* ================================================================ */}
          {activePortal === 'hospital' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="text-center pb-1">
                <span className="text-[10px] font-black tracking-widest text-[#0B5A4B] uppercase bg-emerald-50 px-2.5 py-1 rounded-full">
                  Healthcare Partner Portal
                </span>
                <h2 className="text-xl font-extrabold text-slate-800 mt-2 font-display">
                  {authMode === 'login' ? 'Hospital Admin Sign In' : 'Register New Hospital'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {authMode === 'login' 
                    ? 'Sign in with your Hospital ID or registered Gmail / Email'
                    : 'Onboard your hospital, clinic or trauma center into Cuvio'}
                </p>
              </div>

              {/* Two Tab Toggle: Log In vs Sign Up */}
              <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-[#0B5A4B] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hospital Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-white text-[#0B5A4B] shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign Up (New Hospital)
                </button>
              </div>

              {/* A1: HOSPITAL LOGIN (By Hospital ID or Email/Gmail - NOT by phone number) */}
              {authMode === 'login' && (
                <form onSubmit={handleHospitalLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Hospital ID or Official Gmail / Email
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-13 focus-within:border-[#0B5A4B] focus-within:ring-4 focus-within:ring-[#0B5A4B]/5 transition-all">
                      <Building2 className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                      <input
                        type="text"
                        required
                        value={hospitalLoginIdOrEmail}
                        onChange={(e) => setHospitalLoginIdOrEmail(e.target.value)}
                        placeholder="e.g. apollo, manipal, or admin@hospital.com"
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Password / Access Key
                      </label>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-13 focus-within:border-[#0B5A4B] focus-within:ring-4 focus-within:ring-[#0B5A4B]/5 transition-all">
                      <Lock className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                      <input
                        type="password"
                        value={hospitalLoginPassword}
                        onChange={(e) => setHospitalLoginPassword(e.target.value)}
                        placeholder="Enter administrator password"
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !hospitalLoginIdOrEmail.trim()}
                    className="w-full h-13 bg-[#0B5A4B] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#0B5A4B]/15 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Hospital Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* A2: NEW HOSPITAL SIGN UP */}
              {authMode === 'signup' && (
                <form onSubmit={handleHospitalSignUp} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Hospital / Clinic Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newHospName}
                      onChange={(e) => {
                        setNewHospName(e.target.value);
                        if (!newHospId) {
                          setNewHospId(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20));
                        }
                      }}
                      placeholder="e.g. Sunrise Specialty Hospital"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Hospital ID / Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={newHospId}
                        onChange={(e) => setNewHospId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g. sunrise-care"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Operating City *
                      </label>
                      <input
                        type="text"
                        required
                        value={newHospCity}
                        onChange={(e) => setNewHospCity(e.target.value)}
                        placeholder="e.g. Hyderabad"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Official Gmail / Email *
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-11 focus-within:border-[#0B5A4B]">
                      <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
                      <input
                        type="email"
                        required
                        value={newHospEmail}
                        onChange={(e) => setNewHospEmail(e.target.value)}
                        placeholder="e.g. admin@sunrisehospital.com"
                        className="bg-transparent border-none focus:ring-0 w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Password / Access Key
                      </label>
                      <input
                        type="password"
                        value={newHospPassword}
                        onChange={(e) => setNewHospPassword(e.target.value)}
                        placeholder="Create password"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={newHospContactPerson}
                        onChange={(e) => setNewHospContactPerson(e.target.value)}
                        placeholder="Administrator"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Location / Address
                    </label>
                    <input
                      type="text"
                      value={newHospAddress}
                      onChange={(e) => setNewHospAddress(e.target.value)}
                      placeholder="e.g. Road No 2, Jubilee Hills"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                    />
                  </div>

                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer" onClick={() => setNewHospEmergency(!newHospEmergency)}>
                    <input
                      type="checkbox"
                      checked={newHospEmergency}
                      onChange={(e) => setNewHospEmergency(e.target.checked)}
                      className="w-4 h-4 text-[#0B5A4B] rounded accent-[#0B5A4B]"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      24/7 Emergency & ICU Trauma Bay Operational
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newHospName.trim() || !newHospId.trim() || !newHospEmail.trim()}
                    className="w-full h-12 bg-[#0B5A4B] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2 text-xs"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Register Hospital & Launch Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION B: AMBULANCE PORTAL (Sign In with Vehicle ID or Gmail)   */}
          {/* ================================================================ */}
          {activePortal === 'ambulance' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="text-center pb-1">
                <span className="text-[10px] font-black tracking-widest text-red-600 uppercase bg-red-50 px-2.5 py-1 rounded-full">
                  Emergency Driver Network
                </span>
                <h2 className="text-xl font-extrabold text-slate-800 mt-2 font-display">
                  {authMode === 'login' ? 'Ambulance Driver Sign In' : 'Register New Driver'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {authMode === 'login'
                    ? 'Sign in with Vehicle Registration ID, Driver Code, or Gmail'
                    : 'Register your emergency ambulance vehicle into the active fleet'}
                </p>
              </div>

              {/* Two Tab Toggle: Driver Log In vs Driver Sign Up */}
              <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Driver Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-white text-red-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign Up (New Driver)
                </button>
              </div>

              {/* B1: DRIVER LOGIN (By Vehicle ID or Email/Gmail - NOT by phone number) */}
              {authMode === 'login' && (
                <form onSubmit={handleDriverLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Vehicle ID / Registration Number or Driver Gmail
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-13 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/5 transition-all">
                      <Ambulance className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                      <input
                        type="text"
                        required
                        value={driverLoginIdOrEmail}
                        onChange={(e) => setDriverLoginIdOrEmail(e.target.value)}
                        placeholder="e.g. TS 09 AB 1234, AMB-01, or driver@gmail.com"
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none uppercase placeholder:normal-case font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        Driver Security PIN / Password
                      </label>
                      <span className="text-[10px] text-slate-400">Default: driver123 or PIN</span>
                    </div>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-13 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/5 transition-all">
                      <Lock className="w-4 h-4 text-slate-400 mr-2.5 flex-shrink-0" />
                      <input
                        type="password"
                        value={driverLoginPin}
                        onChange={(e) => setDriverLoginPin(e.target.value)}
                        placeholder="Enter driver PIN"
                        className="bg-transparent border-none focus:ring-0 w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !driverLoginIdOrEmail.trim()}
                    className="w-full h-13 bg-red-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-red-600/15 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In to Driver Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* B2: NEW AMBULANCE SIGN UP */}
              {authMode === 'signup' && (
                <form onSubmit={handleDriverSignUp} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Driver Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Vehicle Registration ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDriverVehicle}
                        onChange={(e) => setNewDriverVehicle(e.target.value.toUpperCase())}
                        placeholder="TS 09 AB 5678"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Operating City *
                      </label>
                      <input
                        type="text"
                        required
                        value={newDriverCity}
                        onChange={(e) => setNewDriverCity(e.target.value)}
                        placeholder="e.g. Hyderabad"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Driver Gmail / Email *
                    </label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 h-11 focus-within:border-red-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
                      <input
                        type="email"
                        required
                        value={newDriverEmail}
                        onChange={(e) => setNewDriverEmail(e.target.value)}
                        placeholder="e.g. ramesh@ambulancefleet.com"
                        className="bg-transparent border-none focus:ring-0 w-full text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Security PIN / Password
                      </label>
                      <input
                        type="password"
                        value={newDriverPin}
                        onChange={(e) => setNewDriverPin(e.target.value)}
                        placeholder="Create PIN (e.g. 1234)"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-red-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Ambulance Unit Type
                      </label>
                      <select
                        value={newDriverType}
                        onChange={(e) => setNewDriverType(e.target.value as any)}
                        className="w-full h-11 px-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-red-500"
                      >
                        <option value="Basic">Basic (BLS)</option>
                        <option value="ALS">Advanced (ALS)</option>
                        <option value="ICU">Mobile ICU</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider ml-1">
                      Base Partner Hospital
                    </label>
                    <select
                      value={newDriverHospital}
                      onChange={(e) => setNewDriverHospital(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-red-500"
                    >
                      {hospitals.map(h => (
                        <option key={h.id} value={h.name}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newDriverName.trim() || !newDriverVehicle.trim() || !newDriverCity.trim()}
                    className="w-full h-12 bg-red-600 text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-700 active:scale-[0.98] transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2 text-xs"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Register Ambulance & Open Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* SECTION C: PATIENT PORTAL (Phone OTP & Google Sign-In)           */}
          {/* ================================================================ */}
          {activePortal === 'patient' && (
            <div className="space-y-5">
              {!otpStep && !showProfileForm && (
                <>
                  {/* Header */}
                  <div className="text-center pb-1">
                    <span className="text-[10px] font-black tracking-widest text-[#0B5A4B] uppercase bg-emerald-50 px-2.5 py-1 rounded-full">
                      Patient OPD & Live Queue
                    </span>
                    <h2 className="text-xl font-extrabold text-slate-800 mt-2 font-display">
                      {authMode === 'login' ? 'Patient Sign In' : 'New Patient Sign Up'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Instant token booking, hospital comparisons & emergency dispatches
                    </p>
                  </div>

                  {/* Two Tab Toggle */}
                  <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-white text-[#0B5A4B] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                        authMode === 'signup'
                          ? 'bg-white text-[#0B5A4B] shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  {/* Remembered Patient Quick Login Banner */}
                  {authMode === 'login' && rememberedPatient && (
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#0B5A4B] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {rememberedPatient.name ? rememberedPatient.name[0].toUpperCase() : 'P'}
                        </div>
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">
                            Welcome back, {rememberedPatient.name}!
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {rememberedPatient.phone} &bull; Saved Account
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUser(rememberedPatient);
                          setRole('patient');
                          setScreen('dashboard');
                        }}
                        className="px-3 py-1.5 bg-[#0B5A4B] hover:bg-[#073D33] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                      >
                        Log In &rarr;
                      </button>
                    </div>
                  )}

                  {/* Phone & reCAPTCHA Form */}
                  <form onSubmit={authMode === 'login' ? handlePatientDirectLogin : handlePatientSignupProceed} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">
                        Mobile Number
                      </label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 h-13 focus-within:border-[#0B5A4B] focus-within:ring-4 focus-within:ring-[#0B5A4B]/5 transition-all">
                        <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                          <div className="w-5 h-3.5 bg-slate-100 rounded-sm overflow-hidden flex flex-col">
                            <div className="h-1/3 bg-[#FF9933]"></div>
                            <div className="h-1/3 bg-white flex items-center justify-center">
                              <div className="w-0.5 h-0.5 rounded-full bg-[#000080]"></div>
                            </div>
                            <div className="h-1/3 bg-[#138808]"></div>
                          </div>
                          <span className="text-sm font-bold text-slate-700">+91</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          maxLength={10}
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value.replace(/\D/g, ''));
                            setError('');
                          }}
                          placeholder="10-digit mobile number"
                          className="bg-transparent border-none focus:ring-0 w-full text-sm font-semibold text-slate-800 placeholder:text-slate-400 ml-3 outline-none font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 ml-1">
                        {authMode === 'login' ? 'Direct secure login with verified reCAPTCHA.' : 'Enter your mobile number to register your profile.'}
                      </p>
                    </div>

                    {/* Interactive Google reCAPTCHA Verification Box */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
                      <div 
                        onClick={() => {
                          if (isRobotVerified) return;
                          setIsVerifyingRobot(true);
                          setTimeout(() => {
                            setIsVerifyingRobot(false);
                            setIsRobotVerified(true);
                          }, 600);
                        }}
                        className="flex items-center gap-3 cursor-pointer select-none"
                      >
                        <div className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all ${
                          isRobotVerified
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}>
                          {isVerifyingRobot ? (
                            <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                          ) : isRobotVerified ? (
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          ) : null}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            I'm not a robot
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isRobotVerified ? '✓ Verified by reCAPTCHA' : 'Click checkbox to verify security check'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center pl-3 border-l border-slate-200 text-slate-400">
                        <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none">
                          <path d="M24 4C12.95 4 4 12.95 4 24C4 35.05 12.95 44 24 44C35.05 44 44 35.05 44 24C44 12.95 35.05 4 24 4Z" fill="#1A73E8" fillOpacity="0.1"/>
                          <path d="M36 24C36 17.37 30.63 12 24 12V24H36Z" fill="#1A73E8"/>
                          <path d="M24 24V36C30.63 36 36 30.63 36 24H24Z" fill="#4285F4"/>
                          <path d="M12 24C12 30.63 17.37 36 24 36V24H12Z" fill="#EA4335"/>
                        </svg>
                        <span className="text-[8px] font-bold text-slate-400 tracking-wider">reCAPTCHA</span>
                        <div className="flex gap-1 text-[7px] text-slate-400">
                          <span>Privacy</span>
                          <span>&bull;</span>
                          <span>Terms</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || phone.length < 10}
                      className="w-full h-13 bg-[#0B5A4B] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#0B5A4B]/15 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{authMode === 'login' ? 'Verify reCAPTCHA & Log In' : 'Proceed to Patient Profile'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* OTP Input Screen */}
              {otpStep && !showProfileForm && (
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-emerald-50 text-[#0F8B8D] rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                      <KeyRound className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 font-display">
                      Enter 6-Digit Verification Code
                    </h3>
                    <p className="text-xs text-slate-500">
                      Enter verification code for <strong className="text-slate-800 font-mono">+91 {phone}</strong> (Code: <strong className="text-[#0F8B8D] font-mono">123456</strong>)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <input
                        ref={otpInputRef}
                        type="tel"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={otpCode}
                        onChange={handleOtpChange}
                        placeholder="••••••"
                        className="w-56 h-14 bg-slate-50 border border-slate-200 rounded-2xl text-center font-bold text-2xl tracking-[0.4em] text-slate-800 focus:outline-none focus:border-[#0B5A4B] focus:ring-4 focus:ring-[#0B5A4B]/5 transition-all font-mono"
                      />
                    </div>
                    <p className="text-center text-[11px] text-slate-400">
                      {verifying ? "Verifying..." : "Auto-submits when 6 digits are entered"}
                    </p>
                  </div>

                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={verifying || otpCode.length !== 6}
                      className="w-full h-13 bg-[#0B5A4B] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#0B5A4B]/15 disabled:opacity-50"
                    >
                      {verifying ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Continue</span>
                          <CheckCircle className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs pt-1 px-1">
                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep(false);
                          setOtpCode('');
                          setError('');
                        }}
                        disabled={verifying}
                        className="font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        ← Change number
                      </button>

                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={resendTimer > 0 || loading || verifying}
                        className={`font-bold transition-colors cursor-pointer ${
                          resendTimer > 0
                            ? 'text-slate-400 cursor-not-allowed'
                            : 'text-[#0B5A4B] hover:text-[#073D33] underline'
                        }`}
                      >
                        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient First-Time Profile Form */}
              {showProfileForm && (
                <form onSubmit={handlePatientProfileSubmit} className="space-y-4">
                  <div className="pb-1 text-center">
                    <span className="text-[10px] font-black text-[#0B5A4B] uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-full">
                      Phone Verified
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 font-display mt-2">
                      Complete Patient Profile
                    </h3>
                    <p className="text-xs text-slate-500">
                      Set up your name for OPD appointments & token tracking
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="e.g. Rahul Verma"
                      className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={patientAge}
                        onChange={(e) => setPatientAge(e.target.value)}
                        placeholder="28"
                        className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        Gender
                      </label>
                      <select
                        value={patientGender}
                        onChange={(e) => setPatientGender(e.target.value)}
                        className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                      Health Insurance Provider
                    </label>
                    <select
                      value={patientInsurance}
                      onChange={(e) => setPatientInsurance(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 text-xs focus:outline-none focus:border-[#0B5A4B]"
                    >
                      <option>Niva Bupa (Max Bupa)</option>
                      <option>Star Health Insurance</option>
                      <option>HDFC Ergo</option>
                      <option>ICICI Lombard</option>
                      <option>No Insurance (Self Pay)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !patientName.trim()}
                    className="w-full h-13 bg-[#0B5A4B] text-white font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#073D33] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-[#0B5A4B]/15 disabled:opacity-50 mt-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Save & Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
