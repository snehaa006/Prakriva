// types/doctor.ts
export interface Doctor {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  
  // Professional Information
  ayurvedicCertification?: string;
  ayurvedicSpecialization?: string[];
  clinicName?: string;
  clinicAddress?: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  licenseVerified: boolean;
  
  // Verification & Status
  verificationStatus: 'verified' | 'pending' | 'unverified';
  isActive: boolean;
  verificationPriority: number;
  
  // Consultation Information
  consultationFee?: string;
  consultationModes?: string[];
  languages?: string[];
  workingHours?: string;
  
  // Statistics
  rating?: number;
  totalConsultations: number;
  totalReviews: number;
  pendingRequests: number; // Added this property
  
  // Profile Information
  bio?: string;
  education?: string[];
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface Patient {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  emergencyContact?: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  assessmentData?: any; 
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationRequest {
  id: string;
  // Patient Information
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string; // Added optional field
  
  // Doctor Information
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  
  // Request Details
  requestType: 'consultation' | 'dietitian' | 'general';
  urgency: 'low' | 'medium' | 'high';
  message?: string; // Added optional field
  preferredConsultationMode?: string; // Added optional field
  
  // Status & Timing
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requestedAt: string;
  statusUpdatedAt?: string;
  
  // Notification Flags
  patientNotified?: boolean;
  doctorNotified?: boolean;
  
  // Additional Data
  fullPatientProfile?: any; // Added for storing complete patient profile
}

export interface CreateConsultationRequest {
  doctorId: string;
  requestType: 'consultation' | 'dietitian' | 'general';
  urgency: 'low' | 'medium' | 'high';
  message?: string;
  preferredConsultationMode?: string;
}

// Assessment Data Interface
export interface AssessmentData {
  // Personal Information
  name: string;
  dob: string;
  gender: string;
  location: string;

  // Lifestyle & Habits
  dailyRoutine: string;
  physicalActivity: string;
  sleepDuration: string;
  waterIntake: number;

  // Dietary Habits
  dietaryPreferences: string;
  cravings: string[];
  cravingsOther: string;
  digestionIssues: string[];

  // Health & Wellness
  currentConditions: string[];
  currentConditionsOther: string;
  familyHistory: string[];
  familyHistoryOther: string;
  medications: string;
  labReports: string;
  energyLevels: number;
  stressLevels: number;

  // Ayurvedic Constitutional Assessment
  bodyFrame: string;
  skinType: string;
  hairType: string;
  appetitePattern: string;
  personalityTraits: string[];
  weatherPreference: string;

  // Goals & Preferences
  healthGoals: string[];
  healthGoalsOther: string;
  mealPrepTime: string;
  budgetPreference: string;
  additionalNotes: string;
}

// Notification Interface
export interface Notification {
  id: string;
  type: 'consultation_request_sent' | 'consultation_accepted' | 'consultation_rejected' | 'general';
  title: string;
  message: string;
  doctorId?: string;
  doctorName?: string;
  requestId?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

// User Context Interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  profileCompleted?: boolean;
}

// Consultation Request with Status History
export interface ConsultationRequestWithHistory extends ConsultationRequest {
  statusHistory?: {
    status: ConsultationRequest['status'];
    timestamp: string;
    note?: string;
  }[];
}