import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "@/context/AppContext";
import { FoodProvider } from "@/context/FoodContext";

import Landing from "./pages/Landing";
import Login from "./pages/auth/Login";
import DoctorLayout from "./components/layout/DoctorLayout";
import PatientLayout from "./components/layout/PatientLayout";
import DoctorDashboard from "./pages/doctor/DoctorDashboard";
import PatientDashboard from "./pages/patient/PatientDashboard";
import MealLogging from "./pages/patient/MealLogging";
import SymptomTracking from "./pages/patient/SymptomTracking";
import LifestyleTracker from "./pages/patient/LifestyleTracker";
import SocialSupport from "./pages/patient/SocialSupport";
import AddPatient from "./pages/doctor/AddPatient";
import Patients from "./pages/doctor/Patients";
import AppointmentScheduler from "./pages/doctor/AppointmentScheduler";
import PatientAlerts from "./pages/doctor/PatientAlerts";
import CommunicationPortal from "./pages/doctor/CommunicationPortal";
import PatientFeedback from "./pages/doctor/PatientFeedback";
import TeamManagement from "./pages/doctor/TeamManagement";
import FoodExplorer from "./pages/doctor/FoodExplorer";
import RecipeBuilder from "./pages/doctor/RecipeBuilder";
import DietChart from "./pages/doctor/DietChart";
import NotFound from "./pages/NotFound";
import Questionnaire from "./pages/patient/Questionnaire";
import PatientProfile from "./pages/patient/PatientProfile";
import Reminders from "./pages/patient/Reminders";
import Settings from "./pages/patient/Settings";
import DoctorProfile from "./pages/doctor/DoctorProfile";
import ConsultDoctor from "./components/ConsultDoctor";

const queryClient = new QueryClient();

// --- Loading Component ---
const LoadingScreen = ({ message = "Loading..." }: { message?: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 text-lg">{message}</p>
    </div>
  </div>
);

// --- Protected Routes ---
const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "doctor" | "patient";
}) => {
  const { user, isLoading } = useApp();

  if (isLoading) return <LoadingScreen message="Verifying authentication..." />;
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const PatientProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, questionnaireCompleted, isLoading } = useApp();

  if (isLoading) return <LoadingScreen message="Loading your profile..." />;
  if (!user || user.role !== "patient") return <Navigate to="/" replace />;
  if (questionnaireCompleted === false || questionnaireCompleted === null)
    return <Navigate to="/patient/questionnaire" replace />;

  return <>{children}</>;
};

// --- Auth Redirect ---
const AuthRedirect = () => {
  const { user, questionnaireCompleted, isLoading } = useApp();

  if (isLoading) return <LoadingScreen message="Setting up your dashboard..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === "doctor") return <Navigate to="/doctor/dashboard" replace />;
  if (user.role === "patient") {
    if (questionnaireCompleted === false || questionnaireCompleted === null)
      return <Navigate to="/patient/questionnaire" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }
  return <Navigate to="/" replace />;
};

// --- App Routes ---
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/auth/:role" element={<Login />} />
    <Route path="/redirect" element={<AuthRedirect />} />

    {/* Doctor Routes */}
    <Route
      path="/doctor"
      element={
        <ProtectedRoute requiredRole="doctor">
          <DoctorLayout />
        </ProtectedRoute>
      }
    >
      <Route path="dashboard" element={<DoctorDashboard />} />
      <Route path="patients" element={<Patients />} />
      <Route path="add-patient" element={<AddPatient />} />
      <Route path="appointments" element={<AppointmentScheduler />} />
      <Route path="alerts" element={<PatientAlerts />} />
      <Route path="communication" element={<CommunicationPortal />} />
      <Route path="feedback" element={<PatientFeedback />} />
      <Route path="team" element={<TeamManagement />} />
      <Route path="food-explorer" element={<FoodExplorer />} />
      <Route path="recipes" element={<RecipeBuilder />} />
      <Route path="diet-charts" element={<DietChart />} />
      <Route path="profile" element={<DoctorProfile />} />
      <Route path="consult-doctor" element={<ConsultDoctor />} />
      <Route path="settings" element={<div className="p-6">Settings - Coming Soon</div>} />
      <Route index element={<Navigate to="/doctor/dashboard" replace />} />
    </Route>

    {/* Patient Routes */}
    <Route path="/patient">
      {/* Questionnaire route accessible to any authenticated patient */}
      <Route
        path="questionnaire"
        element={
          <ProtectedRoute requiredRole="patient">
            <Questionnaire />
          </ProtectedRoute>
        }
      />

      {/* Other patient routes require completed questionnaire */}
      <Route
        element={
          <PatientProtectedRoute>
            <PatientLayout />
          </PatientProtectedRoute>
        }
      >
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="meal-logging" element={<MealLogging />} />
        {/* <Route path="symptom-tracking" element={<SymptomTracking />} /> */}
        <Route path="lifestyle-tracker" element={<LifestyleTracker />} />
        <Route path="social-support" element={<SocialSupport />} />
        <Route path="consult-doctor" element={<ConsultDoctor />} />
        <Route path="doctor-profile/:doctorId" element={<div className="p-6">Doctor Profile - Coming Soon</div>} />
        <Route path="meal-plan" element={<div className="p-6">Meal Plan - Coming Soon</div>} />
        <Route path="progress" element={<div className="p-6">Progress Tracking - Coming Soon</div>} />
        <Route path="wellness" element={<div className="p-6">Wellness Tips - Coming Soon</div>} />
        <Route path="shopping" element={<div className="p-6">Shopping List - Coming Soon</div>} />
        <Route path="appointments" element={<AppointmentScheduler/>} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="profile" element={<PatientProfile />} />
        <Route path="settings" element={<Settings />} />
        <Route index element={<Navigate to="/patient/dashboard" replace />} />
      </Route>
    </Route>

    {/* Catch-all */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

// --- App ---
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppProvider>
        <FoodProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </FoodProvider>
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
