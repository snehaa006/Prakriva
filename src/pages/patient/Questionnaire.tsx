import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

import {
  Leaf,
  User,
  Sun,
  Apple,
  HeartPulse,
  Target,
  Check,
  Sparkles,
  Circle,
} from "lucide-react";

interface FormData {
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

const AyurvedicHealthAssessment: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, setQuestionnaireCompleted } = useApp();
  const [formData, setFormData] = useState<FormData>({
    name: user?.name || "",
    dob: "",
    gender: "",
    location: "",
    dailyRoutine: "",
    physicalActivity: "",
    sleepDuration: "",
    waterIntake: 2,
    dietaryPreferences: "",
    cravings: [],
    cravingsOther: "",
    digestionIssues: [],
    currentConditions: [],
    currentConditionsOther: "",
    familyHistory: [],
    familyHistoryOther: "",
    medications: "",
    labReports: "",
    energyLevels: 3,
    stressLevels: 3,
    bodyFrame: "",
    skinType: "",
    hairType: "",
    appetitePattern: "",
    personalityTraits: [],
    weatherPreference: "",
    healthGoals: [],
    healthGoalsOther: "",
    mealPrepTime: "",
    budgetPreference: "",
    additionalNotes: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [waterValue, setWaterValue] = useState("2.0L");

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "range") {
      const numValue = parseFloat(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));

      if (name === "waterIntake") {
        setWaterValue(`${value}L`);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => {
      const currentArray = prev[name] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];
      return { ...prev, [name]: newArray };
    });
  };

  const handleMutualExclusiveCheckbox = (
    name: keyof FormData,
    value: string,
    noneValue = "none"
  ) => {
    setFormData((prev) => {
      const currentArray = prev[name] as string[];

      if (value === noneValue) {
        return {
          ...prev,
          [name]: currentArray.includes(noneValue) ? [] : [noneValue],
        };
      } else {
        const withoutNone = currentArray.filter((item) => item !== noneValue);
        const newArray = withoutNone.includes(value)
          ? withoutNone.filter((item) => item !== value)
          : [...withoutNone, value];
        return { ...prev, [name]: newArray };
      }
    });
  };

  const handleSingleCheckbox = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name] === value ? "" : value,
    }));
  };

  const handleRadioChange = (name: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!user) {
      toast.error("User not found. Please log in again.");
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      const patientDocRef = doc(db, "patients", user.id);
      await updateDoc(patientDocRef, {
        questionnaireCompleted: true,
        assessmentData: formData,
        assessmentCompletedAt: new Date().toISOString(),
      });
  
      // Update context state
      setQuestionnaireCompleted(true);
      
      toast.success("Assessment submitted successfully!");
      
      // Wait for state to propagate
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowModal(true);
  
    } catch (error) {
      console.error("Error submitting questionnaire:", error);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const closeModal = () => {
    setShowModal(false);
    navigate('/patient/dashboard');
  };
  interface RadioOption {
    value: string;
    label: string;
  }

  const RadioGroup: React.FC<{
    name: keyof FormData;
    options: RadioOption[];
    className?: string;
  }> = ({ name, options, className = "flex space-x-4" }) => (
    <div className={className}>
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center space-x-2 cursor-pointer"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={formData[name] === option.value}
            onChange={(e) => handleRadioChange(name, e.target.value)}
            className="sr-only"
          />
          <div
            className={`w-4 h-4 rounded-full border-2 transition-all ${
              formData[name] === option.value
                ? "bg-green-600 border-green-600"
                : "border-gray-300"
            }`}
          >
            {formData[name] === option.value && (
              <div className="w-full h-full rounded-full bg-white scale-50"></div>
            )}
          </div>
          <span
            className={
              formData[name] === option.value
                ? "font-semibold text-green-600"
                : ""
            }
          >
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );

  const CheckboxGroup: React.FC<{
    name: keyof FormData;
    options: RadioOption[];
    mutualExclusive?: boolean;
    singleSelect?: boolean;
    className?: string;
  }> = ({
    name,
    options,
    mutualExclusive = false,
    singleSelect = false,
    className = "grid grid-cols-2 md:grid-cols-3 gap-2",
  }) => (
    <div className={className}>
      {options.map((option) => {
        const isChecked = singleSelect
          ? formData[name] === option.value
          : (formData[name] as string[]).includes(option.value);

        return (
          <label
            key={option.value}
            className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => {
                if (singleSelect) {
                  handleSingleCheckbox(name, option.value);
                } else if (mutualExclusive) {
                  handleMutualExclusiveCheckbox(name, option.value);
                } else {
                  handleCheckboxChange(name, option.value);
                }
              }}
              className="sr-only"
            />
            <div
              className={`w-4 h-4 rounded border-2 transition-all ${
                isChecked ? "bg-green-600 border-green-600" : "border-gray-300"
              }`}
            >
              {isChecked && <Check className="w-3 h-3 text-white" />}
            </div>
            <span
              className={`text-sm ${
                isChecked ? "font-semibold text-green-600" : ""
              }`}
            >
              {option.label}
            </span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className="bg-gray-100 font-sans leading-normal tracking-normal min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Leaf className="w-12 h-12 text-green-700" />
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800">
              Personalized Ayurvedic Profile
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Complete this assessment to receive a customized diet and lifestyle
            plan based on your unique constitution (Prakriti).
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <User className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Personal Information
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-say">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location (City/State)
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="E.g., San Francisco, CA"
                />
              </div>
            </div>
          </div>

          {/* Lifestyle & Habits */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Sun className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Lifestyle & Habits
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily routine (wake/sleep times)
                </label>
                <textarea
                  name="dailyRoutine"
                  value={formData.dailyRoutine}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="E.g., Wake up at 6 AM, sleep by 10 PM"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Physical activity
                </label>
                <RadioGroup
                  name="physicalActivity"
                  options={[
                    { value: "sedentary", label: "Sedentary" },
                    { value: "light", label: "Light (e.g., walking)" },
                    {
                      value: "moderate",
                      label: "Moderate (e.g., jogging, yoga)",
                    },
                    { value: "active", label: "Active (e.g., heavy exercise)" },
                  ]}
                  className="grid grid-cols-2 md:grid-cols-4 gap-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typical sleep duration
                </label>
                <CheckboxGroup
                  name="sleepDuration"
                  options={[
                    { value: "<6h", label: "Less than 6h" },
                    { value: "6-8h", label: "6-8 hours" },
                    { value: ">8h", label: "More than 8h" },
                  ]}
                  singleSelect
                  className="flex space-x-4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Water intake
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    name="waterIntake"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={formData.waterIntake}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-600 font-medium whitespace-nowrap">
                    {waterValue}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dietary Habits */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Apple className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Dietary Habits
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dietary preferences
                </label>
                <RadioGroup
                  name="dietaryPreferences"
                  options={[
                    { value: "vegetarian", label: "Vegetarian" },
                    { value: "vegan", label: "Vegan" },
                    { value: "non-vegetarian", label: "Non-vegetarian" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Common food cravings
                </label>
                <CheckboxGroup
                  name="cravings"
                  options={[
                    { value: "sweet", label: "Sweet" },
                    { value: "salty", label: "Salty" },
                    { value: "spicy", label: "Spicy" },
                    { value: "sour", label: "Sour" },
                    { value: "bitter", label: "Bitter" },
                    { value: "oily", label: "Oily/Fried" },
                  ]}
                  className="grid grid-cols-2 md:grid-cols-4 gap-2"
                />
                <div className="mt-2">
                  <input
                    type="text"
                    name="cravingsOther"
                    value={formData.cravingsOther}
                    onChange={handleInputChange}
                    placeholder="Other cravings..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digestive issues
                </label>
                <CheckboxGroup
                  name="digestionIssues"
                  options={[
                    { value: "bloating", label: "Bloating" },
                    { value: "gas", label: "Gas" },
                    { value: "acidity", label: "Acidity/Heartburn" },
                    { value: "constipation", label: "Constipation" },
                    {
                      value: "irregular-bowels",
                      label: "Irregular bowel movements",
                    },
                    { value: "none", label: "None" },
                  ]}
                  mutualExclusive
                />
              </div>
            </div>
          </div>

          {/* Health & Wellness */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <HeartPulse className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Health & Wellness
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current health conditions
                </label>
                <CheckboxGroup
                  name="currentConditions"
                  options={[
                    { value: "diabetes", label: "Diabetes" },
                    { value: "hypertension", label: "Hypertension" },
                    { value: "arthritis", label: "Arthritis" },
                    { value: "pcos", label: "PCOS" },
                    { value: "autoimmune", label: "Autoimmune disorders" },
                    { value: "none", label: "None" },
                  ]}
                  mutualExclusive
                />
                <div className="mt-2">
                  <input
                    type="text"
                    name="currentConditionsOther"
                    value={formData.currentConditionsOther}
                    onChange={handleInputChange}
                    placeholder="Other conditions..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Family history
                </label>
                <CheckboxGroup
                  name="familyHistory"
                  options={[
                    { value: "diabetes", label: "Diabetes" },
                    { value: "heart-disease", label: "Heart disease" },
                    { value: "thyroid", label: "Thyroid" },
                    { value: "none", label: "None" },
                  ]}
                  mutualExclusive
                />
                <div className="mt-2">
                  <input
                    type="text"
                    name="familyHistoryOther"
                    value={formData.familyHistoryOther}
                    onChange={handleInputChange}
                    placeholder="Other family history..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current medications/supplements
                  </label>
                  <textarea
                    name="medications"
                    value={formData.medications}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="List current medications and supplements..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recent lab reports/health checkups
                  </label>
                  <textarea
                    name="labReports"
                    value={formData.labReports}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Recent blood tests, health indicators..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Energy levels throughout the day
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    name="energyLevels"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.energyLevels}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Very Low</span>
                    <span>Moderate</span>
                    <span>Very High</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stress levels
                </label>
                <div className="px-2">
                  <input
                    type="range"
                    name="stressLevels"
                    min="1"
                    max="5"
                    step="1"
                    value={formData.stressLevels}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ayurvedic Constitutional Assessment */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Circle className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Ayurvedic Constitutional Assessment
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Body frame
                </label>
                <RadioGroup
                  name="bodyFrame"
                  options={[
                    { value: "thin", label: "Thin/Small frame" },
                    { value: "medium", label: "Medium frame" },
                    { value: "large", label: "Large/Heavy frame" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Skin type
                </label>
                <RadioGroup
                  name="skinType"
                  options={[
                    { value: "dry", label: "Dry, rough" },
                    { value: "oily", label: "Oily, warm" },
                    { value: "normal", label: "Smooth, cool" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hair type
                </label>
                <RadioGroup
                  name="hairType"
                  options={[
                    { value: "dry", label: "Dry, brittle" },
                    { value: "fine", label: "Fine, early graying" },
                    { value: "thick", label: "Thick, lustrous" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Appetite pattern
                </label>
                <RadioGroup
                  name="appetitePattern"
                  options={[
                    { value: "variable", label: "Variable/irregular" },
                    { value: "strong", label: "Strong/sharp" },
                    { value: "slow", label: "Slow/steady" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personality traits (select all that apply)
                </label>
                <CheckboxGroup
                  name="personalityTraits"
                  options={[
                    { value: "creative", label: "Creative" },
                    { value: "quick-thinking", label: "Quick thinking" },
                    { value: "anxious", label: "Anxious" },
                    { value: "ambitious", label: "Ambitious" },
                    { value: "focused", label: "Focused" },
                    { value: "irritable", label: "Irritable" },
                    { value: "calm", label: "Calm" },
                    { value: "steady", label: "Steady" },
                    { value: "slow-to-change", label: "Slow to change" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weather preference
                </label>
                <RadioGroup
                  name="weatherPreference"
                  options={[
                    { value: "warm", label: "Prefer warm weather" },
                    { value: "cool", label: "Prefer cool weather" },
                    { value: "moderate", label: "Prefer moderate weather" },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Goals & Preferences */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Target className="w-6 h-6 text-green-700" />
              <h2 className="text-xl font-semibold text-gray-800">
                Goals & Preferences
              </h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary health goals
                </label>
                <CheckboxGroup
                  name="healthGoals"
                  options={[
                    { value: "weight-loss", label: "Weight loss" },
                    { value: "weight-gain", label: "Weight gain" },
                    { value: "digestive-health", label: "Digestive health" },
                    { value: "energy-boost", label: "Energy boost" },
                    { value: "stress-management", label: "Stress management" },
                    { value: "skin-health", label: "Skin health" },
                    { value: "immunity", label: "Immunity boost" },
                    { value: "sleep-quality", label: "Sleep quality" },
                    { value: "overall-wellness", label: "Overall wellness" },
                  ]}
                />
                <div className="mt-2">
                  <input
                    type="text"
                    name="healthGoalsOther"
                    value={formData.healthGoalsOther}
                    onChange={handleInputChange}
                    placeholder="Other goals..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal preparation time
                </label>
                <RadioGroup
                  name="mealPrepTime"
                  options={[
                    { value: "quick", label: "Quick (15-30 min)" },
                    { value: "moderate", label: "Moderate (30-60 min)" },
                    { value: "elaborate", label: "Elaborate (60+ min)" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget preference
                </label>
                <RadioGroup
                  name="budgetPreference"
                  options={[
                    { value: "economical", label: "Economical" },
                    { value: "moderate", label: "Moderate" },
                    { value: "premium", label: "Premium ingredients okay" },
                  ]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional preferences/notes
                </label>
                <textarea
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-500 focus:border-transparent"
                  placeholder="Any food allergies, preferences, or additional information you'd like to share..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="text-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-lg shadow-lg transform transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5" />
                <span>{isSubmitting ? "Submitting..." : "Submit"}</span>
              </div>
            </button>
          </div>
        </form>

        {/* Success Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Assessment Submitted Successfully!
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Thank you for completing the Ayurvedic health assessment. Your
                  personalized profile will be generated based on your
                  responses.
                </p>
                <button
                  onClick={closeModal}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AyurvedicHealthAssessment;
