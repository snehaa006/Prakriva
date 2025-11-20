import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";

/* ----------------------------- Type Definitions ----------------------------- */

export type UserRole = "doctor" | "patient" | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialization?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  weight: number;
  height: number;
  bmi: number;
  primaryDosha: "vata" | "pitta" | "kapha";
  secondaryDosha?: "vata" | "pitta" | "kapha";
  conditions: string[];
  allergies: string[];
  adherenceScore: number;
  lastLogDate: string;
  dietPlan?: DietPlan;
  questionnaireCompleted: boolean;
}

export interface Food {
  id: string;
  name: string;
  category:
    | "grains"
    | "vegetables"
    | "fruits"
    | "proteins"
    | "dairy"
    | "spices"
    | "beverages";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  ayurvedicProperties: {
    rasa: (
      | "sweet"
      | "sour"
      | "salty"
      | "pungent"
      | "bitter"
      | "astringent"
    )[];
    virya: "heating" | "cooling";
    vipaka: "sweet" | "sour" | "pungent";
    doshaEffect: {
      vata: "increases" | "decreases" | "neutral";
      pitta: "increases" | "decreases" | "neutral";
      kapha: "increases" | "decreases" | "neutral";
    };
  };
  seasonal: ("spring" | "summer" | "monsoon" | "autumn" | "winter")[];
  isVegetarian: boolean;
  isVegan: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: { foodId: string; quantity: number; unit: string }[];
  instructions: string[];
  servings: number;
  prepTime: number;
  cookTime: number;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  ayurvedicBalance: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  tags: string[];
}

export interface MealPlan {
  id: string;
  name: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  recipes: Recipe[];
  totalCalories: number;
  ayurvedicBalance: {
    vata: number;
    pitta: number;
    kapha: number;
  };
}

export interface DietPlan {
  id: string;
  patientId: string;
  startDate: string;
  endDate: string;
  meals: MealPlan[];
  objectives: string[];
  restrictions: string[];
  notes: string;
  generatedBy: string;
  aiReasoning?: string;
}

export interface ConsultationRequest {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  requestType: "consultation" | "follow-up" | "emergency";
  mode: "in-person" | "video-call" | "phone";
  urgency: "low" | "medium" | "high" | "emergency";
  message?: string;
  date: Date;
  status: "pending" | "accepted" | "rejected";
}

/* ----------------------------- Context Type ----------------------------- */

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  currentPatient: Patient | null;
  setCurrentPatient: (patient: Patient | null) => void;
  patients: Patient[];
  setPatients: (patients: Patient[]) => void;
  foods: Food[];
  recipes: Recipe[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  questionnaireCompleted: boolean | null;
  setQuestionnaireCompleted: (isCompleted: boolean) => void;

  doctor: Doctor | null;
  setDoctor: (doctor: Doctor | null) => void;
  consultationRequests: ConsultationRequest[];
  setConsultationRequests: (requests: ConsultationRequest[]) => void;
}

/* ----------------------------- Context Setup ----------------------------- */

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within an AppProvider");
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [foods] = useState<Food[]>([]);
  const [recipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [questionnaireCompleted, setQuestionnaireCompleted] = useState<
    boolean | null
  >(null);

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [consultationRequests, setConsultationRequests] = useState<
    ConsultationRequest[]
  >([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);

      if (firebaseUser) {
        try {
          // Patient Check
          const patientDoc = await getDoc(doc(db, "patients", firebaseUser.uid));
          if (patientDoc.exists()) {
            const data = patientDoc.data();
            setUser({
              id: firebaseUser.uid,
              name: data.name || "Patient",
              email: firebaseUser.email || "",
              role: "patient",
            });
            setQuestionnaireCompleted(Boolean(data.questionnaireCompleted));
          } else {
            // Doctor Check
            const doctorDoc = await getDoc(doc(db, "doctors", firebaseUser.uid));
            if (doctorDoc.exists()) {
              const data = doctorDoc.data();
              const currentDoctor: Doctor = {
                id: firebaseUser.uid,
                name: data.name || "Doctor",
                email: firebaseUser.email || "",
                specialization: data.specialization || "",
              };
              setDoctor(currentDoctor);
              setUser({
                id: firebaseUser.uid,
                name: data.name || "Doctor",
                email: firebaseUser.email || "",
                role: "doctor",
              });
              setQuestionnaireCompleted(null);

              // Fetch Consultation Requests
              const q = query(
                collection(db, "consultationRequests"),
                where("doctorId", "==", currentDoctor.id)
              );
              const snapshot = await getDocs(q);
              const requests: ConsultationRequest[] = snapshot.docs.map(
                (docSnap) => {
                  const d = docSnap.data();
                  return {
                    id: docSnap.id,
                    patientId: d.patientId,
                    patientName: d.patientName,
                    doctorId: d.doctorId,
                    requestType: d.requestType,
                    mode: d.mode,
                    urgency: d.urgency,
                    message: d.message,
                    date:
                      d.date instanceof Timestamp
                        ? d.date.toDate()
                        : new Date(d.date),
                    status: d.status,
                  };
                }
              );
              setConsultationRequests(requests);
            }
          }
        } catch (error) {
          console.error("Error fetching user or requests:", error);
          setUser(null);
          setDoctor(null);
          setConsultationRequests([]);
          setQuestionnaireCompleted(null);
        }
      } else {
        setUser(null);
        setDoctor(null);
        setConsultationRequests([]);
        setQuestionnaireCompleted(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AppContextType = {
    user,
    setUser,
    currentPatient,
    setCurrentPatient,
    patients,
    setPatients,
    foods,
    recipes,
    isLoading,
    setIsLoading,
    questionnaireCompleted,
    setQuestionnaireCompleted,
    doctor,
    setDoctor,
    consultationRequests,
    setConsultationRequests,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
