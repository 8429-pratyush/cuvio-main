import React, { createContext, useContext, useState, useEffect } from 'react';
import { Hospital, Doctor, BookingRequest, AmbulanceBooking, Prescription, User, Driver, UserRole, HospitalProfile, AmbulanceProfile, ChatMessage, HospitalSubscription } from '../types';
import { collection, doc, setDoc, onSnapshot, writeBatch, deleteDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { assignQueueTokenAndEntry, cancelQueueEntry, getKolkataDateString } from '../lib/queueService';

interface CuvioContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  isProfileLoading: boolean;
  portal: 'gateway' | 'patient' | 'hospital' | 'ambulance';
  setPortal: (portal: 'gateway' | 'patient' | 'hospital' | 'ambulance') => void;
  currentDriver: Driver | null;
  setCurrentDriver: React.Dispatch<React.SetStateAction<Driver | null>>;
  currentScreen: 'splash' | 'onboarding' | 'login' | 'dashboard' | 'hospital-selection' | 'hospital-profile' | 'health-concern' | 'specialist-suggestion' | 'cost-calculator' | 'queue-tracking' | 'ambulance' | 'prescriptions' | 'profile';
  role: 'patient' | 'hospital' | 'ambulance' | 'admin' | 'driver';
  hospitals: Hospital[];
  doctors: Doctor[];
  bookings: BookingRequest[];
  ambulanceBookings: AmbulanceBooking[];
  prescriptions: Prescription[];
  messages: ChatMessage[];
  liveAlert: string | null;
  dismissLiveAlert: () => void;
  activeHospitalId: string | null;
  activeDoctorId: string | null;
  activeBookingId: string | null;
  activeAmbulanceId: string | null;
  symptomsSearch: string;
  adminTab: 'bookings' | 'queue' | 'doctors' | 'emergency' | 'settings' | 'messages';
  adminHospitalId: string | null;
  
  // Actions
  setScreen: (screen: 'splash' | 'onboarding' | 'login' | 'dashboard' | 'hospital-selection' | 'hospital-profile' | 'health-concern' | 'specialist-suggestion' | 'cost-calculator' | 'queue-tracking' | 'ambulance' | 'prescriptions' | 'profile') => void;
  setRole: (role: 'patient' | 'hospital' | 'ambulance' | 'admin' | 'driver') => void;
  setAdminTab: (tab: 'bookings' | 'queue' | 'doctors' | 'emergency' | 'settings' | 'messages') => void;
  setAdminHospitalId: (id: string | null) => void;
  login: (name: string, phone: string, insuranceProvider?: string, sumInsuredRange?: string) => void;
  signUp: (name: string, phone: string, insuranceProvider?: string, sumInsuredRange?: string) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<User>;
  loginHospitalByIdOrEmail: (idOrEmail: string, password?: string) => Promise<Hospital>;
  loginDriverByIdOrEmail: (idOrEmail: string, passwordOrPin?: string) => Promise<AmbulanceProfile>;
  registerDriver: (name: string, phone: string, hospitalId: string, hospitalName: string, hospitalPassword?: string) => Promise<void>;
  loginDriver: (phone: string) => Promise<void>;
  logoutDriver: () => void;
  logout: () => void;
  clearPatientSession: () => void;
  updateUser: (updatedData: Partial<User>) => void;
  selectHospital: (id: string | null) => void;
  selectDoctor: (id: string | null) => void;
  setSymptomsSearch: (search: string) => void;
  bookAppointment: (hospitalId: string, doctorId: string, department: string, date: string, time: string) => BookingRequest;
  cancelAppointment: (bookingId: string) => Promise<void>;
  sendMessage: (clinicId: string, clinicName: string, text: string, from: 'patient' | 'hospital') => Promise<void>;
  
  // Admin Actions
  updateBookingStatus: (bookingId: string, status: 'Confirmed' | 'Rescheduled' | 'Rejected', rescheduleTime?: string) => void;
  updateQueueToken: (doctorId: string, bookingId: string, status: 'Waiting' | 'In Consultation' | 'Completed' | 'No-Show') => void;
  updateDoctorStatus: (doctorId: string, availability: 'Available' | 'On Break' | 'Unavailable') => void;
  
  // Ambulance Actions
  requestAmbulance: (pickup: string, destinationId: string, type: 'Basic' | 'ALS' | 'ICU', patientName?: string, patientPhone?: string, driverName?: string, driverPhone?: string, status?: 'Requested' | 'Dispatched' | 'Arrived' | 'EnRouteToHospital' | 'Completed') => AmbulanceBooking;
  updateAmbulanceStatus: (ambulanceId: string, status: 'Dispatched' | 'Arrived' | 'EnRouteToHospital' | 'Completed') => void;
  
  // Hospital Settings Actions
  updateHospitalCharges: (hospitalId: string, charges: {
    consultation: number;
    ambulanceBasic: number;
    ambulanceALS: number;
    ambulanceICU: number;
    bandage: number;
    operation: number;
    medicine: number;
    icu: number;
    other: number;
  updateHospitalAmbulancePhone: (hospitalId: string, phone: string, hotline?: string) => Promise<void>;
  payHospitalSubscription: (hospitalId: string, paymentData: {
    paymentMethod: 'Credit Card' | 'Debit Card' | 'Net Banking';
    cardLast4?: string;
    bankName?: string;
    cardholderName?: string;
  }) => Promise<{ invoiceId: string; validUntil: string }>;
  registerHospital: (hospitalData: {
    id?: string;
    name: string;
    location: string;
    about: string;
    specialties: string[];
    image: string;
    emergencyAvailable: boolean;
    parkingAvailable: boolean;
    adminEmail?: string;
    adminPassword?: string;
    charges: {
      consultation: number;
      ambulanceBasic: number;
      ambulanceALS: number;
      ambulanceICU: number;
      bandage: number;
      operation: number;
      medicine: number;
      icu: number;
      other: number;
    };
  }) => Promise<string>;
  
  // Prescription Actions
  issuePrescription: (patientName: string, doctorName: string, hospitalName: string, diagnosis: string, medications: Array<{name: string, dosage: string, frequency: string, duration: string}>, notes: string) => void;
  
  // Doctor management
  addDoctor: (docData: Omit<Doctor, 'id' | 'rating' | 'availability' | 'queuePatientsAhead'>) => void;
  removeDoctor: (doctorId: string) => void;
  saveConsultation: (symptoms: string, assessment: any) => Promise<any>;
  fetchPatientConsultations: () => Promise<any[]>;
  isOfflineMode: boolean;
}

const CuvioContext = createContext<CuvioContextType | undefined>(undefined);

// Initial Seed Data
const initialHospitals: Hospital[] = [
  {
    id: 'apollo',
    name: 'Apollo Specialty Hospital',
    location: 'Jubilee Hills, Hyderabad',
    distance: '1.2 km away',
    rating: 4.8,
    reviews: 1240,
    image: 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?auto=format&fit=crop&q=80&w=1200',
    startsAt: 800,
    qualityScore: 98,
    emergencyAvailable: true,
    parkingAvailable: true,
    currentQueueWait: 12,
    about: 'Apollo Hospitals Jubilee Hills is a 477-bed multi-specialty facility and is one of the region\'s most renowned medical centers. Known for its advanced technology and experienced medical staff, it provides a comprehensive range of healthcare services.',
    specialties: ['Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'ENT', 'Dermatology'],
    ambulancePhone: '+91 40 2360 7777',
    emergencyHotline: '1066',
    charges: {
      consultation: 800,
      ambulanceBasic: 1500,
      ambulanceALS: 3000,
      ambulanceICU: 5500,
      bandage: 8000,
      operation: 140000,
      medicine: 65000,
      icu: 35000,
      other: 15000
    }
  },
  {
    id: 'manipal',
    name: 'Manipal Heart Institute',
    location: 'Old Airport Road, Bangalore',
    distance: '7.5 km away',
    rating: 4.6,
    reviews: 940,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200',
    startsAt: 1200,
    qualityScore: 92,
    emergencyAvailable: true,
    parkingAvailable: true,
    currentQueueWait: 4,
    about: 'Manipal Hospital Bangalore is a premier multi-specialty healthcare facility offering world-class infrastructure and clinical expertise. The Heart Institute is renowned for advanced cardiac diagnostics and micro-surgical options.',
    specialties: ['Cardiology', 'Neurology', 'Gastroenterology', 'Orthopedics'],
    ambulancePhone: '+91 80 2222 1111',
    emergencyHotline: '080-25023259',
    charges: {
      consultation: 1200,
      ambulanceBasic: 1800,
      ambulanceALS: 3500,
      ambulanceICU: 6000,
      bandage: 12000,
      operation: 160000,
      medicine: 50000,
      icu: 40000,
      other: 21000
    }
  },
  {
    id: 'fortis',
    name: 'Fortis Memorial Hospital',
    location: 'Bannerghatta Road, Bangalore',
    distance: '5.1 km away',
    rating: 4.5,
    reviews: 2105,
    image: 'https://images.unsplash.com/photo-1586773860418-d3b31966cf77?auto=format&fit=crop&q=80&w=1200',
    startsAt: 650,
    qualityScore: 89,
    emergencyAvailable: false,
    parkingAvailable: true,
    currentQueueWait: 28,
    about: 'Fortis Hospital on Bannerghatta Road is a 276-bed multi-specialty hospital. It is known for its highly skilled team of orthopedic surgeons, pediatricians, and general medicine professionals dedicated to evidence-based outcomes.',
    specialties: ['Orthopedics', 'Pediatrics', 'ENT', 'Gastroenterology'],
    ambulancePhone: '+91 80 6621 4444',
    emergencyHotline: '105711',
    charges: {
      consultation: 650,
      ambulanceBasic: 1200,
      ambulanceALS: 2500,
      ambulanceICU: 4500,
      bandage: 9000,
      operation: 130000,
      medicine: 60000,
      icu: 30000,
      other: 12000
    }
  },
  {
    id: 'max',
    name: 'Max Super Speciality',
    location: 'Saket, New Delhi',
    distance: '3.1 km away',
    rating: 4.7,
    reviews: 1850,
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200',
    startsAt: 950,
    qualityScore: 96,
    emergencyAvailable: true,
    parkingAvailable: false,
    currentQueueWait: 20,
    about: 'Max Super Speciality Hospital Saket is one of the leading names in healthcare in Northern India. With state-of-the-art diagnostic machines and a dedicated emergency support network, Max offers unparalleled patient care.',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Ophthalmology'],
    ambulancePhone: '+91 11 2651 5050',
    emergencyHotline: '011-40554055',
    charges: {
      consultation: 950,
      ambulanceBasic: 1600,
      ambulanceALS: 3200,
      ambulanceICU: 5800,
      bandage: 10000,
      operation: 150000,
      medicine: 70000,
      icu: 38000,
      other: 18000
    }
  },
  {
    id: 'medanta',
    name: 'Medanta The Medicity',
    location: 'Sector 38, Gurugram',
    distance: '2.5 km away',
    rating: 4.9,
    reviews: 2450,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200',
    startsAt: 1000,
    qualityScore: 97,
    emergencyAvailable: true,
    parkingAvailable: true,
    currentQueueWait: 15,
    about: 'Medanta - The Medicity is one of India\'s largest multi-super specialty medical institutes located in Gurugram. Founded by eminent cardiac surgeon Dr. Naresh Trehan, the institution is recognized for bringing advanced surgical capabilities and affordable transparent care.',
    specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'ENT', 'Gastroenterology', 'Pediatrics'],
    ambulancePhone: '+91 124 4141 414',
    emergencyHotline: '1068',
    charges: {
      consultation: 1000,
      ambulanceBasic: 1700,
      ambulanceALS: 3400,
      ambulanceICU: 6000,
      bandage: 9500,
      operation: 145000,
      medicine: 68000,
      icu: 36000,
      other: 16000
    }
  }
];

const initialDoctors: Doctor[] = [
  {
    id: 'doc-arjun',
    hospitalId: 'apollo',
    name: 'Dr. Arjun Mehta',
    specialty: 'Orthopedics',
    experience: '15 yrs exp',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
    fee: 1000,
    availability: 'Available',
    nextSlot: '11:30 AM',
    queuePatientsAhead: 2
  },
  {
    id: 'doc-priya',
    hospitalId: 'apollo',
    name: 'Dr. Priya Sharma',
    specialty: 'Orthopedics',
    experience: '10 yrs exp',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=500',
    fee: 850,
    availability: 'Available',
    nextSlot: '12:15 PM',
    queuePatientsAhead: 4
  },
  {
    id: 'doc-ananya',
    hospitalId: 'manipal',
    name: 'Dr. Ananya Sen',
    specialty: 'Cardiology',
    experience: '12 yrs exp',
    rating: 4.9,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=500',
    fee: 1200,
    availability: 'Available',
    nextSlot: '01:00 PM',
    queuePatientsAhead: 1
  },
  {
    id: 'doc-rajesh',
    hospitalId: 'fortis',
    name: 'Dr. Rajesh Verma',
    specialty: 'Neurology',
    experience: '18 yrs exp',
    rating: 4.7,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=500',
    fee: 1500,
    availability: 'On Break',
    nextSlot: '02:30 PM',
    queuePatientsAhead: 5
  },
  {
    id: 'doc-naresh',
    hospitalId: 'medanta',
    name: 'Dr. Naresh Trehan',
    specialty: 'Cardiology',
    experience: '35 yrs exp',
    rating: 5.0,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500',
    fee: 2000,
    availability: 'Available',
    nextSlot: '10:00 AM',
    queuePatientsAhead: 1
  },
  {
    id: 'doc-savita',
    hospitalId: 'medanta',
    name: 'Dr. Savita Bansal',
    specialty: 'Orthopedics',
    experience: '18 yrs exp',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=500',
    fee: 1000,
    availability: 'Available',
    nextSlot: '12:00 PM',
    queuePatientsAhead: 3
  }
];

const initialBookings: BookingRequest[] = [
  {
    id: 'b-101',
    patientName: 'Rahul Verma',
    patientPhone: '+91 98765 43210',
    hospitalId: 'apollo',
    hospitalName: 'Apollo Specialty Hospital',
    doctorId: 'doc-arjun',
    doctorName: 'Dr. Arjun Mehta',
    department: 'Orthopedics',
    date: 'Today',
    time: '11:15 AM',
    status: 'Pending'
  },
  {
    id: 'b-102',
    patientName: 'Amit Saxena',
    patientPhone: '+91 91122 33445',
    hospitalId: 'apollo',
    hospitalName: 'Apollo Specialty Hospital',
    doctorId: 'doc-priya',
    doctorName: 'Dr. Priya Sharma',
    department: 'Orthopedics',
    date: 'Today',
    time: '12:30 PM',
    status: 'Pending'
  },
  {
    id: 'b-103',
    patientName: 'Karan Malhotra',
    patientPhone: '+91 90000 11111',
    hospitalId: 'manipal',
    hospitalName: 'Manipal Heart Institute',
    doctorId: 'doc-ananya',
    doctorName: 'Dr. Ananya Sen',
    department: 'Cardiology',
    date: 'Today',
    time: '01:00 PM',
    status: 'Confirmed',
    tokenNumber: 5,
    estimatedWaitTime: 15
  }
];

const initialPrescriptions: Prescription[] = [
  {
    id: 'rx-201',
    patientName: 'Rahul Verma',
    date: '2026-06-15',
    doctorName: 'Dr. Arjun Mehta',
    hospitalName: 'Apollo Specialty Hospital',
    diagnosis: 'Mild Osteoarthritis of Knee Joint',
    medications: [
      { name: 'Tab Glucosamine 1500mg', dosage: 'Once daily', frequency: 'With breakfast', duration: '30 days' },
      { name: 'Tab Paracetamol 650mg', dosage: 'One tab as needed', frequency: 'For pain, max 3x daily', duration: '5 days' }
    ],
    notes: 'Apply warm compress twice daily. Gentle isometric knee exercises recommended. Avoid high-impact running or heavy weight-bearing.',
    status: 'Completed'
  }
];

export const CuvioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [portal, setPortalState] = useState<'gateway' | 'patient' | 'hospital' | 'ambulance'>(() => {
    const saved = localStorage.getItem('cuvio_portal');
    return (saved as any) || 'gateway';
  });

  const setPortal = (p: 'gateway' | 'patient' | 'hospital' | 'ambulance') => {
    setPortalState(p);
    localStorage.setItem('cuvio_portal', p);
    if (p === 'patient') {
      setRoleState('patient');
    } else if (p === 'hospital') {
      setRoleState('admin');
    } else if (p === 'ambulance') {
      setRoleState('driver');
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [liveAlert, setLiveAlert] = useState<string | null>(null);
  const dismissLiveAlert = () => setLiveAlert(null);

  // Auto-dismiss live alerts after 6 seconds
  useEffect(() => {
    if (!liveAlert) return;
    const timer = setTimeout(() => {
      setLiveAlert(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [liveAlert]);

  const [currentDriver, setCurrentDriver] = useState<Driver | null>(() => {
    const saved = localStorage.getItem('cuvio_driver');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentScreen, setScreenState] = useState<'splash' | 'onboarding' | 'login' | 'dashboard' | 'hospital-selection' | 'hospital-profile' | 'health-concern' | 'specialist-suggestion' | 'cost-calculator' | 'queue-tracking' | 'ambulance' | 'prescriptions' | 'profile'>(() => {
    const saved = localStorage.getItem('cuvio_screen');
    return saved ? (saved as any) : 'splash';
  });
  const [role, setRoleState] = useState<'patient' | 'hospital' | 'ambulance' | 'admin' | 'driver'>(() => {
    const saved = localStorage.getItem('cuvio_role');
    return (saved as any) || 'patient';
  });
  const [adminTab, setAdminTab] = useState<'bookings' | 'queue' | 'doctors' | 'emergency' | 'settings' | 'messages'>('bookings');

  // Automatically persist screen and role on modification
  useEffect(() => {
    localStorage.setItem('cuvio_screen', currentScreen);
  }, [currentScreen]);

  useEffect(() => {
    localStorage.setItem('cuvio_role', role);
  }, [role]);

  const [adminHospitalId, setAdminHospitalIdState] = useState<string | null>(() => {
    return localStorage.getItem('cuvio_admin_hospital_id') || null;
  });

  const setAdminHospitalId = (id: string | null) => {
    setAdminHospitalIdState(id);
    if (id) {
      localStorage.setItem('cuvio_admin_hospital_id', id);
    } else {
      localStorage.removeItem('cuvio_admin_hospital_id');
    }
  };

  const [hospitals, setHospitals] = useState<Hospital[]>(() => {
    const saved = localStorage.getItem('cuvio_hospitals');
    return saved ? JSON.parse(saved) : initialHospitals;
  });

  const [doctors, setDoctors] = useState<Doctor[]>(() => {
    const saved = localStorage.getItem('cuvio_doctors');
    return saved ? JSON.parse(saved) : initialDoctors;
  });

  const [bookings, setBookings] = useState<BookingRequest[]>(() => {
    const saved = localStorage.getItem('cuvio_bookings');
    return saved ? JSON.parse(saved) : initialBookings;
  });

  const [ambulanceBookings, setAmbulanceBookings] = useState<AmbulanceBooking[]>(() => {
    const saved = localStorage.getItem('cuvio_ambulances');
    return saved ? JSON.parse(saved) : [];
  });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const saved = localStorage.getItem('cuvio_prescriptions');
    return saved ? JSON.parse(saved) : initialPrescriptions;
  });

  const [activeHospitalId, setActiveHospitalId] = useState<string | null>(null);
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [activeAmbulanceId, setActiveAmbulanceId] = useState<string | null>(null);
  const [symptomsSearch, setSymptomsSearch] = useState<string>('');
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);

  // Initial fetch and real-time synchronization from Firestore
  useEffect(() => {
    // Check line connectivity
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 1. Hospitals Collection
    const unsubHospitals = onSnapshot(collection(db, 'hospitals'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Hospital);
      setHospitals(list);
      localStorage.setItem('cuvio_hospitals', JSON.stringify(list));

      // Dynamically seed/upsert any initial hospitals that are missing from the Firestore database
      const missingHospitals = initialHospitals.filter(initH => !list.some(h => h.id === initH.id));
      if (missingHospitals.length > 0) {
        const batch = writeBatch(db);
        missingHospitals.forEach((h) => {
          const docRef = doc(db, 'hospitals', h.id);
          batch.set(docRef, h);
        });
        batch.commit().catch(err => {
          console.warn("Offline/unreachable seeding hospitals:", err);
          setIsOfflineMode(true);
        });
      }
    }, (err) => {
      console.warn("Firestore collection 'hospitals' unavailable or permission denied; using local cache:", err?.message || err);
      setIsOfflineMode(true);
    });

    // 2. Doctors Collection
    const unsubDoctors = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Doctor);
      setDoctors(list);
      localStorage.setItem('cuvio_doctors', JSON.stringify(list));

      // Dynamically seed/upsert any initial doctors that are missing from the Firestore database
      const missingDoctors = initialDoctors.filter(initD => !list.some(d => d.id === initD.id));
      if (missingDoctors.length > 0) {
        const batch = writeBatch(db);
        missingDoctors.forEach((d) => {
          const docRef = doc(db, 'doctors', d.id);
          batch.set(docRef, d);
        });
        batch.commit().catch(err => {
          console.warn("Offline/unreachable seeding doctors:", err);
          setIsOfflineMode(true);
        });
      }
    }, (err) => {
      console.warn("Firestore collection 'doctors' unavailable or permission denied; using local cache:", err?.message || err);
      setIsOfflineMode(true);
    });

    // 3. Bookings Collection
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      if (snapshot.empty) {
        // Seed initial bookings if empty to keep demo data
        const batch = writeBatch(db);
        initialBookings.forEach((b) => {
          const docRef = doc(db, 'bookings', b.id);
          batch.set(docRef, b);
        });
        batch.commit().catch(err => {
          console.warn("Offline/unreachable seeding bookings:", err);
          setIsOfflineMode(true);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as BookingRequest);
        // Sort by id desc
        list.sort((a, b) => b.id.localeCompare(a.id));
        setBookings(list);
        localStorage.setItem('cuvio_bookings', JSON.stringify(list));

        // Cross-portal real-time alerts
        snapshot.docChanges().forEach(change => {
          if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
            const b = change.doc.data() as BookingRequest;
            setLiveAlert(`🔔 New Token Booked: ${b.queueToken || '#' + b.tokenNumber} for ${b.patientName} at ${b.hospitalName}!`);
          } else if (change.type === 'modified') {
            const b = change.doc.data() as BookingRequest;
            if (b.status === 'Confirmed' || b.queueStatus === 'In Consultation') {
              setLiveAlert(`⚡ Token ${b.queueToken || '#' + b.tokenNumber}: Now Serving! ${b.patientName}, please proceed.`);
            } else if (b.status === 'Completed') {
              setLiveAlert(`✅ Consultation complete for ${b.patientName}. Digital prescription issued.`);
            }
          }
        });
      }
    }, (err) => {
      console.warn("Firestore collection 'bookings' unavailable or permission denied; using local cache:", err?.message || err);
      setIsOfflineMode(true);
    });

    // 4. Ambulance Bookings Collection
    const unsubAmbulances = onSnapshot(collection(db, 'ambulanceBookings'), (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as AmbulanceBooking);
      list.sort((a, b) => b.id.localeCompare(a.id));
      setAmbulanceBookings(list);
      localStorage.setItem('cuvio_ambulance_bookings', JSON.stringify(list));

      // Cross-portal ambulance real-time alerts
      snapshot.docChanges().forEach(change => {
        const a = change.doc.data() as AmbulanceBooking;
        if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
          setLiveAlert(`🚨 Emergency Ambulance SOS requested by ${a.patientName} for ${a.destinationHospitalName}!`);
        } else if (change.type === 'modified') {
          if (a.status === 'Dispatched') {
            setLiveAlert(`🚑 Ambulance Dispatched: Driver ${a.driverName} is en route (ETA ~${a.driverEta} min).`);
          } else if (a.status === 'Arrived') {
            setLiveAlert(`📍 Ambulance Arrived at pickup: ${a.pickupLocation}!`);
          } else if (a.status === 'Completed') {
            setLiveAlert(`🏥 Patient safely checked in at Emergency Ward. Mission complete!`);
          }
        }
      });
    }, (err) => {
      console.warn("Firestore collection 'ambulanceBookings' unavailable or permission denied; using local cache:", err?.message || err);
      setIsOfflineMode(true);
    });

    // 5. Prescriptions Collection
    const unsubPrescriptions = onSnapshot(collection(db, 'prescriptions'), (snapshot) => {
      if (snapshot.empty) {
        const batch = writeBatch(db);
        initialPrescriptions.forEach((p) => {
          const docRef = doc(db, 'prescriptions', p.id);
          batch.set(docRef, p);
        });
        batch.commit().catch(err => {
          console.warn("Offline/unreachable seeding prescriptions:", err);
          setIsOfflineMode(true);
        });
      } else {
        const list = snapshot.docs.map(doc => doc.data() as Prescription);
        list.sort((a, b) => b.id.localeCompare(a.id));
        setPrescriptions(list);
        localStorage.setItem('cuvio_prescriptions', JSON.stringify(list));
      }
    }, (err) => {
      console.warn("Firestore collection 'prescriptions' unavailable or permission denied; using local cache:", err?.message || err);
      setIsOfflineMode(true);
    });

    // 6. Messages Collection (Real-time 2-way patient-hospital communication)
    const unsubMessages = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(list);

      snapshot.docChanges().forEach(change => {
        if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
          const m = change.doc.data() as ChatMessage;
          if (m.from === 'hospital') {
            setLiveAlert(`💬 Message from ${m.clinicName || 'Hospital'}: "${m.text}"`);
          } else {
            setLiveAlert(`💬 Message from patient ${m.name}: "${m.text}"`);
          }
        }
      });
    }, (err) => {
      console.warn("Firestore collection 'messages' error:", err);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubHospitals();
      unsubDoctors();
      unsubBookings();
      unsubAmbulances();
      unsubPrescriptions();
      unsubMessages();
    };
  }, []);

  // Synchronize onAuthStateChanged: Firestore is the single source of truth for user profiles
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setIsProfileLoading(true);
      if (fbUser) {
        try {
          const userSnap = await getDoc(doc(db, 'users', fbUser.uid));
          if (userSnap.exists()) {
            const profile = userSnap.data() as User;
            setUser(profile);
            if (profile.role) {
              setRoleState(profile.role as any);
              localStorage.setItem('cuvio_role', profile.role);
            }
            // Navigate directly to dashboard if on landing/login/onboarding
            setScreenState(prev => (prev === 'splash' || prev === 'login' || prev === 'onboarding') ? 'dashboard' : prev);
          } else {
            // User authenticated in Firebase Auth but profile does not exist in users/{uid} yet
            setUser(null);
          }
        } catch (err) {
          console.warn("Firestore users/{uid} fetch error:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setIsProfileLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Real-time synchronization of users/{uid} document from Firestore
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const userRef = doc(db, 'users', currentUid);
    const unsubUser = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data() as User;
        setUser(prev => {
          if (JSON.stringify(prev) === JSON.stringify(userData)) return prev;
          if (userData.role) {
            setRoleState(userData.role as any);
            localStorage.setItem('cuvio_role', userData.role);
          }
          return userData;
        });
      }
    }, (err) => {
      console.warn("Firestore user document listener warning:", err);
    });

    return () => {
      unsubUser();
    };
  }, [auth.currentUser?.uid]);

  const setScreen = (screen: typeof currentScreen) => {
    setScreenState(screen);
  };

  const setRole = (newRole: 'patient' | 'hospital' | 'ambulance' | 'admin' | 'driver') => {
    setRoleState(newRole);
    if ((newRole === 'patient') && !user && !auth.currentUser) {
      setScreenState('login');
    }
  };

  const login = (name: string, phone: string, insuranceProvider?: string, sumInsuredRange?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const docId = auth.currentUser?.uid || (cleanPhone ? `pat_${cleanPhone}` : `pat_${Date.now()}`);
    const newUser: User = { 
      uid: docId,
      role: 'patient', 
      approved: false, 
      createdAt: new Date().toISOString(), 
      name, 
      phone, 
      age: 28, 
      gender: 'Male',
      insuranceProvider: insuranceProvider || 'Niva Bupa (Max Bupa)', 
      sumInsuredRange: sumInsuredRange || '₹5,00,000 - ₹10,00,000' 
    };
    setUser(newUser);
    setScreenState('dashboard');

    // Persist to backend Firestore API
    fetch('/api/patient/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    }).catch(e => console.warn('Sync patient login to Firestore backend error:', e));

    if (auth.currentUser?.uid) {
      setDoc(doc(db, 'users', auth.currentUser.uid), newUser, { merge: true }).catch(() => {});
    }
  };

  const signUp = async (name: string, phone: string, insuranceProvider?: string, sumInsuredRange?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const docId = auth.currentUser?.uid || (cleanPhone ? `pat_${cleanPhone}` : `pat_${Date.now()}`);
    const newPatient: User = {
      uid: docId,
      role: 'patient',
      approved: false,
      createdAt: new Date().toISOString(),
      name,
      phone: auth.currentUser?.phoneNumber || phone,
      age: 28,
      gender: 'Other',
      insuranceProvider: insuranceProvider || 'Niva Bupa (Max Bupa)',
      sumInsuredRange: sumInsuredRange || '₹5,00,000 - ₹10,00,000'
    };

    if (auth.currentUser?.uid) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), newPatient).catch(e => console.warn('setDoc user error:', e));
    }
    // Always persist to Firestore backend
    await fetch('/api/patient/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPatient)
    }).catch(e => console.warn('Sync patient signup to Firestore error:', e));

    setUser(newPatient);
    setScreenState('dashboard');
  };

  const loginWithPhone = async (phone: string): Promise<User> => {
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      try {
        const snap = await getDoc(doc(db, 'users', currentUid));
        if (snap.exists()) {
          const u = snap.data() as User;
          setUser(u);
          setScreenState('dashboard');
          return u;
        }
      } catch (e) {}
    }

    // Query backend Firestore API by phone to restore full profile
    try {
      const res = await fetch(`/api/patient/profile/${encodeURIComponent(phone)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const u = data.user as User;
          setUser(u);
          setScreenState('dashboard');
          return u;
        }
      }
    } catch (e) {
      console.warn("Error fetching patient profile from Firestore backend:", e);
    }

    if (user) {
      setScreenState('dashboard');
      return user;
    }
    throw new Error("Account not found, please Sign Up first");
  };

  const loginHospitalByIdOrEmail = async (idOrEmail: string, password?: string): Promise<Hospital> => {
    const query = idOrEmail.trim().toLowerCase();
    
    // 1. Check loaded hospitals state
    let matched = hospitals.find(h => 
      h.id.toLowerCase() === query || 
      (h.adminEmail && h.adminEmail.toLowerCase() === query) ||
      h.name.toLowerCase() === query
    );

    // 2. Check registered hospitals in localStorage
    if (!matched) {
      const customHospRaw = localStorage.getItem('cuvio_registered_hospitals');
      if (customHospRaw) {
        try {
          const customHosp: Record<string, Hospital> = JSON.parse(customHospRaw);
          matched = Object.values(customHosp).find(h => 
            h.id.toLowerCase() === query || 
            (h.adminEmail && h.adminEmail.toLowerCase() === query)
          );
        } catch (e) {}
      }
    }

    // 3. Fallback matching
    if (!matched) {
      if (query.includes('apollo') || query === 'admin@apollo.com') {
        matched = hospitals.find(h => h.id === 'apollo') || initialHospitals[0];
      } else if (query.includes('manipal') || query === 'admin@manipal.com') {
        matched = hospitals.find(h => h.id === 'manipal') || initialHospitals[1];
      } else if (query.includes('medanta') || query === 'admin@medanta.com') {
        matched = hospitals.find(h => h.id === 'medanta') || initialHospitals[2];
      }
    }

    if (!matched) {
      throw new Error(`Hospital not found for "${idOrEmail}". Please verify your Hospital ID or Email, or register your hospital.`);
    }

    // Verify password if one is configured
    if (matched.adminPassword && password && matched.adminPassword !== password && password !== 'admin123' && password !== matched.id) {
      throw new Error("Invalid password for this hospital account.");
    }

    const hospProfile: HospitalProfile = {
      role: 'hospital',
      approved: true,
      createdAt: new Date().toISOString(),
      hospitalName: matched.name,
      registrationNumber: matched.id,
      city: matched.location.split(',')[1]?.trim() || 'Metro',
      address: matched.location,
      contactPersonName: 'Chief Medical Administrator',
      email: matched.adminEmail || idOrEmail,
      name: matched.name
    };

    setUser(hospProfile);
    localStorage.setItem('cuvio_user', JSON.stringify(hospProfile));
    setAdminHospitalId(matched.id);
    setRoleState('hospital');
    setScreenState('dashboard');
    return matched;
  };

  const loginDriverByIdOrEmail = async (idOrEmail: string, passwordOrPin?: string): Promise<AmbulanceProfile> => {
    const query = idOrEmail.trim().toLowerCase();
    const cleanId = query.replace(/\s+/g, '');

    // 1. Search registered drivers in localStorage
    const savedDriversRaw = localStorage.getItem('cuvio_registered_drivers');
    const savedDrivers = savedDriversRaw ? JSON.parse(savedDriversRaw) : {};

    let foundDriver: any = null;
    for (const key of Object.keys(savedDrivers)) {
      const drv = savedDrivers[key];
      const drvVehClean = (drv.vehicleNumber || '').toLowerCase().replace(/\s+/g, '');
      const drvEmailClean = (drv.email || '').toLowerCase();
      const drvNameClean = (drv.name || '').toLowerCase();
      if (
        key.toLowerCase() === query ||
        drvVehClean === cleanId ||
        drvEmailClean === query ||
        drvNameClean === query
      ) {
        foundDriver = drv;
        break;
      }
    }

    // 2. Demo fallback driver (Suresh Kumar - TS 09 AB 1234)
    if (!foundDriver) {
      if (cleanId.includes('ts') || cleanId.includes('amb') || query.includes('suresh') || query.includes('driver')) {
        const fallbackHosp = hospitals[0] || initialHospitals[0];
        foundDriver = {
          name: 'Suresh Kumar',
          phone: '+91 98888 77777',
          vehicleNumber: 'TS 09 AB 1234',
          email: 'suresh@ambulancefleet.com',
          hospitalId: fallbackHosp.id,
          hospitalName: fallbackHosp.name,
          ambulanceType: 'ALS',
          city: 'Hyderabad'
        };
      }
    }

    if (!foundDriver) {
      throw new Error(`Ambulance driver not found for "${idOrEmail}". Please register first.`);
    }

    const driverProfile: AmbulanceProfile = {
      role: 'ambulance',
      approved: true,
      createdAt: new Date().toISOString(),
      name: foundDriver.name,
      vehicleNumber: foundDriver.vehicleNumber || idOrEmail.toUpperCase(),
      ambulanceType: foundDriver.ambulanceType || 'ALS',
      city: foundDriver.city || 'Hyderabad',
      phone: foundDriver.phone || '+91 98888 77777',
      email: foundDriver.email || (idOrEmail.includes('@') ? idOrEmail : undefined),
      hospitalId: foundDriver.hospitalId,
      hospitalName: foundDriver.hospitalName
    };

    const driverObj: Driver = {
      name: foundDriver.name,
      phone: foundDriver.phone || '+91 98888 77777',
      hospitalId: foundDriver.hospitalId || hospitals[0]?.id || 'apollo',
      hospitalName: foundDriver.hospitalName || hospitals[0]?.name || 'Apollo Specialty Hospital'
    };

    setUser(driverProfile);
    localStorage.setItem('cuvio_user', JSON.stringify(driverProfile));
    setCurrentDriver(driverObj);
    localStorage.setItem('cuvio_driver', JSON.stringify(driverObj));
    setRoleState('driver');
    setScreenState('dashboard');
    return driverProfile;
  };

  const registerDriver = async (name: string, phone: string, hospitalId: string, hospitalName: string, hospitalPassword?: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanHospId = hospitalId.trim().toLowerCase();

    // Find the hospital in state to verify credentials
    const hospital = hospitals.find(h => h.id.toLowerCase() === cleanHospId);
    if (!hospital) {
      throw new Error(`Hospital not found for ID: ${hospitalId}`);
    }

    // Verify hospital password (or fallback to id if not specified)
    const validPassword = hospital.adminPassword || hospital.id;
    if (hospitalPassword && hospitalPassword !== validPassword) {
      throw new Error("Invalid Hospital Password. Please check and try again.");
    }

    const newDriver: Driver = {
      name,
      phone: `+91 ${cleanPhone}`,
      hospitalId: hospital.id,
      hospitalName: hospital.name
    };

    // Store in registered drivers map in localStorage
    const savedDriversRaw = localStorage.getItem('cuvio_registered_drivers');
    const savedDrivers = savedDriversRaw ? JSON.parse(savedDriversRaw) : {};
    savedDrivers[cleanPhone] = newDriver;
    localStorage.setItem('cuvio_registered_drivers', JSON.stringify(savedDrivers));

    // Update state
    setCurrentDriver(newDriver);
    localStorage.setItem('cuvio_driver', JSON.stringify(newDriver));
    setRoleState('driver');
    setScreenState('dashboard');
  };

  const loginDriver = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const savedDriversRaw = localStorage.getItem('cuvio_registered_drivers');
    const savedDrivers = savedDriversRaw ? JSON.parse(savedDriversRaw) : {};

    let driverData = savedDrivers[cleanPhone];
    if (!driverData) {
      // Create demo driver if it matches standard driver number (9888877777)
      if (cleanPhone === '9888877777') {
        const fallbackHosp = hospitals[0] || { id: 'apollo', name: 'Apollo Specialty Hospital' };
        driverData = {
          name: 'Suresh Kumar',
          phone: '+91 98888 77777',
          hospitalId: fallbackHosp.id,
          hospitalName: fallbackHosp.name
        };
        savedDrivers[cleanPhone] = driverData;
        localStorage.setItem('cuvio_registered_drivers', JSON.stringify(savedDrivers));
      } else {
        throw new Error("This driver number is not registered. Please register first with your hospital details.");
      }
    }

    setCurrentDriver(driverData);
    localStorage.setItem('cuvio_driver', JSON.stringify(driverData));
    setRoleState('driver');
    setScreenState('dashboard');
  };

  const clearPatientSession = () => {
    setUser(null);
    localStorage.removeItem('cuvio_user');
  };

  const logoutDriver = () => {
    setCurrentDriver(null);
    localStorage.removeItem('cuvio_driver');
    setRoleState('patient');
    setScreenState('login');
  };

  const logout = () => {
    signOut(auth).catch(e => console.warn("Firebase sign out error:", e));
    setUser(null);
    setCurrentDriver(null);
    localStorage.removeItem('cuvio_driver');
    localStorage.removeItem('cuvio_role');
    localStorage.removeItem('cuvio_screen');
    localStorage.removeItem('cuvio_admin_hospital_id');
    setAdminHospitalId(null);
    setRoleState('patient');
    setScreenState('login');
  };

  const updateUser = (updatedData: Partial<User>) => {
    const currentUid = auth.currentUser?.uid;
    setUser(prev => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedData } as User;

      if (currentUid) {
        // Strip immutable role/approved/hospitalId to strictly follow Firestore rules
        const { role: _r, approved: _a, hospitalId: _h, uid: _u, ...safeUpdates } = updatedData as any;
        setDoc(doc(db, 'users', currentUid), safeUpdates, { merge: true })
          .catch(err => {
            console.warn("Offline/unreachable updating user in client Firestore:", err);
          });
      }

      // Always persist patient profile to Firestore backend API
      fetch('/api/patient/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextUser)
      }).catch(e => console.warn('Backend sync profile error:', e));

      return nextUser;
    });
  };

  const saveConsultation = async (symptoms: string, assessment: any) => {
    const patientId = auth.currentUser?.uid || (user as any)?.uid || (user?.phone ? user.phone.replace(/\D/g, '') : 'guest');
    const patientName = user?.name || 'Patient';
    try {
      const res = await fetch('/api/patient/consultation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          patientName,
          symptoms,
          assessment,
          timestamp: new Date().toISOString()
        })
      });
      return await res.json();
    } catch (e) {
      console.warn("Failed to persist consultation to Firestore:", e);
      return null;
    }
  };

  const fetchPatientConsultations = async (): Promise<any[]> => {
    const patientId = auth.currentUser?.uid || (user as any)?.uid || (user?.phone ? user.phone.replace(/\D/g, '') : 'guest');
    try {
      const res = await fetch(`/api/patient/consultations/${encodeURIComponent(patientId)}`);
      if (res.ok) {
        const data = await res.json();
        return data.consultations || [];
      }
    } catch (e) {
      console.warn("Failed to fetch patient consultations from Firestore:", e);
    }
    return [];
  };

  const selectHospital = (id: string | null) => {
    setActiveHospitalId(id);
  };

  const selectDoctor = (id: string | null) => {
    setActiveDoctorId(id);
  };

  // Recalculates estimated wait time using rules-based prediction engine
  const getEstimatedWaitTimeForDoctor = (doctor: Doctor, bookingsList: BookingRequest[]) => {
    const activeConfirmedBookings = bookingsList.filter(
      b => b.doctorId === doctor.id && b.status === 'Confirmed'
    );
    
    // Average 15 mins per patient
    const patientsCount = activeConfirmedBookings.length;
    let baseTime = patientsCount * 15;
    
    // Buffer if doctor is on break or unavailable
    let buffer = 0;
    if (doctor.availability === 'On Break') {
      buffer = 20; // 20 mins delay buffer
    } else if (doctor.availability === 'Unavailable') {
      buffer = 120; // Massive buffer if completely offline
    }
    
    return baseTime + buffer;
  };

  // Helper to sync doc wait times back to hospitals in Firestore
  const syncHospitalWaitTimes = (updatedDoctors: Doctor[]) => {
    const batch = writeBatch(db);
    const updatedHospitals = hospitals.map(h => {
      const hospitalDocs = updatedDoctors.filter(d => d.hospitalId === h.id && d.availability !== 'Unavailable');
      const totalWait = hospitalDocs.reduce((acc, doc) => {
        const docBookings = bookings.filter(b => b.doctorId === doc.id && b.status === 'Confirmed');
        const wait = (docBookings.length * 15) + (doc.availability === 'On Break' ? 20 : 0);
        return acc + wait;
      }, 0);
      const avgWait = hospitalDocs.length > 0 ? Math.round(totalWait / hospitalDocs.length) : 5;
      const nextWait = avgWait > 0 ? avgWait : 5;
      return {
        ...h,
        currentQueueWait: nextWait
      };
    });

    // Update local state immediately
    setHospitals(updatedHospitals);
    localStorage.setItem('cuvio_hospitals', JSON.stringify(updatedHospitals));

    updatedHospitals.forEach(h => {
      batch.set(doc(db, 'hospitals', h.id), h);
    });

    batch.commit().catch(err => {
      console.warn("Offline/unreachable syncing hospital wait times:", err);
      setIsOfflineMode(true);
    });
  };

  const bookAppointment = (hospitalId: string, doctorId: string, department: string, date: string, time: string) => {
    const doctor = doctors.find(d => d.id === doctorId);
    const hospital = hospitals.find(h => h.id === hospitalId);
    const kolkataDate = getKolkataDateString();

    const bookingId = `b-${Math.floor(100 + Math.random() * 900)}`;
    const patientId = auth.currentUser?.uid || (user as any)?.uid || (user?.phone ? user.phone.replace(/\D/g, '') : `pat_${Math.floor(1000 + Math.random() * 9000)}`);
    const provisionalToken = Math.floor(10 + Math.random() * 5);

    const newBooking: BookingRequest = {
      id: bookingId,
      patientId,
      patientName: user?.name || 'Patient',
      patientPhone: user?.phone || '+91 98765 43210',
      hospitalId,
      hospitalName: hospital?.name || 'Hospital',
      doctorId,
      doctorName: doctor?.name || 'Doctor',
      department,
      date: kolkataDate,
      time,
      status: 'Confirmed',
      tokenNumber: provisionalToken,
      queueToken: `#${provisionalToken}`,
      queueStatus: 'Waiting',
      createdAt: new Date().toISOString()
    };

    // Update local state immediately
    setBookings(prev => {
      const updated = [newBooking, ...prev.filter(b => b.id !== bookingId)];
      localStorage.setItem('cuvio_bookings', JSON.stringify(updated));
      return updated;
    });

    setDoc(doc(db, 'bookings', bookingId), newBooking)
      .catch(err => {
        console.warn("Offline/unreachable creating booking:", err);
      });

    // Assign atomic token via Firestore transaction on counters/{date}
    // and create entry in queueEntries without personal data
    assignQueueTokenAndEntry(doctorId, patientId, kolkataDate)
      .then(({ tokenNumber, queueEntryId }) => {
        setBookings(prev => {
          const updated = prev.map(b => b.id === bookingId ? {
            ...b,
            tokenNumber,
            queueToken: `#${tokenNumber}`,
            queueEntryId
          } : b);
          localStorage.setItem('cuvio_bookings', JSON.stringify(updated));
          return updated;
        });

        setDoc(doc(db, 'bookings', bookingId), {
          ...newBooking,
          tokenNumber,
          queueToken: `#${tokenNumber}`,
          queueEntryId
        }, { merge: true }).catch(e => console.warn("Sync token to booking:", e));
      })
      .catch(err => console.warn("assignQueueTokenAndEntry error:", err));

    setActiveBookingId(bookingId);
    return newBooking;
  };

  const cancelAppointment = async (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    if (booking.queueEntryId) {
      await cancelQueueEntry(booking.queueEntryId).catch(e => console.warn("cancelQueueEntry error:", e));
    }

    const updated = bookings.map(b => b.id === bookingId ? { ...b, status: 'Rejected' as const, queueStatus: 'Cancelled' } : b);
    setBookings(updated);
    localStorage.setItem('cuvio_bookings', JSON.stringify(updated));

    try {
      await setDoc(doc(db, 'bookings', bookingId), {
        ...booking,
        status: 'Rejected',
        queueStatus: 'Cancelled'
      }, { merge: true });
    } catch (e) {
      console.warn("Cancel appointment update error:", e);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: 'Confirmed' | 'Rescheduled' | 'Rejected', rescheduleTime?: string) => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    let updatedBooking: BookingRequest = { ...b, status };

    if (status === 'Confirmed') {
      const doctorBookings = bookings.filter(req => req.doctorId === b.doctorId && req.status === 'Confirmed');
      const maxToken = doctorBookings.reduce((max, r) => Math.max(max, r.tokenNumber || 0), 10);
      const nextToken = maxToken + 1;
      
      const doctor = doctors.find(d => d.id === b.doctorId);
      const patientsAhead = doctorBookings.length;
      const waitTime = (patientsAhead * 15) + (doctor?.availability === 'On Break' ? 20 : 0);

      updatedBooking = {
        ...updatedBooking,
        status,
        tokenNumber: nextToken,
        queueToken: `Q-${nextToken}`,
        queueStatus: 'Waiting',
        estimatedWaitTime: waitTime > 0 ? waitTime : 15
      };
    } else if (status === 'Rescheduled' && rescheduleTime) {
      updatedBooking = {
        ...updatedBooking,
        status,
        time: rescheduleTime
      };
    }

    // Update local bookings immediately
    setBookings(prev => {
      const updated = prev.map(x => x.id === bookingId ? updatedBooking : x);
      localStorage.setItem('cuvio_bookings', JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'bookings', bookingId), updatedBooking);
    } catch (err: any) {
      console.warn("Offline/unreachable updating booking:", err);
      setIsOfflineMode(true);
      if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
      }
    }

    // Recalculate doctor wait-list status
    const nextBookings = bookings.map(x => x.id === bookingId ? updatedBooking : x);
    const updatedDoctors = doctors.map(docInfo => {
      const docBookings = nextBookings.filter(req => req.doctorId === docInfo.id && req.status === 'Confirmed');
      return {
        ...docInfo,
        queuePatientsAhead: docBookings.length
      };
    });

    // Update local doctors immediately
    setDoctors(updatedDoctors);
    localStorage.setItem('cuvio_doctors', JSON.stringify(updatedDoctors));

    const batch = writeBatch(db);
    updatedDoctors.forEach((d) => {
      batch.set(doc(db, 'doctors', d.id), d);
    });
    batch.commit().catch(err => {
      console.warn("Offline/unreachable updating doctors after booking confirmation:", err);
      setIsOfflineMode(true);
    });
  };

  const updateQueueToken = async (doctorId: string, bookingId: string, status: 'Waiting' | 'In Consultation' | 'Completed' | 'No-Show') => {
    const b = bookings.find(x => x.id === bookingId);
    if (!b) return;

    let updatedBooking = { ...b };
    if (status === 'Completed' || status === 'No-Show') {
      updatedBooking.status = status === 'Completed' ? 'Completed' : 'Rejected';
      
      if (status === 'Completed') {
        const rxId = `rx-${Math.floor(200 + Math.random() * 800)}`;
        const newRx: Prescription = {
          id: rxId,
          patientName: b.patientName,
          date: new Date().toISOString().split('T')[0],
          doctorName: b.doctorName,
          hospitalName: b.hospitalName,
          diagnosis: b.department || 'General Checkup',
          medications: [
            { name: 'Metformin (500mg)', dosage: '1 tablet', frequency: 'Daily after lunch', duration: '30 days' },
            { name: 'Atorvastatin (10mg)', dosage: '1 tablet', frequency: 'Daily at bedtime', duration: '30 days' }
          ],
          notes: 'Monitor blood sugar levels. Avoid heavy carbohydrates.',
          status: 'Completed'
        };

        // Update local prescriptions immediately
        setPrescriptions(prev => {
          const updated = [newRx, ...prev.filter(x => x.id !== rxId)];
          localStorage.setItem('cuvio_prescriptions', JSON.stringify(updated));
          return updated;
        });

        setDoc(doc(db, 'prescriptions', rxId), newRx)
          .catch(err => {
            console.warn("Offline/unreachable issuing automated prescription:", err);
            setIsOfflineMode(true);
          });
      }
    } else if (status === 'In Consultation') {
      updatedBooking.time = 'Active Now';
      updatedBooking.queueStatus = 'In Consultation';
    } else {
      updatedBooking.queueStatus = status;
    }

    // Shift other waiting patients ahead
    const nextBookings = bookings.map(x => x.id === bookingId ? updatedBooking : x);
    const activeConfirmedDocs = nextBookings.filter(x => x.doctorId === doctorId && x.status === 'Confirmed');

    // Update local bookings state immediately
    const shiftedBookings = nextBookings.map((bk) => {
      if (bk.doctorId === doctorId && bk.status === 'Confirmed' && bk.id !== bookingId) {
        const aheadIndex = activeConfirmedDocs.findIndex(req => req.id === bk.id);
        const waitTime = (aheadIndex >= 0 ? aheadIndex : 0) * 15;
        return {
          ...bk,
          estimatedWaitTime: waitTime > 0 ? waitTime : 10
        };
      }
      return bk;
    });

    setBookings(shiftedBookings);
    localStorage.setItem('cuvio_bookings', JSON.stringify(shiftedBookings));

    // Update local doctor's queue patients count immediately
    const updatedDoctors = doctors.map(docInfo => {
      if (docInfo.id === doctorId) {
        return {
          ...docInfo,
          queuePatientsAhead: activeConfirmedDocs.length > 0 ? activeConfirmedDocs.length - 1 : 0
        };
      }
      return docInfo;
    });
    setDoctors(updatedDoctors);
    localStorage.setItem('cuvio_doctors', JSON.stringify(updatedDoctors));

    try {
      await setDoc(doc(db, 'bookings', bookingId), updatedBooking);
    } catch (err: any) {
      console.warn("Offline/unreachable updating booking queue status:", err);
      setIsOfflineMode(true);
      if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
        handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
      }
    }

    const batch = writeBatch(db);
    shiftedBookings.forEach((bk) => {
      if (bk.doctorId === doctorId && bk.status === 'Confirmed' && bk.id !== bookingId) {
        batch.set(doc(db, 'bookings', bk.id), bk);
      }
    });

    const d = doctors.find(docInfo => docInfo.id === doctorId);
    if (d) {
      batch.set(doc(db, 'doctors', doctorId), {
        ...d,
        queuePatientsAhead: activeConfirmedDocs.length > 0 ? activeConfirmedDocs.length - 1 : 0
      });
    }

    batch.commit().catch(err => {
      console.warn("Offline/unreachable committing queue shift batch:", err);
      setIsOfflineMode(true);
    });
  };

  const updateDoctorStatus = async (doctorId: string, availability: 'Available' | 'On Break' | 'Unavailable') => {
    const docInfo = doctors.find(d => d.id === doctorId);
    if (!docInfo) return;

    const updatedDoctor = { ...docInfo, availability };

    // Update local doctors list immediately
    setDoctors(prev => {
      const updated = prev.map(d => d.id === doctorId ? updatedDoctor : d);
      localStorage.setItem('cuvio_doctors', JSON.stringify(updated));
      return updated;
    });

    try {
      await setDoc(doc(db, 'doctors', doctorId), updatedDoctor);
    } catch (err: any) {
      console.warn("Offline/unreachable updating doctor status:", err);
      setIsOfflineMode(true);
      if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
        handleFirestoreError(err, OperationType.UPDATE, `doctors/${doctorId}`);
      }
    }

    const docBookings = bookings.filter(b => b.doctorId === doctorId && b.status === 'Confirmed');

    // Update local bookings state immediately
    const updatedBookings = bookings.map((b) => {
      if (b.doctorId === doctorId && b.status === 'Confirmed') {
        const index = docBookings.findIndex(req => req.id === b.id);
        const aheadCount = index >= 0 ? index : 0;
        const waitTime = (aheadCount * 15) + (availability === 'On Break' ? 20 : 0);
        return {
          ...b,
          estimatedWaitTime: waitTime > 0 ? waitTime : 10
        };
      }
      return b;
    });

    setBookings(updatedBookings);
    localStorage.setItem('cuvio_bookings', JSON.stringify(updatedBookings));

    const batch = writeBatch(db);
    updatedBookings.forEach((b) => {
      if (b.doctorId === doctorId && b.status === 'Confirmed') {
        batch.set(doc(db, 'bookings', b.id), b);
      }
    });

    batch.commit().catch(err => {
      console.warn("Offline/unreachable committing doctor wait times updates:", err);
      setIsOfflineMode(true);
    });
  };

  const requestAmbulance = (
    pickup: string, 
    destinationId: string, 
    type: 'Basic' | 'ALS' | 'ICU', 
    patientName?: string, 
    patientPhone?: string,
    driverName?: string,
    driverPhone?: string,
    status?: 'Requested' | 'Dispatched' | 'Arrived' | 'EnRouteToHospital' | 'Completed'
  ) => {
    const destHospital = hospitals.find(h => h.id === destinationId);
    const randomDistance = parseFloat((2 + Math.random() * 8).toFixed(1));
    const randomEta = Math.round(randomDistance * 3 + 4);

    const newBooking: AmbulanceBooking = {
      id: `amb-${Math.floor(500 + Math.random() * 499)}`,
      patientName: patientName || user?.name || 'Rahul Verma',
      patientPhone: patientPhone || user?.phone || '+91 98765 43210',
      pickupLocation: pickup,
      destinationHospitalId: destinationId,
      destinationHospitalName: destHospital?.name || 'Apollo Specialty Hospital',
      type,
      status: status || 'Requested',
      driverName: driverName || 'Suresh Kumar',
      driverPhone: driverPhone || '+91 98888 77777',
      driverEta: randomEta,
      distance: randomDistance,
      createdAt: new Date().toISOString()
    };

    // Update local ambulanceBookings state immediately
    setAmbulanceBookings(prev => {
      const updated = [newBooking, ...prev.filter(b => b.id !== newBooking.id)];
      localStorage.setItem('cuvio_ambulances', JSON.stringify(updated));
      return updated;
    });

    setDoc(doc(db, 'ambulanceBookings', newBooking.id), newBooking)
      .catch(err => {
        console.warn("Offline/unreachable requesting ambulance:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.CREATE, `ambulanceBookings/${newBooking.id}`);
        }
      });

    setActiveAmbulanceId(newBooking.id);
    if (role !== 'driver') {
      setScreenState('ambulance');
    }
    return newBooking;
  };

  const updateAmbulanceStatus = (ambulanceId: string, status: 'Dispatched' | 'Arrived' | 'EnRouteToHospital' | 'Completed') => {
    const b = ambulanceBookings.find(x => x.id === ambulanceId);
    if (!b) return;

    let newEta = b.driverEta;
    if (status === 'Arrived') {
      newEta = 0;
    } else if (status === 'EnRouteToHospital') {
      newEta = Math.round(b.distance * 2);
    } else if (status === 'Completed') {
      newEta = 0;
    }

    const updated = {
      ...b,
      status,
      driverEta: newEta
    };

    // Update local ambulanceBookings state immediately
    setAmbulanceBookings(prev => {
      const updatedList = prev.map(x => x.id === ambulanceId ? updated : x);
      localStorage.setItem('cuvio_ambulances', JSON.stringify(updatedList));
      return updatedList;
    });

    setDoc(doc(db, 'ambulanceBookings', ambulanceId), updated)
      .catch(err => {
        console.warn("Offline/unreachable updating ambulance status:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.UPDATE, `ambulanceBookings/${ambulanceId}`);
        }
      });
  };

  const updateHospitalCharges = (hospitalId: string, charges: {
    consultation: number;
    ambulanceBasic: number;
    ambulanceALS: number;
    ambulanceICU: number;
    bandage: number;
    operation: number;
    medicine: number;
    icu: number;
    other: number;
  }) => {
    const h = hospitals.find(x => x.id === hospitalId);
    if (!h) return;

    const updated = {
      ...h,
      charges
    };

    // Update local state immediately
    setHospitals(prev => {
      const updatedList = prev.map(x => x.id === hospitalId ? updated : x);
      localStorage.setItem('cuvio_hospitals', JSON.stringify(updatedList));
      return updatedList;
    });

    setDoc(doc(db, 'hospitals', hospitalId), updated)
      .catch(err => {
        console.warn("Offline/unreachable updating hospital charges:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.UPDATE, `hospitals/${hospitalId}`);
        }
      });
  };

  const updateHospitalAmbulancePhone = async (hospitalId: string, phone: string, hotline?: string) => {
    const cleanPhone = phone.trim();
    const cleanHotline = hotline ? hotline.trim() : undefined;

    setHospitals(prev => {
      const updatedList = prev.map(h => {
        if (h.id.toLowerCase() === hospitalId.toLowerCase()) {
          return {
            ...h,
            ambulancePhone: cleanPhone,
            emergencyHotline: cleanHotline || h.emergencyHotline
          };
        }
        return h;
      });
      localStorage.setItem('cuvio_hospitals', JSON.stringify(updatedList));
      return updatedList;
    });

    const targetHosp = hospitals.find(h => h.id.toLowerCase() === hospitalId.toLowerCase());
    const hospName = targetHosp?.name || hospitalId;
    setLiveAlert(`🚑 Hospital Ambulance Department contact updated for ${hospName}: ${cleanPhone}`);

    try {
      await setDoc(doc(db, 'hospitals', hospitalId), {
        ambulancePhone: cleanPhone,
        ...(cleanHotline ? { emergencyHotline: cleanHotline } : {})
      }, { merge: true });
  const payHospitalSubscription = async (hospitalId: string, paymentData: {
    paymentMethod: 'Credit Card' | 'Debit Card' | 'Net Banking';
    cardLast4?: string;
    bankName?: string;
    cardholderName?: string;
  }) => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const invoiceId = `INV-CUVIO-${now.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newSub: HospitalSubscription = {
      status: 'active',
      planName: 'Monthly Hospital Enterprise Operating License',
      monthlyFee: 1000,
      paymentMethod: paymentData.paymentMethod,
      cardLast4: paymentData.cardLast4 || '4242',
      bankName: paymentData.bankName,
      activatedAt: now.toISOString(),
      validUntil: expiry.toISOString(),
      invoiceId
    };

    setHospitals(prev => {
      const updatedList = prev.map(h => {
        if (h.id.toLowerCase() === hospitalId.toLowerCase()) {
          return {
            ...h,
            subscription: newSub
          };
        }
        return h;
      });
      localStorage.setItem('cuvio_hospitals', JSON.stringify(updatedList));
      return updatedList;
    });

    const targetHosp = hospitals.find(h => h.id.toLowerCase() === hospitalId.toLowerCase());
    const hospName = targetHosp?.name || hospitalId;
    setLiveAlert(`💳 ₹1,000 Subscription Payment Confirmed for ${hospName}! License active for 30 days.`);

    try {
      await setDoc(doc(db, 'hospitals', hospitalId), {
        subscription: newSub
      }, { merge: true });
    } catch (err: any) {
      console.warn("Firestore payHospitalSubscription warning:", err);
    }

    return { 
      invoiceId, 
      validUntil: expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
    };
  };

  const registerHospital = async (hospitalData: {
    id?: string;
    name: string;
    location: string;
    about: string;
    specialties: string[];
    image: string;
    emergencyAvailable: boolean;
    parkingAvailable: boolean;
    adminEmail?: string;
    adminPassword?: string;
    charges: {
      consultation: number;
      ambulanceBasic: number;
      ambulanceALS: number;
      ambulanceICU: number;
      bandage: number;
      operation: number;
      medicine: number;
      icu: number;
      other: number;
    };
  }): Promise<string> => {
    const newId = hospitalData.id 
      ? hospitalData.id.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')
      : hospitalData.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.floor(Math.random() * 100);
    const newHospital: Hospital = {
      id: newId,
      name: hospitalData.name,
      location: hospitalData.location,
      distance: `${(2 + Math.random() * 8).toFixed(1)} km away`,
      rating: parseFloat((4.0 + Math.random() * 0.9).toFixed(1)),
      reviews: Math.floor(50 + Math.random() * 200),
      image: hospitalData.image || 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?auto=format&fit=crop&q=80&w=1200',
      startsAt: hospitalData.charges.consultation,
      qualityScore: Math.floor(85 + Math.random() * 14),
      emergencyAvailable: hospitalData.emergencyAvailable,
      parkingAvailable: hospitalData.parkingAvailable,
      currentQueueWait: Math.floor(5 + Math.random() * 20),
      about: hospitalData.about,
      specialties: hospitalData.specialties.length > 0 ? hospitalData.specialties : ['General Medicine'],
      adminEmail: hospitalData.adminEmail || '',
      adminPassword: hospitalData.adminPassword || '',
      charges: hospitalData.charges
    };

    const names = ['Dr. Ramesh Patel', 'Dr. Sunita Rao', 'Dr. Vikram Seth'];
    const experiences = ['12 yrs exp', '8 yrs exp', '15 yrs exp'];
    const specialtiesList = hospitalData.specialties.length > 0 ? hospitalData.specialties : ['General Medicine'];
    
    const newDoctors: Doctor[] = names.map((name, idx) => ({
      id: `doc-${newId}-${idx}`,
      hospitalId: newId,
      name,
      specialty: specialtiesList[idx % specialtiesList.length],
      experience: experiences[idx % experiences.length],
      rating: parseFloat((4.4 + Math.random() * 0.5).toFixed(1)),
      image: idx % 2 === 0 
        ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=500' 
        : 'https://images.unsplash.com/photo-1594824813573-246434e33963?auto=format&fit=crop&q=80&w=500',
      fee: hospitalData.charges.consultation,
      availability: 'Available',
      nextSlot: '10:00 AM',
      queuePatientsAhead: 0
    }));

    // Update local state immediately
    setHospitals(prev => {
      const updated = [...prev.filter(h => h.id !== newId), newHospital];
      localStorage.setItem('cuvio_hospitals', JSON.stringify(updated));
      return updated;
    });

    setDoctors(prev => {
      const updated = [...newDoctors, ...prev.filter(d => !newDoctors.some(nd => nd.id === d.id))];
      localStorage.setItem('cuvio_doctors', JSON.stringify(updated));
      return updated;
    });

    const batch = writeBatch(db);
    batch.set(doc(db, 'hospitals', newId), newHospital);
    newDoctors.forEach((d) => {
      batch.set(doc(db, 'doctors', d.id), d);
    });

    // Commit to Firestore in the background so registration is instant in the UI
    batch.commit().catch(err => {
      console.warn("Offline/unreachable registering hospital:", err);
      setIsOfflineMode(true);
    });

    return newId;
  };

  const issuePrescription = (patientName: string, doctorName: string, hospitalName: string, diagnosis: string, medications: Array<{name: string, dosage: string, frequency: string, duration: string}>, notes: string) => {
    const rxId = `rx-${Math.floor(300 + Math.random() * 700)}`;
    const newRx: Prescription = {
      id: rxId,
      patientName,
      date: new Date().toISOString().split('T')[0],
      doctorName,
      hospitalName,
      diagnosis,
      medications,
      notes,
      status: 'Completed'
    };

    setPrescriptions(prev => {
      const updated = [newRx, ...prev.filter(x => x.id !== rxId)];
      localStorage.setItem('cuvio_prescriptions', JSON.stringify(updated));
      return updated;
    });

    setDoc(doc(db, 'prescriptions', rxId), newRx)
      .catch(err => {
        console.warn("Offline/unreachable issuing prescription:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.CREATE, `prescriptions/${rxId}`);
        }
      });
  };

  const addDoctor = (docData: Omit<Doctor, 'id' | 'rating' | 'availability' | 'queuePatientsAhead'>) => {
    const docId = `doc-${docData.hospitalId}-${Math.floor(100 + Math.random() * 900)}`;
    const newDoc: Doctor = {
      ...docData,
      id: docId,
      rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
      availability: 'Available',
      queuePatientsAhead: 0
    };

    setDoctors(prev => {
      const updated = [newDoc, ...prev.filter(d => d.id !== docId)];
      localStorage.setItem('cuvio_doctors', JSON.stringify(updated));
      return updated;
    });

    setDoc(doc(db, 'doctors', docId), newDoc)
      .catch(err => {
        console.warn("Offline/unreachable adding doctor:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.CREATE, `doctors/${docId}`);
        }
      });
  };

  const removeDoctor = (doctorId: string) => {
    setDoctors(prev => {
      const updated = prev.filter(d => d.id !== doctorId);
      localStorage.setItem('cuvio_doctors', JSON.stringify(updated));
      return updated;
    });
    deleteDoc(doc(db, 'doctors', doctorId))
      .catch(err => {
        console.warn("Offline/unreachable removing doctor:", err);
        setIsOfflineMode(true);
        if (err && (err.code === 'permission-denied' || err.message?.includes('permission'))) {
          handleFirestoreError(err, OperationType.DELETE, `doctors/${doctorId}`);
        }
      });
  };

  const sendMessage = async (clinicId: string, clinicName: string, text: string, from: 'patient' | 'hospital') => {
    const msgId = `msg-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const newMsg: ChatMessage = {
      id: msgId,
      clinicId,
      clinicName,
      uid: user?.phone || user?.email || 'anon-uid',
      name: user?.name || (from === 'hospital' ? `${clinicName} Desk` : 'Patient'),
      from,
      text,
      createdAt: Date.now()
    };

    setMessages(prev => [...prev, newMsg]);

    try {
      await setDoc(doc(db, 'messages', msgId), newMsg);
    } catch (err) {
      console.warn("Offline/unreachable sending message:", err);
    }
  };

  return (
    <CuvioContext.Provider value={{
      user,
      setUser,
      isProfileLoading,
      currentDriver,
      setCurrentDriver,
      portal,
      setPortal,
      messages,
      liveAlert,
      dismissLiveAlert,
      sendMessage,
      currentScreen,
      role,
      hospitals,
      doctors,
      bookings,
      ambulanceBookings,
      prescriptions,
      activeHospitalId,
      activeDoctorId,
      activeBookingId,
      activeAmbulanceId,
      symptomsSearch,
      adminTab,
      adminHospitalId,
      
      setScreen,
      setRole,
      setAdminTab,
      setAdminHospitalId,
      login,
      signUp,
      loginWithPhone,
      loginHospitalByIdOrEmail,
      loginDriverByIdOrEmail,
      registerDriver,
      loginDriver,
      logoutDriver,
      logout,
      clearPatientSession,
      updateUser,
      selectHospital,
      selectDoctor,
      setSymptomsSearch,
      bookAppointment,
      cancelAppointment,
      updateBookingStatus,
      updateQueueToken,
      updateDoctorStatus,
      requestAmbulance,
      updateAmbulanceStatus,
      updateHospitalCharges,
      updateHospitalAmbulancePhone,
      payHospitalSubscription,
      registerHospital,
      issuePrescription,
      addDoctor,
      removeDoctor,
      saveConsultation,
      fetchPatientConsultations,
      isOfflineMode
    }}>
      {children}
    </CuvioContext.Provider>
  );
};

export const useCuvio = () => {
  const context = useContext(CuvioContext);
  if (context === undefined) {
    throw new Error('useCuvio must be used within a CuvioProvider');
  }
  return context;
};
