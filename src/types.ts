export interface Hospital {
  id: string;
  name: string;
  location: string;
  distance: string;
  rating: number;
  reviews: number;
  image: string;
  startsAt: number;
  qualityScore: number;
  emergencyAvailable: boolean;
  parkingAvailable: boolean;
  currentQueueWait: number; // in minutes
  about: string;
  specialties: string[];
  adminEmail?: string;
  adminPassword?: string;
  charges?: {
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
}

export interface Doctor {
  id: string;
  hospitalId: string;
  name: string;
  specialty: string;
  experience: string;
  rating: number;
  image: string;
  fee: number;
  availability: 'Available' | 'On Break' | 'Unavailable';
  nextSlot: string;
  queuePatientsAhead: number;
}

export interface BookingRequest {
  id: string;
  patientId?: string;
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  status: 'Pending' | 'Confirmed' | 'Rescheduled' | 'Rejected' | 'Completed';
  tokenNumber?: number;
  estimatedWaitTime?: number; // in minutes
  queueToken?: string;
  queueStatus?: string;
  queueEntryId?: string;
  createdAt?: string;
}

export type QueueEntryStatus = 'waiting' | 'in_consultation' | 'completed' | 'cancelled' | 'skipped';

export interface QueueEntry {
  id: string;
  patientId: string;
  doctorId: string;
  date: string; // YYYY-MM-DD in Asia/Kolkata
  tokenNumber: number;
  status: QueueEntryStatus;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface AmbulanceBooking {
  id: string;
  patientName: string;
  patientPhone: string;
  pickupLocation: string;
  destinationHospitalId: string;
  destinationHospitalName: string;
  type: 'Basic' | 'ALS' | 'ICU';
  status: 'Requested' | 'Dispatched' | 'Arrived' | 'EnRouteToHospital' | 'Completed';
  driverName: string;
  driverPhone: string;
  driverEta: number; // in minutes
  distance: number; // in km
  createdAt?: string;
}

export interface Prescription {
  id: string;
  patientName: string;
  date: string;
  doctorName: string;
  hospitalName: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  notes: string;
  status?: 'Completed' | 'Pending';
}

export type UserRole = 'patient' | 'hospital' | 'ambulance';

export interface BaseUserProfile {
  uid?: string;
  phone?: string;
  email?: string;
  role: UserRole;
  approved: boolean;
  createdAt: string;
}

export interface PatientProfile extends BaseUserProfile {
  role: 'patient';
  name: string;
  age: number | string;
  gender: string;
  insuranceProvider?: string;
  sumInsuredRange?: string;
  dob?: string;
  medicalHistory?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  reminder24hEnabled?: boolean;
  reminder1hEnabled?: boolean;
  reminder15mEnabled?: boolean;
  reminderInAppEnabled?: boolean;
}

export interface HospitalProfile extends BaseUserProfile {
  role: 'hospital';
  hospitalName: string;
  registrationNumber: string;
  city: string;
  address: string;
  contactPersonName: string;
  name?: string;
  email?: string;
  password?: string;
}

export interface AmbulanceProfile extends BaseUserProfile {
  role: 'ambulance';
  name: string;
  vehicleNumber: string;
  ambulanceType: string;
  city: string;
  email?: string;
  password?: string;
  hospitalId?: string;
  hospitalName?: string;
}

export type User = PatientProfile | HospitalProfile | AmbulanceProfile;

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'reminder' | 'booking' | 'system';
  bookingId?: string;
}

export interface Driver {
  name: string;
  phone: string;
  hospitalId: string;
  hospitalName: string;
}

