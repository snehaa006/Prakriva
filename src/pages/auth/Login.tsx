/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { auth, db } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Leaf, Upload, Shield, Star, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { doc, setDoc, getDocs, query, collection, getDoc } from "firebase/firestore";

// Function to generate next patient ID
const generateNextPatientId = async (): Promise<string> => {
  try {
    const counterRef = doc(db, "metadata", "patientCounter");
    const counterDoc = await getDocs(query(collection(db, "metadata")));
    
    let nextId = 1;
    
    const counterSnapshot = await getDocs(query(collection(db, "metadata")));
    const existingCounter = counterSnapshot.docs.find(doc => doc.id === "patientCounter");
    
    if (existingCounter) {
      nextId = existingCounter.data().count + 1;
    }
    
    await setDoc(counterRef, { count: nextId }, { merge: true });
    return `P${nextId.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error("Error generating patient ID:", error);
    return `P${Date.now().toString().slice(-6)}`;
  }
};

// Helper function to determine user role from Firebase with retry logic
const getUserRole = async (uid: string, maxRetries = 3): Promise<{ role: string | null; hasCompletedQuestionnaire?: boolean }> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`🔍 Checking user role for UID: ${uid} (Attempt ${attempt + 1}/${maxRetries})`);
      
      // Check if user is a doctor
      const doctorRef = doc(db, "doctors", uid);
      const doctorSnap = await getDoc(doctorRef);
      
      if (doctorSnap.exists()) {
        console.log("👨‍⚕️ User is a doctor");
        return { role: "doctor" };
      }
      
      // Check if user is a patient
      const patientRef = doc(db, "patients", uid);
      const patientSnap = await getDoc(patientRef);
      
      if (patientSnap.exists()) {
        const patientData = patientSnap.data();
        console.log("👤 User is a patient, questionnaire completed:", patientData?.questionnaireCompleted);
        return { 
          role: "patient", 
          hasCompletedQuestionnaire: patientData?.questionnaireCompleted || false 
        };
      }
      
      // If no document found, wait before retrying
      if (attempt < maxRetries - 1) {
        console.log(`❓ User role not found, retrying in ${(attempt + 1) * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
      
    } catch (error) {
      console.error(`❌ Error fetching user role (attempt ${attempt + 1}):`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
  }
  
  console.log("❓ Could not determine user role after all attempts");
  return { role: null };
};

// Helper function to navigate based on user role and context
const navigateUserToDashboard = (
  navigate: any, 
  role: string, 
  hasCompletedQuestionnaire?: boolean, 
  isNewSignup = false
) => {
  console.log("🧭 Navigating user:", { role, hasCompletedQuestionnaire, isNewSignup });
  
  if (role === "doctor") {
    navigate("/doctor/dashboard", { replace: true });
  } else if (role === "patient") {
    if (isNewSignup) {
      navigate("/patient/questionnaire", { replace: true });
    } else if (!hasCompletedQuestionnaire) {
      navigate("/patient/questionnaire", { replace: true });
    } else {
      navigate("/patient/dashboard", { replace: true });
    }
  } else {
    navigate("/", { replace: true });
  }
};

interface VerificationResult {
  isValid: boolean;
  doctorName?: string;
  registrationDate?: string;
  status?: 'active' | 'suspended' | 'expired';
  council?: string;
  error?: string;
}

interface VerificationData {
  licenseNumber: string;
  medicalCouncil: string;
  graduationYear: string;
  medicalDegree: string;
  ayurvedicCertification: string;
  ayurvedicSpecialization: string[];
  traditionalTraining: string;
  clinicName: string;
  clinicAddress: string;
  yearsOfExperience: string;
  consultationFee: string;
  languages: string[];
  specialConditions: string[];
  consultationModes: string[];
  licenseVerified: boolean;
  verificationDetails?: VerificationResult;
}

// LICENSE VERIFICATION FUNCTIONS
const validateLicenseFormat = (licenseNumber: string, council: string): boolean => {
  const patterns = {
    'mci': /^[A-Z]{2}\d{8}$/,
    'nmc': /^NMC\/\d{10}$/,
    'state-council': /^[A-Z]{2}\/\d{6,8}$/,
    'ayush': /^AYU\/[A-Z]{2}\/\d{6}$/,
  };
  
  const pattern = patterns[council as keyof typeof patterns];
  return pattern ? pattern.test(licenseNumber) : false;
};

const verifyLicenseWithAPI = async (
  licenseNumber: string, 
  council: string
): Promise<VerificationResult> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (!validateLicenseFormat(licenseNumber, council)) {
    return {
      isValid: false,
      error: 'Invalid license number format for selected council'
    };
  }
  
  const mockDatabase: Record<string, VerificationResult> = {
    'MH12345678': {
      isValid: true,
      doctorName: 'Dr. Rajesh Kumar',
      registrationDate: '2020-03-15',
      status: 'active',
      council: 'Maharashtra Medical Council'
    },
    'KA87654321': {
      isValid: true,
      doctorName: 'Dr. Priya Sharma',
      registrationDate: '2018-07-22',
      status: 'active',
      council: 'Karnataka Medical Council'
    },
    'TN98765432': {
      isValid: true,
      doctorName: 'Dr. Meera Nair',
      registrationDate: '2017-05-20',
      status: 'active',
      council: 'Tamil Nadu Medical Council'
    },
    'GJ11223344': {
      isValid: true,
      doctorName: 'Dr. Arjun Patel',
      registrationDate: '2021-01-12',
      status: 'active',
      council: 'Gujarat Medical Council'
    },
    'UP55667788': {
      isValid: true,
      doctorName: 'Dr. Sita Gupta',
      registrationDate: '2016-11-08',
      status: 'active',
      council: 'Uttar Pradesh Medical Council'
    },
    'RJ99887766': {
      isValid: true,
      doctorName: 'Dr. Vikram Singh',
      registrationDate: '2019-08-25',
      status: 'active',
      council: 'Rajasthan Medical Council'
    },
    'AYU/KA/789012': {
      isValid: true,
      doctorName: 'Dr. Lakshmi Rao',
      registrationDate: '2020-04-18',
      status: 'active',
      council: 'AYUSH Ministry - Karnataka'
    },
    'NMC/2022001234': {
      isValid: true,
      doctorName: 'Dr. Rohit Joshi',
      registrationDate: '2022-02-14',
      status: 'active',
      council: 'National Medical Commission'
    }
  };
  
  const result = mockDatabase[licenseNumber];
  
  if (result) {
    return result;
  }
  
  return {
    isValid: false,
    error: 'License number not found in our database. Please verify the number or contact support.'
  };
};

const Login = () => {
  const { role } = useParams<{ role: "doctor" | "patient" }>();
  const navigate = useNavigate();
  const isSubmitting = useRef(false); // Prevent multiple submissions

  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  // License verification states
  const [isVerifyingLicense, setIsVerifyingLicense] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [showVerificationResult, setShowVerificationResult] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [verificationData, setVerificationData] = useState<VerificationData>({
    licenseNumber: "",
    medicalCouncil: "",
    graduationYear: "",
    medicalDegree: "",
    ayurvedicCertification: "",
    ayurvedicSpecialization: [],
    traditionalTraining: "",
    clinicName: "",
    clinicAddress: "",
    yearsOfExperience: "",
    consultationFee: "",
    languages: [],
    specialConditions: [],
    consultationModes: [],
    licenseVerified: false,
  });

  // REMOVED THE AUTO-NAVIGATION useEffect TO FIX MULTIPLE TAB ISSUES
  // Navigation now only happens after explicit login/signup actions

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleVerificationChange = (field: keyof VerificationData, value: any) => {
    setVerificationData((prev) => ({ ...prev, [field]: value }));
    
    if (field === 'licenseNumber' || field === 'medicalCouncil') {
      setVerificationResult(null);
      setShowVerificationResult(false);
      setVerificationData(prev => ({ ...prev, licenseVerified: false }));
    }
  };

  const handleArrayFieldChange = (field: keyof VerificationData, value: string, checked: boolean) => {
    setVerificationData((prev) => {
      const currentArray = prev[field] as string[];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleVerifyLicense = async () => {
    if (!verificationData.licenseNumber || !verificationData.medicalCouncil) {
      toast.error("Please enter license number and select medical council");
      return;
    }

    setIsVerifyingLicense(true);
    setShowVerificationResult(false);
    
    try {
      const result = await verifyLicenseWithAPI(
        verificationData.licenseNumber, 
        verificationData.medicalCouncil
      );
      
      setVerificationResult(result);
      setShowVerificationResult(true);
      
      setVerificationData(prev => ({
        ...prev,
        licenseVerified: result.isValid,
        verificationDetails: result
      }));
      
      if (result.isValid) {
        toast.success("License verified successfully!");
        if (result.doctorName && !formData.name) {
          setFormData(prev => ({ ...prev, name: result.doctorName || "" }));
        }
      } else {
        toast.error(result.error || "License verification failed");
      }
      
    } catch (error) {
      const errorResult = {
        isValid: false,
        error: 'Verification service temporarily unavailable. Please try again.'
      };
      
      setVerificationResult(errorResult);
      setShowVerificationResult(true);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifyingLicense(false);
    }
  };

  const getVerificationIcon = (result: VerificationResult) => {
    if (result.isValid) return <CheckCircle className="w-4 h-4 text-green-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getVerificationColor = (result: VerificationResult) => {
    if (result.isValid) return 'border-green-200 bg-green-50';
    return 'border-red-200 bg-red-50';
  };

  const validateStep1 = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const required = ['licenseNumber', 'medicalCouncil', 'graduationYear', 'medicalDegree'];
    for (const field of required) {
      if (!verificationData[field as keyof VerificationData]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    
    if (role === 'doctor' && !verificationData.licenseVerified) {
      toast.error("Please verify your medical license before proceeding");
      return false;
    }
    
    return true;
  };

  const validateStep3 = () => {
    const required = ['yearsOfExperience'];
    for (const field of required) {
      if (!verificationData[field as keyof VerificationData]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    return true;
  };

  const validateStep4 = () => {
    const required = ['clinicName'];
    for (const field of required) {
      if (!verificationData[field as keyof VerificationData]) {
        toast.error(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    return true;
  };

  const calculateVerificationScore = () => {
    let score = 0;
    
    if (verificationData.licenseVerified) score += 50;
    else if (verificationData.licenseNumber) score += 10;
    
    if (verificationData.medicalDegree) score += 10;
    if (verificationData.graduationYear) score += 5;
    if (parseInt(verificationData.yearsOfExperience) > 5) score += 5;
    
    if (verificationData.ayurvedicCertification) score += 8;
    if (verificationData.traditionalTraining) score += 4;
    if (verificationData.ayurvedicSpecialization.length > 0) score += 3;
    
    if (verificationData.clinicName) score += 5;
    if (verificationData.specialConditions.length > 0) score += 3;
    if (verificationData.languages.length > 1) score += 2;
    
    if (verificationData.consultationModes.length > 0) score += 3;
    if (verificationData.consultationFee) score += 2;
    
    return Math.min(score, 100);
  };

  const getVerificationBadge = (score: number, licenseVerified: boolean) => {
    if (licenseVerified && score >= 85) {
      return { text: "Verified Ayurvedic Expert", color: "bg-green-600", icon: Shield };
    }
    if (licenseVerified && score >= 70) {
      return { text: "Verified Doctor", color: "bg-blue-600", icon: Star };
    }
    if (licenseVerified) {
      return { text: "License Verified", color: "bg-green-500", icon: CheckCircle };
    }
    if (score >= 50) {
      return { text: "Pending Verification", color: "bg-yellow-600", icon: AlertTriangle };
    }
    return { text: "Verification Required", color: "bg-red-600", icon: XCircle };
  };

  const handleNext = () => {
    if (role !== "doctor") return;
    
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Prevent multiple submissions
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    // Final validation for step 4
    if (isSignup && role === "doctor" && currentStep === 4 && !validateStep4()) {
      isSubmitting.current = false;
      return;
    }
  
    if (isSignup && formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      isSubmitting.current = false;
      return;
    }
  
    setIsLoading(true);
    console.log("🚀 Starting authentication:", { isSignup, role });
  
    try {
      let userCredential;
  
      if (isSignup) {
        console.log("📝 Creating new user account");
        
        try {
          userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
        } catch (authError: any) {
          if (authError.code === 'auth/email-already-in-use') {
            toast.error("An account with this email already exists. Please sign in instead or use a different email.");
            setIsSignup(false);
            isSubmitting.current = false;
            return;
          }
          throw authError;
        }
        
        const firebaseUser = userCredential.user;
        console.log("✅ Firebase user created:", firebaseUser.uid);
  
        // Create user document based on role
        if (role === "doctor") {
          console.log("👨‍⚕️ Creating doctor document");
          
          const verificationScore = calculateVerificationScore();
          const badge = getVerificationBadge(verificationScore, verificationData.licenseVerified);
          
          const doctorData = {
            name: formData.name,
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            role: "doctor",
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            verificationStatus: verificationData.licenseVerified ? "verified" : "pending",
            verificationScore: verificationScore,
            verificationBadge: badge.text,
            licenseVerified: verificationData.licenseVerified,
            licenseVerificationDate: verificationData.licenseVerified ? new Date().toISOString() : null,
            licenseVerificationDetails: verificationData.verificationDetails ? {
              verifiedName: verificationData.verificationDetails.doctorName,
              registrationDate: verificationData.verificationDetails.registrationDate,
              councilStatus: verificationData.verificationDetails.status,
              verifyingCouncil: verificationData.verificationDetails.council,
              verificationMethod: 'api_verification'
            } : null,
            licenseNumber: verificationData.licenseNumber,
            medicalCouncil: verificationData.medicalCouncil,
            graduationYear: parseInt(verificationData.graduationYear) || 0,
            medicalDegree: verificationData.medicalDegree,
            ayurvedicCertification: verificationData.ayurvedicCertification,
            ayurvedicSpecialization: verificationData.ayurvedicSpecialization,
            traditionalTraining: verificationData.traditionalTraining,
            clinicName: verificationData.clinicName,
            clinicAddress: verificationData.clinicAddress,
            yearsOfExperience: parseInt(verificationData.yearsOfExperience) || 0,
            consultationFee: verificationData.consultationFee,
            languages: verificationData.languages,
            specialConditions: verificationData.specialConditions,
            consultationModes: verificationData.consultationModes,
            canAcceptPatients: verificationData.licenseVerified,
            isAvailable: verificationData.licenseVerified,
            accountStatus: verificationData.licenseVerified ? 'active' : 'pending_verification',
            rating: 0,
            totalReviews: 0,
            totalConsultations: 0,
            profileCompleted: true,
            trustScore: verificationScore,
            badges: [badge.text],
            verificationLevel: verificationData.licenseVerified ? 'high' : 'low'
          };
          
          await setDoc(doc(db, "doctors", firebaseUser.uid), doctorData, { merge: true });
          console.log("✅ Doctor document created successfully");
          
          toast.success(verificationData.licenseVerified ? 
            "Verified doctor account created successfully!" : 
            "Account created! Please complete license verification to accept patients."
          );
          
        } else if (role === "patient") {
          console.log("👤 Creating patient document");
          
          const patientId = await generateNextPatientId();
          console.log("🆔 Generated patient ID:", patientId);
          
          const patientData = {
            patientId: patientId,
            name: formData.name,
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            role: "patient",
            questionnaireCompleted: false,
            createdAt: new Date().toISOString(),
            profileCompleted: false,
            registrationDate: new Date().toISOString(),
            status: "active",
            lastUpdated: new Date().toISOString()
          };
          
          await setDoc(doc(db, "patients", firebaseUser.uid), patientData, { merge: true });
          console.log("✅ Patient document created successfully with name:", formData.name);
          
          toast.success(`Patient account created successfully! Your Patient ID: ${patientId}`);
        }
        
        // Wait for document to be fully written and indexed
        console.log("⏳ Waiting for document synchronization...");
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased wait time
        
        // Navigate based on role for NEW SIGNUP ONLY
        navigateUserToDashboard(navigate, role!, undefined, true);
        
      } else {
        // Sign in existing user
        console.log("🔑 Signing in existing user");
        userCredential = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        
        const firebaseUser = userCredential.user;
        console.log("✅ User signed in successfully:", firebaseUser.uid);
        
        toast.success("Welcome back!");
        
        // For EXISTING users signing in, determine their role and route accordingly
        console.log("🔍 Determining user role for existing user...");
        
        // Wait for Firebase Auth to fully authenticate
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Get user role and questionnaire status with retry logic
        const { role: userRole, hasCompletedQuestionnaire } = await getUserRole(firebaseUser.uid);
        
        if (userRole) {
          console.log("🎯 User role determined:", userRole);
          navigateUserToDashboard(navigate, userRole, hasCompletedQuestionnaire, false);
        } else {
          console.log("❓ Could not determine user role, redirecting to home");
          navigate("/", { replace: true });
          toast.error("Could not determine account type. Please contact support.");
        }
      }
  
    } catch (error) {
      console.error("❌ Authentication error:", error);
      
      let errorMessage = "An unexpected error occurred";
      
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as any).code;
        
        switch (errorCode) {
          case 'auth/user-not-found':
            errorMessage = "No account found with this email. Please sign up first.";
            break;
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Invalid credentials. Please check your email and password.";
            break;
          case 'auth/email-already-in-use':
            errorMessage = "An account with this email already exists. Please sign in instead.";
            setIsSignup(false);
            break;
          case 'auth/weak-password':
            errorMessage = "Password should be at least 6 characters long.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Please enter a valid email address.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Network error. Please check your connection and try again.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Too many failed attempts. Please try again later.";
            break;
          case 'auth/user-disabled':
            errorMessage = "This account has been disabled. Please contact support.";
            break;
          default:
            errorMessage = error instanceof Error ? error.message : "Authentication failed";
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  const getLicenseFormatHint = (council: string) => {
    const hints = {
      'mci': 'Format: AA12345678 (State code + 8 digits)',
      'nmc': 'Format: NMC/1234567890',
      'state-council': 'Format: AA/123456 (State code/6-8 digits)',
      'ayush': 'Format: AYU/AA/123456 (AYU/State/6 digits)'
    };
    return hints[council as keyof typeof hints] || 'Select council to see format';
  };

  const TestDoctorIds = () => (
    <Alert className="mb-4 border-blue-200 bg-blue-50">
      <AlertTriangle className="w-4 h-4" />
      <AlertDescription>
        <div className="text-sm">
          <p className="font-medium text-blue-700 mb-2">Test Doctor License Numbers:</p>
          <div className="grid grid-cols-1 gap-1 text-blue-600 text-xs">
            <div><code>MH12345678</code> - Dr. Rajesh Kumar (MCI)</div>
            <div><code>TN98765432</code> - Dr. Meera Nair (State Council)</div>
            <div><code>GJ11223344</code> - Dr. Arjun Patel (State Council)</div>
            <div><code>UP55667788</code> - Dr. Sita Gupta (State Council)</div>
            <div><code>RJ99887766</code> - Dr. Vikram Singh (State Council)</div>
            <div><code>AYU/KA/789012</code> - Dr. Lakshmi Rao (AYUSH)</div>
            <div><code>NMC/2022001234</code> - Dr. Rohit Joshi (NMC)</div>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );

  const renderDoctorSignupStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <p className="text-sm text-gray-600">Let's start with your basic details</p>
            </div>
            
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Dr. John Doe"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="john.doe@example.com"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="Enter your password"
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="Confirm your password"
                disabled={isLoading}
                minLength={6}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Shield className="w-5 h-5" />
                License Verification
              </h3>
              <p className="text-sm text-gray-600">Verify your medical credentials</p>
            </div>
            
            <TestDoctorIds />
            
            <div>
              <Label htmlFor="medicalCouncil">Medical Council *</Label>
              <Select 
                value={verificationData.medicalCouncil}
                onValueChange={(value) => handleVerificationChange('medicalCouncil', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your medical council" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mci">Medical Council of India (MCI)</SelectItem>
                  <SelectItem value="nmc">National Medical Commission (NMC)</SelectItem>
                  <SelectItem value="state-council">State Medical Council</SelectItem>
                  <SelectItem value="ayush">AYUSH Ministry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="licenseNumber">Medical License Number *</Label>
              <div className="flex gap-2">
                <Input
                  id="licenseNumber"
                  value={verificationData.licenseNumber}
                  onChange={(e) => handleVerificationChange('licenseNumber', e.target.value.toUpperCase())}
                  placeholder="e.g., MH12345678"
                  required
                  disabled={isVerifyingLicense}
                />
                <Button
                  type="button"
                  onClick={handleVerifyLicense}
                  disabled={!verificationData.licenseNumber || !verificationData.medicalCouncil || isVerifyingLicense}
                  className="whitespace-nowrap"
                >
                  {isVerifyingLicense ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getLicenseFormatHint(verificationData.medicalCouncil)}
              </p>
            </div>

            {showVerificationResult && verificationResult && (
              <Alert className={getVerificationColor(verificationResult)}>
                <div className="flex items-start gap-2">
                  {getVerificationIcon(verificationResult)}
                  <div className="flex-1">
                    <AlertDescription>
                      {verificationResult.isValid ? (
                        <div>
                          <p className="font-medium text-green-700">✅ License Verified Successfully</p>
                          <div className="mt-2 text-sm text-green-600">
                            <p><strong>Doctor:</strong> {verificationResult.doctorName}</p>
                            <p><strong>Registration:</strong> {verificationResult.registrationDate}</p>
                            <p><strong>Status:</strong> {verificationResult.status?.toUpperCase()}</p>
                            <p><strong>Council:</strong> {verificationResult.council}</p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-red-700">❌ License Verification Failed</p>
                          <p className="text-sm text-red-600 mt-1">{verificationResult.error}</p>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            )}
            
            <div>
              <Label htmlFor="medicalDegree">Medical Degree *</Label>
              <Select 
                value={verificationData.medicalDegree}
                onValueChange={(value) => handleVerificationChange('medicalDegree', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your degree" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mbbs">MBBS</SelectItem>
                  <SelectItem value="bams">BAMS (Bachelor of Ayurvedic Medicine)</SelectItem>
                  <SelectItem value="md">MD</SelectItem>
                  <SelectItem value="ms">MS</SelectItem>
                  <SelectItem value="bums">BUMS</SelectItem>
                  <SelectItem value="bhms">BHMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="graduationYear">Graduation Year *</Label>
              <Input
                id="graduationYear"
                type="number"
                min="1980"
                max="2024"
                value={verificationData.graduationYear}
                onChange={(e) => handleVerificationChange('graduationYear', e.target.value)}
                placeholder="2020"
                required
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
                <Leaf className="w-5 h-5" />
                Ayurvedic Expertise
              </h3>
              <p className="text-sm text-gray-600">Tell us about your Ayurvedic specialization</p>
            </div>
            
            <div>
              <Label htmlFor="ayurvedicCertification">Ayurvedic Certification</Label>
              <Input
                id="ayurvedicCertification"
                value={verificationData.ayurvedicCertification}
                onChange={(e) => handleVerificationChange('ayurvedicCertification', e.target.value)}
                placeholder="Certificate in Ayurvedic Nutrition"
              />
            </div>
            
            <div>
              <Label>Specialization Areas</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "Nutrition Therapy", "Panchakarma", "Herbal Medicine", 
                  "Lifestyle Counseling", "Digestive Health", "Women's Health", 
                  "Stress Management", "Weight Management", "Detoxification",
                  "Immunity Building", "Mental Wellness", "Skin & Hair Care"
                ].map((spec) => (
                  <div key={spec} className="flex items-center space-x-2">
                    <Checkbox
                      id={spec}
                      checked={verificationData.ayurvedicSpecialization.includes(spec)}
                      onCheckedChange={(checked) => handleArrayFieldChange('ayurvedicSpecialization', spec, checked as boolean)}
                    />
                    <Label htmlFor={spec} className="text-sm">{spec}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label htmlFor="traditionalTraining">Traditional Training Background</Label>
              <Textarea
                id="traditionalTraining"
                value={verificationData.traditionalTraining}
                onChange={(e) => handleVerificationChange('traditionalTraining', e.target.value)}
                placeholder="Describe your traditional Ayurvedic training, mentors, institutions..."
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="yearsOfExperience">Years of Experience *</Label>
              <Input
                id="yearsOfExperience"
                type="number"
                min="0"
                max="50"
                value={verificationData.yearsOfExperience}
                onChange={(e) => handleVerificationChange('yearsOfExperience', e.target.value)}
                placeholder="5"
                required
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold">Practice Details</h3>
              <p className="text-sm text-gray-600">Complete your professional profile</p>
            </div>
            
            <div>
              <Label htmlFor="clinicName">Clinic/Practice Name *</Label>
              <Input
                id="clinicName"
                value={verificationData.clinicName}
                onChange={(e) => handleVerificationChange('clinicName', e.target.value)}
                placeholder="Ayurvedic Wellness Center"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="clinicAddress">Clinic Address</Label>
              <Textarea
                id="clinicAddress"
                value={verificationData.clinicAddress}
                onChange={(e) => handleVerificationChange('clinicAddress', e.target.value)}
                placeholder="Complete address of your practice"
                rows={2}
              />
            </div>
            
            <div>
              <Label htmlFor="consultationFee">Consultation Fee (₹)</Label>
              <Input
                id="consultationFee"
                type="number"
                min="0"
                value={verificationData.consultationFee}
                onChange={(e) => handleVerificationChange('consultationFee', e.target.value)}
                placeholder="500"
              />
            </div>
            
            <div>
              <Label>Languages Spoken</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "English", "Hindi", "Marathi", "Tamil", 
                  "Telugu", "Gujarati", "Bengali", "Punjabi",
                  "Malayalam", "Kannada", "Urdu", "Sanskrit"
                ].map((language) => (
                  <div key={language} className="flex items-center space-x-2">
                    <Checkbox
                      id={language}
                      checked={verificationData.languages.includes(language)}
                      onCheckedChange={(checked) => handleArrayFieldChange('languages', language, checked as boolean)}
                    />
                    <Label htmlFor={language} className="text-sm">{language}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Special Conditions Treated</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {[
                  "Diabetes Management", "Hypertension", "Arthritis", 
                  "PCOD/PCOS", "Obesity", "Digestive Disorders",
                  "Anxiety & Stress", "Insomnia", "Skin Conditions",
                  "Respiratory Issues", "Menstrual Disorders", "Joint Pain"
                ].map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={condition}
                      checked={verificationData.specialConditions.includes(condition)}
                      onCheckedChange={(checked) => handleArrayFieldChange('specialConditions', condition, checked as boolean)}
                    />
                    <Label htmlFor={condition} className="text-sm">{condition}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <Label>Consultation Modes Available</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  "In-person", "Video Call", "Phone Call", "Chat Consultation"
                ].map((mode) => (
                  <div key={mode} className="flex items-center space-x-2">
                    <Checkbox
                      id={mode}
                      checked={verificationData.consultationModes.includes(mode)}
                      onCheckedChange={(checked) => handleArrayFieldChange('consultationModes', mode, checked as boolean)}
                    />
                    <Label htmlFor={mode} className="text-sm">{mode}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium mb-3">Profile Verification Status</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verification Score:</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${calculateVerificationScore()}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{calculateVerificationScore()}%</span>
                  </div>
                </div>
                
                {(() => {
                  const badge = getVerificationBadge(calculateVerificationScore(), verificationData.licenseVerified);
                  return (
                    <div className="flex items-center gap-2">
                      <Badge className={`${badge.color} text-white`}>
                        <badge.icon className="w-3 h-3 mr-1" />
                        {badge.text}
                      </Badge>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Leaf className="w-8 h-8 text-green-600 mr-2" />
            <CardTitle className="text-2xl font-bold text-gray-800">
              Ayurvedic Health
            </CardTitle>
          </div>
          <CardDescription>
            {isSignup ? "Create your account" : "Sign in to your account"} as a{" "}
            <span className="font-semibold capitalize text-green-600">{role}</span>
            {role === "doctor" && isSignup && (
              <div className="mt-2 text-xs text-gray-500">
                Step {currentStep} of 4
              </div>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {role === "doctor" && isSignup && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Basic Info</span>
                  <span>License</span>
                  <span>Expertise</span>
                  <span>Practice</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {(!isSignup || role === "patient") && (
              <div className="space-y-4">
                {isSignup && (
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                      disabled={isLoading}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your password"
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                {isSignup && (
                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="Confirm your password"
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                )}
              </div>
            )}

            {isSignup && role === "doctor" && renderDoctorSignupStep()}

            {isSignup && role === "doctor" && (
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isLoading}
                >
                  Back
                </Button>
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                )}
              </div>
            )}

            {(!isSignup || role === "patient") && (
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignup ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  isSignup ? "Create Account" : "Sign In"
                )}
              </Button>
            )}

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setCurrentStep(1);
                  setFormData({ name: "", email: "", password: "", confirmPassword: "" });
                  setVerificationData({
                    licenseNumber: "",
                    medicalCouncil: "",
                    graduationYear: "",
                    medicalDegree: "",
                    ayurvedicCertification: "",
                    ayurvedicSpecialization: [],
                    traditionalTraining: "",
                    clinicName: "",
                    clinicAddress: "",
                    yearsOfExperience: "",
                    consultationFee: "",
                    languages: [],
                    specialConditions: [],
                    consultationModes: [],
                    licenseVerified: false,
                  });
                  setVerificationResult(null);
                  setShowVerificationResult(false);
                }}
                className="text-sm text-green-600 hover:text-green-700 underline"
                disabled={isLoading}
              >
                {isSignup
                  ? "Already have an account? Sign In"
                  : "Don't have an account? Sign Up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;