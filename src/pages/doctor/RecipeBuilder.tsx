import React, { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useFoodContext } from "@/context/FoodContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, Sparkles, Leaf, Target, Clock, User, Heart } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { toast } from "sonner";
import { getDoc, doc, setDoc, serverTimestamp, query, collection, where, getDocs } from "firebase/firestore";
import { addDoc } from "firebase/firestore";

// Import the Ayurnutrigenomics generator
import AyurnutrigenomicsDietGenerator, { formatDietPlanForDisplay } from './ayurnutrigenomics-generator';

const mealSlots = ["Breakfast", "Lunch", "Dinner", "Snack"];
const weekDays = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
];

const RecipeBuilder = () => {
  const [aiPlan, setAiPlan] = useState(null);
  const [ayurPlan, setAyurPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ayurLoading, setAyurLoading] = useState(false);
  const [patientProfile, setPatientProfile] = useState(null);

  const { selectedFoods } = useFoodContext();

  // Track selected filter
  const [activeFilter, setActiveFilter] = useState("Daily");

  // Save form state
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [planDuration, setPlanDuration] = useState("7 days");
  const [planType, setPlanType] = useState("weight-management");
  const [saving, setSaving] = useState(false);

  // Meal plans
  const [mealPlans, setMealPlans] = useState({
    Daily: { Breakfast: [], Lunch: [], Dinner: [], Snack: [] },
    Weekly: weekDays.reduce((acc, day) => {
      acc[day] = { Breakfast: [], Lunch: [], Dinner: [], Snack: [] };
      return acc;
    }, {}),
  });

  // Palette
  const [paletteFoods, setPaletteFoods] = useState([...selectedFoods]);

  const handleDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const updatedMealPlans = JSON.parse(JSON.stringify(mealPlans));
    const updatedPalette = [...paletteFoods];
    let draggedFood;

    // Get dragged item
    if (source.droppableId === "palette") {
      draggedFood = updatedPalette[source.index];
    } else {
      const path = source.droppableId.split("__");
      if (path[0] === "Daily") {
        draggedFood = updatedMealPlans.Daily[path[1]][source.index];
      } else if (path[0] === "Weekly") {
        draggedFood = updatedMealPlans.Weekly[path[1]][path[2]][source.index];
      }
    }

    // Remove from source
    if (source.droppableId === "palette") {
      updatedPalette.splice(source.index, 1);
    } else {
      const path = source.droppableId.split("__");
      if (path[0] === "Daily") {
        updatedMealPlans.Daily[path[1]].splice(source.index, 1);
      } else if (path[0] === "Weekly") {
        updatedMealPlans.Weekly[path[1]][path[2]].splice(source.index, 1);
      }
    }

    // Add to destination
    if (destination.droppableId === "palette") {
      updatedPalette.splice(destination.index, 0, draggedFood);
    } else {
      const path = destination.droppableId.split("__");
      if (path[0] === "Daily") {
        updatedMealPlans.Daily[path[1]].splice(destination.index, 0, draggedFood);
      } else if (path[0] === "Weekly") {
        updatedMealPlans.Weekly[path[1]][path[2]].splice(destination.index, 0, draggedFood);
      }
    }

    setMealPlans(updatedMealPlans);
    setPaletteFoods(updatedPalette);
  };

  // FIXED: Patient profile fetching using the same logic as Patients.tsx
  const fetchPatientProfileWithAssessment = async (patientId) => {
    console.log("🔍 STARTING: Fetch patient profile for ID:", patientId);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("❌ No authenticated user");
        return null;
      }

      // Get accepted consultation requests (same as Patients.tsx)
      console.log("🔍 Fetching accepted consultation requests...");
      
      const consultationQuery = query(
        collection(db, "consultationRequests"),
        where("doctorId", "==", currentUser.uid),
        where("status", "==", "accepted")
      );
      
      const consultationSnapshot = await getDocs(consultationQuery);
      console.log("📊 Total accepted consultation requests:", consultationSnapshot.size);
      
      // Process each consultation request like Patients.tsx does
      const patientsData = [];
      
      for (const docSnapshot of consultationSnapshot.docs) {
        const data = docSnapshot.data();
        console.log("📋 Processing consultation request:", docSnapshot.id);
        
        // Start with basic profile from consultation request
        let enhancedPatientProfile = data.fullPatientProfile || {
          name: data.patientName || 'Unknown Patient',
          patientId: null // Will be populated from patients collection
        };

        // Try to fetch complete patient data from patients collection (same as Patients.tsx)
        try {
          if (data.patientId) {
            console.log("🔍 Fetching enhanced patient data from patients collection for:", data.patientId);
            
            const patientDocRef = doc(db, 'patients', data.patientId);
            const patientDoc = await getDoc(patientDocRef);
            
            if (patientDoc.exists()) {
              const patientData = patientDoc.data();
              console.log("✅ Enhanced patient data found:", {
                patientId: patientData.patientId,
                name: patientData.name,
                hasAssessmentData: !!patientData.assessmentData
              });
              
              // Merge exactly like Patients.tsx does (lines 122-139)
              enhancedPatientProfile = {
                ...enhancedPatientProfile,
                patientId: patientData.patientId || data.patientId, // This is where custom P001, P012 IDs come from!
                name: patientData.name || enhancedPatientProfile.name,
                assessmentData: patientData.assessmentData || enhancedPatientProfile.assessmentData,
                registrationDate: patientData.registrationDate || patientData.createdAt,
                profileCompleted: patientData.profileCompleted,
                status: patientData.status || 'active',
                ...(patientData.assessmentData && {
                  gender: patientData.assessmentData.gender || enhancedPatientProfile.gender,
                  phoneNumber: enhancedPatientProfile.phoneNumber || patientData.assessmentData.phoneNumber,
                  address: patientData.assessmentData.location || enhancedPatientProfile.address,
                })
              };
              
              console.log("📋 Enhanced profile patientId:", enhancedPatientProfile.patientId);
            } else {
              console.log("❌ No enhanced patient document found for Firebase UID:", data.patientId);
            }
          }
        } catch (patientFetchError) {
          console.warn('Could not fetch enhanced patient data:', patientFetchError);
        }
        
        patientsData.push({
          firebaseId: data.patientId,
          customPatientId: enhancedPatientProfile.patientId,
          patientName: data.patientName,
          fullPatientProfile: enhancedPatientProfile
        });
      }
      
      // Now search for the patient using the custom patient ID
      console.log("📋 Available patients with custom IDs:");
      patientsData.forEach(patient => {
        console.log(`  - ${patient.patientName}: Firebase ID = ${patient.firebaseId}, Custom ID = ${patient.customPatientId}`);
      });
      
      console.log("🔍 Searching for Patient ID:", patientId);
      
      // Find patient by custom patient ID
      const foundPatient = patientsData.find(patient => 
        patient.customPatientId === patientId
      );
      
      if (!foundPatient) {
        // Try Firebase UID as fallback
        const fallbackPatient = patientsData.find(patient => 
          patient.firebaseId === patientId
        );
        
        if (fallbackPatient) {
          console.log("✅ Found patient by Firebase UID:", fallbackPatient.firebaseId);
          console.log("💡 Note: Custom patient ID for this patient is:", fallbackPatient.customPatientId);
        } else {
          console.log("❌ No patient found with ID:", patientId);
          console.log("💡 Available custom patient IDs:", patientsData.map(p => p.customPatientId).filter(Boolean));
          console.log("💡 Available Firebase IDs:", patientsData.map(p => p.firebaseId));
          return null;
        }
        
        return createPatientProfile(fallbackPatient);
      }
      
      console.log("✅ Found patient by custom patient ID:", foundPatient.customPatientId);
      return createPatientProfile(foundPatient);
      
    } catch (error) {
      console.error("❌ ERROR in fetchPatientProfileWithAssessment:", error);
      return null;
    }
  };

  // Helper function to create and validate patient profile
  const createPatientProfile = (patientData) => {
    const profile = {
      ...patientData.fullPatientProfile,
      patientId: patientData.customPatientId || patientData.firebaseId,
      name: patientData.patientName || patientData.fullPatientProfile.name,
    };
    
    // If assessmentData exists, merge it to top level for Ayurvedic generator
    if (patientData.fullPatientProfile.assessmentData) {
      console.log("📋 Assessment data keys:", Object.keys(patientData.fullPatientProfile.assessmentData));
      Object.assign(profile, patientData.fullPatientProfile.assessmentData);
      console.log("✅ Assessment data merged to profile top level");
    }
    
    // Validate required fields for Ayurvedic assessment
    const requiredFields = ['bodyFrame', 'skinType', 'appetitePattern'];
    const missingFields = requiredFields.filter(field => !profile[field]);
    
    if (missingFields.length > 0) {
      console.log("❌ Missing required assessment fields:", missingFields);
      console.log("📋 Available assessment fields:", Object.keys(profile).filter(key => 
        ['bodyFrame', 'skinType', 'hairType', 'appetitePattern', 'energyLevels', 'stressLevels'].includes(key)
      ));
      
      return {
        ...profile,
        missingFields: missingFields,
        incomplete: true
      };
    }
    
    console.log("✅ All required assessment fields present - returning complete profile");
    console.log("📋 Final profile summary:", {
      name: profile.name,
      patientId: profile.patientId,
      bodyFrame: profile.bodyFrame,
      skinType: profile.skinType,
      appetitePattern: profile.appetitePattern
    });
    
    return profile;
  };

  // Generate Ayurnutrigenomics-based diet plan
  const handleGenerateAyurPlan = async () => {
    if (!patientId.trim()) {
      toast.error("Please enter patient ID");
      return;
    }

    try {
      setAyurLoading(true);
      console.log("🌿 Generating Ayurnutrigenomics diet plan for patient:", patientId);

      // Fetch patient profile with assessment data
      const profile = await fetchPatientProfileWithAssessment(patientId.trim());
      
      if (!profile) {
        toast.error("Patient not found. Please check the patient ID and ensure the patient is in your accepted consultations.");
        return;
      }

      if (!profile.name) {
        toast.error("Patient profile is incomplete - missing basic information.");
        return;
      }

      // Check for incomplete assessment
      if (profile.incomplete && profile.missingFields) {
        toast.error(`Patient assessment is incomplete. Missing: ${profile.missingFields.join(', ')}. Please ask the patient to complete their Ayurvedic health assessment.`);
        return;
      }

      // Validate required assessment fields
      if (!profile.bodyFrame || !profile.skinType || !profile.appetitePattern) {
        console.log("📋 Available profile fields:", Object.keys(profile));
        toast.error("Patient assessment data is incomplete. Required fields: body frame, skin type, and appetite pattern. Please ensure the patient has completed the Ayurvedic health assessment.");
        return;
      }

      setPatientProfile(profile);
      setPatientName(profile.name);

      console.log("🌿 Patient profile validated, generating plan...");
      console.log("📋 Profile summary:", {
        name: profile.name,
        bodyFrame: profile.bodyFrame,
        skinType: profile.skinType,
        appetitePattern: profile.appetitePattern,
        age: profile.age,
        gender: profile.gender
      });

      // Initialize the Ayurnutrigenomics generator
      const generator = new AyurnutrigenomicsDietGenerator();
      
      // Generate the diet plan
      const days = parseInt(planDuration.split(' ')[0]);
      const rawPlan = generator.generateDietPlan(profile, days);
      
      if (!rawPlan.success) {
        throw new Error(rawPlan.error || "Failed to generate diet plan");
      }

      // Format the plan for display
      const formattedPlan = formatDietPlanForDisplay(rawPlan);
      
      setAyurPlan({
        raw: rawPlan,
        formatted: formattedPlan,
        patientInfo: {
          name: profile.name,
          primaryDosha: rawPlan.primaryDosha,
          healthFocus: rawPlan.healthAnalysis.primaryConcerns,
          age: profile.age || 'Not specified',
          gender: profile.gender || 'Not specified'
        }
      });

      toast.success(`Ayurnutrigenomics diet plan generated successfully! Primary dosha: ${rawPlan.primaryDosha.toUpperCase()}`);

    } catch (error) {
      console.error("❌ Error generating Ayurnutrigenomics plan:", error);
      toast.error(error.message || "Failed to generate Ayurnutrigenomics plan");
    } finally {
      setAyurLoading(false);
    }
  };

  // Original AI plan generation (keeping for comparison/backup)
  const handleGenerateAIPlan = async () => {
    if (!patientId.trim()) {
      toast.error("Please enter patient ID");
      return;
    }

    try {
      setLoading(true);

      if (!auth.currentUser) {
        toast.error("Please log in first");
        return;
      }

      console.log("🔍 Fetching patient profile for AI plan generation:", patientId);

      const profile = await fetchPatientProfileWithAssessment(patientId.trim());

      if (!profile) {
        toast.error("Patient profile not found.");
        return;
      }

      const token = await getIdToken(auth.currentUser, true);
      const requestPayload = {
        user_profile: profile,
        days: parseInt(planDuration.split(' ')[0]),
        model: "gpt-4",
      };

      console.log("📤 Sending AI plan payload:", requestPayload);

      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/generateMealPlan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to generate AI meal plan");
      }

      const data = await response.json();
      console.log("✅ AI meal plan response:", data);

      if (!data.plan) {
        throw new Error("No meal plan received from AI API");
      }

      setAiPlan(data.plan);
      toast.success(data.message || "AI meal plan generated successfully!");

    } catch (error) {
      console.error("❌ Error generating AI plan:", error);
      toast.error(error.message || "Failed to generate AI meal plan");
    } finally {
      setLoading(false);
    }
  };

  // Save plan function - updated to handle both AI and Ayur plans
  const handleSavePlan = async (status = "draft", planType = "ayur") => {
    const planToSave = planType === "ayur" ? ayurPlan : aiPlan;
    
    if (!planToSave) {
      toast.error(`No ${planType === "ayur" ? "Ayurnutrigenomics" : "AI"} plan generated to save.`);
      return;
    }

    if (!patientId.trim() || !patientName.trim()) {
      toast.error("Please enter patient ID and name");
      return;
    }

    try {
      setSaving(true);

      const planId = crypto.randomUUID();

      const dietPlanData = {
        patientName,
        patientId: patientId.trim(),
        planDuration,
        planType: planType === "ayur" ? "ayurnutrigenomics" : "ai-generated",
        status,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
        source: planType === "ayur" ? "ayurnutrigenomics" : "ai",
        planData: planToSave,
        patientProfile: patientProfile,
        activeFilter,
      };

      await setDoc(
        doc(db, `patients/${patientId.trim()}/dietPlans/${planId}`),
        dietPlanData
      );

      toast.success(`${planType === "ayur" ? "Ayurnutrigenomics" : "AI"} plan saved successfully! (${status})`);

    } catch (err) {
      console.error("Error saving plan:", err);
      toast.error("Failed to save plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderFoodCard = (food, index, draggableId) => (
    <Draggable key={draggableId} draggableId={draggableId} index={index}>
      {(provided) => (
        <div
          className="p-2 mb-2 bg-white border rounded text-sm shadow-sm cursor-grab"
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <div className="font-medium">{food.Food_Item || food.name}</div>
          <div className="text-xs text-gray-500">
            {food.Calories || food.calories} cal • {food.Protein || food.protein}g protein • {food.Fat || food.fat}g fat • {food.Carbs || food.carbs}g carbs
          </div>
        </div>
      )}
    </Draggable>
  );

  // Regular save meal plan function for manual plans
  const saveMealPlan = async () => {
    if (!patientId.trim() || !patientName.trim()) {
      toast.error("Please enter patient ID and name");
      return;
    }

    const hasAnyMeals =
      Object.values(mealPlans.Daily).some((foods) => foods.length > 0) ||
      Object.values(mealPlans.Weekly).some((dayMeals) =>
        Object.values(dayMeals).some((foods) => foods.length > 0)
      );

    if (!hasAnyMeals) {
      toast.error("Please add at least one meal to the plan");
      return;
    }

    setSaving(true);
    try {
      const dietPlanData = {
        patientName,
        patientId: patientId.trim(),
        planDuration,
        planType: "manual",
        meals: mealPlans,
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
        activeFilter,
        source: "manual",
        totalMeals:
          Object.values(mealPlans.Daily).flat().length +
          Object.values(mealPlans.Weekly)
            .flatMap((dayMeals) => Object.values(dayMeals))
            .flat().length,
      };

      const docRef = await addDoc(
        collection(db, "patients", patientId.trim(), "dietPlans"),
        dietPlanData
      );

      toast.success(`Manual diet plan saved successfully! ID: ${docRef.id}`);
    } catch (error) {
      console.error("Error saving diet plan:", error);
      toast.error("Failed to save diet plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate nutrition totals
  const nutritionTotals = useMemo(() => {
    const items = [];

    if (activeFilter === "Daily") {
      Object.values(mealPlans.Daily).forEach((foods) => {
        items.push(...foods);
      });
    } else if (activeFilter === "Weekly") {
      Object.values(mealPlans.Weekly).forEach((dayMeals) => {
        Object.values(dayMeals).forEach((foods) => items.push(...foods));
      });
    }

    return {
      Calories: items.reduce((acc, f) => acc + (parseFloat(f.Calories || f.calories) || 0), 0),
      Protein: items.reduce((acc, f) => acc + (parseFloat(f.Protein || f.protein) || 0), 0),
      Fat: items.reduce((acc, f) => acc + (parseFloat(f.Fat || f.fat) || 0), 0),
      Carbs: items.reduce((acc, f) => acc + (parseFloat(f.Carbs || f.carbs) || 0), 0),
    };
  }, [mealPlans, activeFilter]);

  // Render Ayurnutrigenomics plan display
  const renderAyurPlan = () => {
    if (!ayurPlan) return null;

    const { formatted, patientInfo, raw } = ayurPlan;

    return (
      <div className="mt-6 space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Leaf className="w-6 h-6 text-green-600" />
              <div>
                <CardTitle className="text-green-800">Ayurnutrigenomics Diet Plan</CardTitle>
                <p className="text-sm text-green-600">Generated using traditional Ayurvedic principles</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Patient Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="font-medium">{patientInfo.name}</p>
                  <p className="text-sm text-gray-500">{patientInfo.age} • {patientInfo.gender}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="font-medium">Primary Dosha</p>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    {patientInfo.primaryDosha}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                <div>
                  <p className="font-medium">Health Focus</p>
                  <p className="text-sm text-gray-600">
                    {patientInfo.healthFocus.length > 0 ? patientInfo.healthFocus.join(", ") : "General wellness"}
                  </p>
                </div>
              </div>
            </div>

            {/* Weekly Plan */}
            <div className="grid gap-4">
              <h4 className="font-semibold text-gray-800">Weekly Meal Plan</h4>
              {Object.entries(formatted.weeklyPlan).map(([day, meals]) => (
                <div key={day} className="border rounded-lg p-4 bg-white">
                  <h5 className="font-medium mb-3 text-gray-800">{day}</h5>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
                      const meal = meals[mealType];
                      return (
                        <div key={mealType} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="font-medium text-sm capitalize">{mealType}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded text-xs">
                            <div className="space-y-1">
                              {meal.items.map((item, idx) => (
                                <div key={idx}>{item}</div>
                              ))}
                            </div>
                            <div className="mt-2 pt-2 border-t text-gray-500">
                              {meal.calories} cal
                              {meal.cookingMethod && (
                                <div className="text-xs mt-1">Method: {meal.cookingMethod}</div>
                              )}
                              {meal.spices && meal.spices.length > 0 && (
                                <div className="text-xs">Spices: {meal.spices.join(", ")}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h5 className="font-medium mb-2">Daily Routine</h5>
                <ul className="text-sm space-y-1">
                  {raw.recommendations.dailyRoutine.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="font-medium mb-2">Food Guidelines</h5>
                <ul className="text-sm space-y-1">
                  {raw.recommendations.foodGuidelines.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-600 mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => handleSavePlan("draft", "ayur")} 
                disabled={saving}
                variant="outline"
              >
                {saving ? "Saving..." : "Save Draft"}
              </Button>
              <Button 
                onClick={() => handleSavePlan("final", "ayur")} 
                disabled={saving}
              >
                {saving ? "Saving..." : "Approve & Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header with Save Form */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Recipe Builder</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Diet Plan Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="patient-id">Patient ID</Label>
                <Input
                  id="patient-id"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="Enter patient ID (e.g., P001)"
                />
              </div>
              <div>
                <Label htmlFor="patient-name">Patient Name</Label>
                <Input
                  id="patient-name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>
              <div>
                <Label htmlFor="plan-duration">Plan Duration</Label>
                <Select value={planDuration} onValueChange={setPlanDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7 days">7 Days</SelectItem>
                    <SelectItem value="14 days">14 Days</SelectItem>
                    <SelectItem value="21 days">21 Days</SelectItem>
                    <SelectItem value="30 days">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="plan-type">Plan Type</Label>
                <Select value={planType} onValueChange={setPlanType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight-management">Weight Management</SelectItem>
                    <SelectItem value="detox">Detox Plan</SelectItem>
                    <SelectItem value="digestive-health">Digestive Health</SelectItem>
                    <SelectItem value="immunity-boost">Immunity Boost</SelectItem>
                    <SelectItem value="diabetes-management">Diabetes Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={saveMealPlan}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Generation Buttons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">AI-Powered Plan Generation</CardTitle>
            <p className="text-sm text-gray-600">Generate personalized diet plans using AI or Ayurvedic principles</p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button 
                onClick={handleGenerateAyurPlan} 
                disabled={ayurLoading || !patientId.trim()}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {ayurLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Leaf className="w-4 h-4" />
                    Generate Ayurnutrigenomics Plan
                  </>
                )}
              </Button>
              {/* <Button 
                onClick={handleGenerateAIPlan} 
                disabled={loading || !patientId.trim()}
                variant="outline"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate AI Plan
                  </>
                )}
              </Button> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Render Ayurnutrigenomics Plan */}
      {renderAyurPlan()}

      {/* Render AI Plan */}
      {aiPlan && (
        <div className="mt-4 p-4 border rounded">
          <h3 className="font-bold mb-2">AI Generated Plan</h3>
          <pre className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">
            {JSON.stringify(aiPlan, null, 2)}
          </pre>
          <div className="flex gap-2 mt-3">
            <Button onClick={() => handleSavePlan("draft", "ai")} disabled={saving}>
              {saving ? "Saving..." : "Save AI Draft"}
            </Button>
            <Button onClick={() => handleSavePlan("final", "ai")} disabled={saving}>
              {saving ? "Saving..." : "Approve AI Plan"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Left: Food Palette */}
          <Droppable droppableId="palette">
            {(provided) => (
              <div
                className="w-1/4 p-4 bg-gray-100 rounded"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <h2 className="text-lg font-bold mb-4">Food Palette</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {paletteFoods.length} foods available
                </p>
                {paletteFoods.map((food, index) =>
                  renderFoodCard(food, index, `palette-${index}`)
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Right: Planner */}
          <div className="w-3/4">
            {/* Filter Switch */}
            <div className="flex gap-4 mb-6">
              {["Daily", "Weekly"].map((option) => (
                <button
                  key={option}
                  className={`px-4 py-2 rounded ${
                    activeFilter === option
                      ? "bg-green-500 text-white"
                      : "bg-gray-200"
                  }`}
                  onClick={() => setActiveFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Daily Planner */}
            {activeFilter === "Daily" && (
              <div className="grid grid-cols-4 gap-4">
                {mealSlots.map((slot) => (
                  <Droppable key={slot} droppableId={`Daily__${slot}`}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-4 bg-gray-50 rounded border"
                      >
                        <h3 className="font-bold mb-2">{slot}</h3>
                        <p className="text-xs text-gray-500mb-2">
                          {mealPlans.Daily[slot].length} items
                        </p>
                        {mealPlans.Daily[slot].map((food, idx) =>
                          renderFoodCard(food, idx, `Daily-${slot}-${idx}`)
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            )}

            {/* Weekly Planner */}
            {activeFilter === "Weekly" && (
              <div className="grid grid-cols-2 gap-4">
                {weekDays.map((day) => (
                  <div key={day} className="p-4 border rounded">
                    <h3 className="font-bold mb-2">{day}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {mealSlots.map((slot) => (
                        <Droppable
                          key={slot}
                          droppableId={`Weekly__${day}__${slot}`}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className="p-2 bg-gray-50 rounded border"
                            >
                              <h4 className="text-sm font-semibold">{slot}</h4>
                              <p className="text-xs text-gray-400">
                                {mealPlans.Weekly[day][slot].length} items
                              </p>
                              {mealPlans.Weekly[day][slot].map((food, idx) =>
                                renderFoodCard(
                                  food,
                                  idx,
                                  `Weekly-${day}-${slot}-${idx}`
                                )
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Nutrition Summary */}
            <div className="mt-6 p-4 bg-green-50 border rounded">
              <h2 className="text-lg font-bold mb-2">
                Nutrition Totals ({activeFilter})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {Math.round(nutritionTotals.Calories)}
                  </p>
                  <p className="text-sm text-gray-600">Calories</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round(nutritionTotals.Protein)}
                  </p>
                  <p className="text-sm text-gray-600">Protein (g)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {Math.round(nutritionTotals.Fat)}
                  </p>
                  <p className="text-sm text-gray-600">Fat (g)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(nutritionTotals.Carbs)}
                  </p>
                  <p className="text-sm text-gray-600">Carbs (g)</p>
                </div>
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
};

export default RecipeBuilder;