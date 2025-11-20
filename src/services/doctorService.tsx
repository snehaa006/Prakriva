// services/doctorService.ts
import { 
  collection, 
  getDocs, 
  query, 
  where,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  writeBatch,
  Timestamp,
  orderBy,
  limit,
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

// Enhanced type definitions
export interface Doctor {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  ayurvedicCertification?: string;
  ayurvedicSpecialization?: string[];
  clinicName?: string;
  clinicAddress?: string;
  yearsOfExperience: number;
  licenseNumber?: string;
  licenseVerified: boolean;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  isActive: boolean;
  verificationPriority: number;
  consultationFee?: string;
  consultationModes?: string[];
  languages?: string[];
  workingHours?: string;
  rating?: number;
  totalConsultations: number;
  totalReviews: number;
  pendingRequests: number; // Add this property
  bio?: string;
  education?: string[];
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
  assessmentData?: any; // Add this property for assessment data
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string; // Add optional fields
  doctorId: string;
  doctorName: string;
  doctorEmail: string;
  requestType: 'consultation' | 'dietitian' | 'general';
  urgency: 'low' | 'medium' | 'high';
  message?: string; // Add optional message field
  preferredConsultationMode?: string; // Add optional consultation mode
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requestedAt: string;
  statusUpdatedAt?: string;
  patientNotified?: boolean;
  doctorNotified?: boolean;
  fullPatientProfile?: any; // Add for storing complete patient data
}

export interface CreateConsultationRequest {
  doctorId: string;
  requestType: 'consultation' | 'dietitian' | 'general';
  urgency: 'low' | 'medium' | 'high';
  message?: string;
  preferredConsultationMode?: string;
}

// Fetch all doctors - flexible approach to find your existing data
export const fetchDoctors = async (): Promise<Doctor[]> => {
  try {
    console.log('🔍 Starting to fetch doctors...');
    
    const doctorsRef = collection(db, 'doctors');
    
    // First, let's get ALL documents to see what's actually in there
    console.log('📄 Fetching all documents from doctors collection...');
    const allSnapshot = await getDocs(doctorsRef);
    
    console.log(`📊 Total documents in doctors collection: ${allSnapshot.size}`);
    
    // Log all documents to see the actual data structure - Fix forEach signature
    allSnapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      const index = Array.from(allSnapshot.docs).indexOf(docSnapshot);
      console.log(`Document ${index + 1} (ID: ${docSnapshot.id}):`, docSnapshot.data());
    });
    
    const doctors: Doctor[] = [];
    
    allSnapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      try {
        const data = docSnapshot.data();
        const docId = docSnapshot.id;
        
        console.log(`🔎 Processing document ${docId}:`, data);
        
        // Check if this looks like a doctor document
        const hasName = data.name || data.doctorName;
        const hasEmail = data.email;
        const isDoctor = data.role === 'doctor' || 
                        data.userType === 'doctor' || 
                        data.accountType === 'doctor' ||
                        data.licenseNumber || 
                        data.medicalDegree ||
                        data.clinicName ||
                        data.ayurvedicCertification;
        
        if (hasName && hasEmail && isDoctor) {
          console.log(`✅ Found valid doctor: ${hasName}`);
          
          // Create doctor object with flexible field mapping
          const doctor: Doctor = {
            id: docId,
            name: data.name || data.doctorName || 'Unknown Doctor',
            email: data.email,
            phoneNumber: data.phoneNumber || data.phone || undefined,
            
            // Professional Info
            ayurvedicCertification: data.ayurvedicCertification || undefined,
            ayurvedicSpecialization: Array.isArray(data.ayurvedicSpecialization) ? data.ayurvedicSpecialization : [],
            clinicName: data.clinicName || undefined,
            clinicAddress: data.clinicAddress || undefined,
            yearsOfExperience: typeof data.yearsOfExperience === 'number' ? data.yearsOfExperience : 0,
            licenseNumber: data.licenseNumber || undefined,
            licenseVerified: data.licenseVerified || false,
            
            // Verification & Status - with multiple fallbacks
            verificationStatus: data.verificationStatus || 
                              (data.licenseVerified ? 'verified' : 'pending') ||
                              'unverified',
            isActive: data.isActive !== false && 
                     data.accountStatus !== 'inactive' &&
                     data.status !== 'inactive',
            verificationPriority: data.verificationPriority || 
                                getVerificationPriority(data.verificationStatus || 'unverified'),
            
            // Consultation Info
            consultationFee: data.consultationFee?.toString() || undefined,
            consultationModes: Array.isArray(data.consultationModes) ? data.consultationModes : 
                              data.consultationModes ? [data.consultationModes] : ['in-person'],
            languages: Array.isArray(data.languages) ? data.languages : 
                      data.languages ? [data.languages] : ['English'],
            workingHours: data.workingHours || undefined,
            
            // Stats with defaults
            rating: typeof data.rating === 'number' ? data.rating : 
                   (Math.random() * 2 + 3.5), // Random rating between 3.5-5.5 for demo
            totalConsultations: typeof data.totalConsultations === 'number' ? data.totalConsultations : 
                               Math.floor(Math.random() * 100 + 10), // Random for demo
            totalReviews: typeof data.totalReviews === 'number' ? data.totalReviews : 
                         Math.floor(Math.random() * 50 + 5), // Random for demo
            pendingRequests: typeof data.pendingRequests === 'number' ? data.pendingRequests : 0,
            
            // Profile
            bio: data.bio || undefined,
            education: Array.isArray(data.education) ? data.education : [],
            
            // Timestamps
            createdAt: data.createdAt || data.registrationDate || new Date().toISOString(),
            updatedAt: data.updatedAt || data.lastUpdated || new Date().toISOString(),
          };
          
          doctors.push(doctor);
          console.log(`➕ Added doctor to list: ${doctor.name} (Status: ${doctor.verificationStatus})`);
          
        } else {
          console.log(`❌ Skipping document ${docId}: Not a valid doctor document`, {
            hasName: !!hasName,
            hasEmail: !!hasEmail,
            isDoctor,
            actualData: data
          });
        }
        
      } catch (error) {
        console.error(`💥 Error processing document ${docSnapshot.id}:`, error);
      }
    });
    
    console.log(`📋 Total doctors found: ${doctors.length}`);
    
    // Client-side sorting
    const sortedDoctors = doctors.sort((a, b) => {
      // Verified first
      if (a.verificationPriority !== b.verificationPriority) {
        return a.verificationPriority - b.verificationPriority;
      }
      // Then by rating
      return (b.rating || 0) - (a.rating || 0);
    });
    
    console.log('🎯 Final sorted doctor list:', sortedDoctors.map(d => ({
      id: d.id,
      name: d.name,
      status: d.verificationStatus,
      rating: d.rating
    })));
    
    return sortedDoctors;
    
  } catch (error) {
    console.error('💥 Error in fetchDoctors:', error);
    throw new Error(`Failed to fetch doctors: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Enhanced patient profile fetching with multiple collection checks
export const fetchPatientProfile = async (patientId: string): Promise<Patient | null> => {
  try {
    console.log(`Fetching patient profile for: ${patientId}`);
    
    // Try multiple possible collection names and document structures
    const possibleCollections = ['patients', 'users', 'profiles'];
    
    for (const collectionName of possibleCollections) {
      try {
        console.log(`Trying collection: ${collectionName}`);
        const patientDoc = await getDoc(doc(db, collectionName, patientId));
        
        if (patientDoc.exists()) {
          const data = patientDoc.data();
          console.log(`Found patient data in ${collectionName}:`, data);
          
          // Check if this document has patient-like data
          if (data.name || data.email) {
            const patient: Patient = {
              id: patientDoc.id,
              name: data.name || data.displayName || 'Unknown Patient',
              email: data.email || '',
              phoneNumber: data.phoneNumber || data.phone || undefined,
              
              // Try to get data from assessmentData if it exists
              age: data.assessmentData?.age || data.age || undefined,
              gender: data.assessmentData?.gender || data.gender || undefined,
              bloodGroup: data.bloodGroup || undefined,
              address: data.assessmentData?.location || data.location || data.address || undefined,
              emergencyContact: data.emergencyContact || undefined,
              
              // Medical info from assessment data
              medicalHistory: data.assessmentData?.currentConditions || 
                             Array.isArray(data.medicalHistory) ? data.medicalHistory : [],
              allergies: data.assessmentData?.allergies || 
                        Array.isArray(data.allergies) ? data.allergies : [],
              currentMedications: data.assessmentData?.medications ? 
                                 [data.assessmentData.medications] : 
                                 Array.isArray(data.currentMedications) ? data.currentMedications : [],
              
              // Include full assessment data if available
              assessmentData: data.assessmentData || undefined,
              
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            
            console.log(`Successfully parsed patient: ${patient.name}`);
            return patient;
          }
        }
      } catch (collectionError) {
        console.log(`Collection ${collectionName} doesn't exist or error:`, collectionError);
        continue;
      }
    }
    
    console.log('Patient profile not found in any collection');
    return null;
    
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return null;
  }
};

// Enhanced consultation request creation with better error handling
export const createConsultationRequest = async (
  requestData: CreateConsultationRequest
): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('User must be authenticated to create consultation request');
  }

  console.log('Creating consultation request:', requestData);

  try {
    const patientProfile = await fetchPatientProfile(currentUser.uid);
    if (!patientProfile) {
      throw new Error('Patient profile not found. Please complete your profile first.');
    }

    const doctorDoc = await getDoc(doc(db, 'doctors', requestData.doctorId));
    if (!doctorDoc.exists()) {
      throw new Error('Doctor not found or no longer available');
    }
    
    const doctorData = doctorDoc.data() as Doctor;

    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();

    // Helper function to remove undefined values
    const removeUndefinedFields = (obj: any) => {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
          cleaned[key] = obj[key];
        }
      });
      return cleaned;
    };

    // 1. Create main consultation request with all required fields
    const requestRef = doc(collection(db, 'consultationRequests'));
    const consultationRequest: Partial<ConsultationRequest> = {
      // Patient Info
      patientId: currentUser.uid,
      patientName: patientProfile.name,
      patientEmail: patientProfile.email,
      
      // Doctor Info
      doctorId: requestData.doctorId,
      doctorName: doctorData.name,
      doctorEmail: doctorData.email,
      
      // Request Details
      requestType: requestData.requestType,
      urgency: requestData.urgency,
      
      // Status
      status: 'pending',
      requestedAt: timestamp,
      
      // Add notification flag
      patientNotified: false,
      doctorNotified: false
    };

    // Add optional fields only if they exist
    if (patientProfile.phoneNumber) {
      consultationRequest.patientPhone = patientProfile.phoneNumber;
    }
    
    if (requestData.message && requestData.message.trim()) {
      consultationRequest.message = requestData.message.trim();
    }
    
    if (requestData.preferredConsultationMode) {
      consultationRequest.preferredConsultationMode = requestData.preferredConsultationMode;
    }

    // Clean up patient profile for storage
    const cleanPatientProfile = removeUndefinedFields({
      name: patientProfile.name,
      email: patientProfile.email,
      age: patientProfile.age,
      gender: patientProfile.gender,
      phoneNumber: patientProfile.phoneNumber,
      address: patientProfile.address,
      bloodGroup: patientProfile.bloodGroup,
      emergencyContact: patientProfile.emergencyContact,
      medicalHistory: patientProfile.medicalHistory || [],
      allergies: patientProfile.allergies || [],
      currentMedications: patientProfile.currentMedications || [],
      assessmentData: patientProfile.assessmentData || null
    });

    consultationRequest.fullPatientProfile = cleanPatientProfile;

    batch.set(requestRef, consultationRequest);

    // 2. Create doctor-specific request reference
    const doctorRequestRef = doc(collection(db, `doctors/${requestData.doctorId}/requests`));
    const doctorRequestData = {
      requestId: requestRef.id,
      patientId: currentUser.uid,
      patientName: patientProfile.name,
      patientEmail: patientProfile.email,
      requestType: requestData.requestType,
      status: 'pending',
      requestedAt: timestamp,
      urgency: requestData.urgency
    } as any;

    // Add optional fields for doctor request
    if (patientProfile.phoneNumber) {
      doctorRequestData.patientPhone = patientProfile.phoneNumber;
    }

    batch.set(doctorRequestRef, doctorRequestData);

    // 3. Update doctor's pending request count
    const doctorRef = doc(db, 'doctors', requestData.doctorId);
    batch.update(doctorRef, {
      pendingRequests: (doctorData.pendingRequests || 0) + 1,
      updatedAt: timestamp
    });

    // 4. Create notification for patient
    const patientNotificationRef = doc(collection(db, `patients/${currentUser.uid}/notifications`));
    batch.set(patientNotificationRef, {
      type: 'consultation_request_sent',
      title: 'Consultation Request Sent',
      message: `Your consultation request has been sent to Dr. ${doctorData.name}. You'll receive a response soon.`,
      doctorId: requestData.doctorId,
      doctorName: doctorData.name,
      requestId: requestRef.id,
      read: false,
      createdAt: timestamp
    });

    await batch.commit();
    
    console.log(`Successfully created consultation request: ${requestRef.id}`);
    return requestRef.id;
    
  } catch (error) {
    console.error('Error creating consultation request:', error);
    throw error;
  }
};

// Fetch patient notifications
export const fetchPatientNotifications = async (): Promise<any[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  try {
    const notificationsRef = collection(db, `patients/${currentUser.uid}/notifications`);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    const notifications: any[] = [];
    snapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      notifications.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const notificationRef = doc(db, `patients/${currentUser.uid}/notifications`, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

// Fetch consultation requests for patient with status updates
export const fetchPatientConsultationRequests = async (): Promise<ConsultationRequest[]> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return [];

  try {
    const requestsRef = collection(db, 'consultationRequests');
    const q = query(
      requestsRef, 
      where('patientId', '==', currentUser.uid),
      orderBy('requestedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const requests: ConsultationRequest[] = [];
    
    snapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      const data = docSnapshot.data();
      requests.push({
        id: docSnapshot.id,
        ...data,
        // Ensure we have the latest status
        statusUpdatedAt: data.statusUpdatedAt || data.requestedAt
      } as ConsultationRequest);
    });
    
    return requests;
  } catch (error) {
    console.error('Error fetching patient consultation requests:', error);
    return [];
  }
};

// Check for request status updates and create notifications
export const checkForRequestUpdates = async (): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  try {
    const requests = await fetchPatientConsultationRequests();
    const batch = writeBatch(db);
    
    for (const request of requests) {
      if (request.status === 'accepted' && !request.patientNotified) {
        // Create acceptance notification
        const notificationRef = doc(collection(db, `patients/${currentUser.uid}/notifications`));
        batch.set(notificationRef, {
          type: 'consultation_accepted',
          title: 'Consultation Request Accepted',
          message: `Dr. ${request.doctorName} has accepted your consultation request!`,
          doctorId: request.doctorId,
          doctorName: request.doctorName,
          requestId: request.id,
          read: false,
          createdAt: new Date().toISOString()
        });

        // Mark as notified
        const requestRef = doc(db, 'consultationRequests', request.id);
        batch.update(requestRef, {
          patientNotified: true
        });
      }
      
      if (request.status === 'rejected' && !request.patientNotified) {
        // Create rejection notification
        const notificationRef = doc(collection(db, `patients/${currentUser.uid}/notifications`));
        batch.set(notificationRef, {
          type: 'consultation_rejected',
          title: 'Consultation Request Update',
          message: `Dr. ${request.doctorName} is currently unavailable. Please try another doctor.`,
          doctorId: request.doctorId,
          doctorName: request.doctorName,
          requestId: request.id,
          read: false,
          createdAt: new Date().toISOString()
        });

        // Mark as notified
        const requestRef = doc(db, 'consultationRequests', request.id);
        batch.update(requestRef, {
          patientNotified: true
        });
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error checking for request updates:', error);
  }
};

export const checkExistingRequest = async (doctorId: string): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;

  try {
    const requestsRef = collection(db, 'consultationRequests');
    const q = query(
      requestsRef,
      where('patientId', '==', currentUser.uid),
      where('doctorId', '==', doctorId),
      where('status', 'in', ['pending', 'accepted'])
    );
    
    const snapshot = await getDocs(q);
    return !snapshot.empty;
    
  } catch (error) {
    console.error('Error checking existing request:', error);
    return false;
  }
};

export const searchDoctors = async (searchTerm: string): Promise<Doctor[]> => {
  if (!searchTerm.trim()) {
    return fetchDoctors();
  }

  try {
    const allDoctors = await fetchDoctors();
    const searchLower = searchTerm.toLowerCase();
    
    return allDoctors.filter(doctor => {
      return doctor.name.toLowerCase().includes(searchLower) ||
             doctor.clinicName?.toLowerCase().includes(searchLower) ||
             doctor.clinicAddress?.toLowerCase().includes(searchLower) ||
             doctor.ayurvedicSpecialization?.some(spec => 
               spec.toLowerCase().includes(searchLower)
             );
    });
    
  } catch (error) {
    console.error('Error searching doctors:', error);
    throw new Error('Failed to search doctors');
  }
};

// Helper function to determine verification priority
const getVerificationPriority = (status: string): number => {
  switch (status) {
    case 'verified': return 1;
    case 'pending': return 2;
    case 'unverified': return 3;
    default: return 2;
  }
};

// Debug function to inspect your Firestore structure
export const debugFirestoreStructure = async () => {
  try {
    console.log('🔧 DEBUG: Inspecting Firestore structure...');
    
    const doctorsRef = collection(db, 'doctors');
    const snapshot = await getDocs(doctorsRef);
    
    console.log(`📊 Found ${snapshot.size} documents in doctors collection`);
    
    snapshot.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      const index = Array.from(snapshot.docs).indexOf(docSnapshot);
      const data = docSnapshot.data();
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`ID: ${docSnapshot.id}`);
      console.log('Fields:', Object.keys(data));
      console.log('Data:', data);
      console.log('---');
    });
    
    return snapshot.size;
  } catch (error) {
    console.error('Debug failed:', error);
    return 0;
  }
};