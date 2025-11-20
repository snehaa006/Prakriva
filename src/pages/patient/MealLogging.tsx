import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Utensils,
  Heart,
  Zap,
  Activity,
  Sun,
  Moon,
  Coffee,
  Search,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
  ChefHat
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
// Firebase imports
import { collection, query, orderBy, getDocs, doc, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Meal = {
  id: string;
  type: "breakfast" | "lunch" | "snack" | "dinner";
  name: string;
  time: string;
  calories: number;
  status: "eaten" | "skipped" | "pending";
  notes?: string;
  preparation?: string;
  benefits?: string;
  doshaBalance?: string;
  quantity?: string;
};

type RecipeInfo = {
  loading: boolean;
  recipe?: string;
  youtube?: string;
  error?: string;
};

type SavedDietPlan = {
  id: string;
  patientName: string;
  planDuration: string;
  planType: string;
  meals: any;
  createdAt: Timestamp;
  totalMeals: number;
  activeFilter?: string;
};

const MealLogging = () => {
  const navigate = useNavigate();
  
  // Patient search and diet plan state
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [savedPlans, setSavedPlans] = useState<SavedDietPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavedDietPlan | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(false);
  
  // Meal logging state
  const [todaysMeals, setTodaysMeals] = useState<Meal[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [digestionRating, setDigestionRating] = useState([3]);
  const [moodRating, setMoodRating] = useState([3]);
  const [energyRating, setEnergyRating] = useState([3]);
  const [feedbackNotes, setFeedbackNotes] = useState("");

  // Recipe search state
  const [searchFood, setSearchFood] = useState("");
  const [recipeData, setRecipeData] = useState<RecipeInfo>({ loading: false });

  // Mock recipes for fallback
  const mockRecipes: Record<string, { recipe: string; youtube?: string }> = {
    "oatmeal": { recipe: "Boil oats in milk, add honey and almonds." },
    "quinoa": { recipe: "Cook quinoa, mix with vegetables, and drizzle olive oil.", youtube: "https://www.youtube.com/watch?v=abc123" },
    "fruit salad": { recipe: "Chop seasonal fruits and mix with honey and lemon juice." }
  };

  // Convert Firebase meal plans to Meal format
  const convertDietPlanToMeals = (mealPlans: any, activeFilter: string = "Daily"): Meal[] => {
    const meals: Meal[] = [];
    let mealCounter = 1;

    const timeSlotMappings: { [key: string]: string } = {
      "Breakfast": "08:00 AM",
      "Lunch": "12:30 PM", 
      "Dinner": "07:00 PM",
      "Snack": "04:00 PM",
      "Early Morning": "06:30 AM",
      "Mid Morning": "10:00 AM",
      "Afternoon Snack": "03:00 PM",
      "Evening Snack": "05:30 PM",
      "Before Bed": "09:30 PM"
    };

    const mealTypeMapping: { [key: string]: "breakfast" | "lunch" | "snack" | "dinner" } = {
      "Breakfast": "breakfast",
      "Early Morning": "breakfast",
      "Lunch": "lunch",
      "Snack": "snack",
      "Mid Morning": "snack",
      "Afternoon Snack": "snack",
      "Evening Snack": "snack",
      "Dinner": "dinner",
      "Before Bed": "dinner"
    };

    if (activeFilter === "Daily" && mealPlans.Daily) {
      Object.entries(mealPlans.Daily).forEach(([mealType, foods]: [string, any]) => {
        if (Array.isArray(foods)) {
          foods.forEach((food: any) => {
            meals.push({
              id: `${mealCounter++}`,
              type: mealTypeMapping[mealType] || "snack",
              name: food.Food_Item || "Unknown Food",
              time: timeSlotMappings[mealType] || "09:00 AM",
              calories: parseInt(food.Calories) || 0,
              status: "pending",
              preparation: food.preparation || `Prepare ${food.Food_Item} as recommended by your Ayurvedic practitioner`,
              benefits: food.benefits || `Nutritional content: ${food.Protein || 0}g protein, ${food.Fat || 0}g fat, ${food.Carbs || 0}g carbs`,
              doshaBalance: food.Dosha_Vata === "Pacifying" ? "Vata Balancing" : 
                           food.Dosha_Pitta === "Pacifying" ? "Pitta Balancing" : 
                           food.Dosha_Kapha === "Pacifying" ? "Kapha Balancing" : "Tridoshic",
              quantity: food.quantity || "1 serving"
            });
          });
        }
      });
    }

    return meals;
  };

  // Fetch saved diet plans for a patient
  const fetchDietPlans = async () => {
    if (!patientId.trim()) {
      toast.error("Please enter a patient ID");
      return;
    }

    setLoadingPlans(true);
    try {
      const q = query(
        collection(db, "patients", patientId, "dietPlans"),
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(q);
      const plans: SavedDietPlan[] = [];
      
      querySnapshot.forEach((doc) => {
        plans.push({
          id: doc.id,
          ...doc.data(),
        } as SavedDietPlan);
      });

      setSavedPlans(plans);
      
      if (plans.length === 0) {
        toast.info("No diet plans found for this patient");
        setTodaysMeals([]); // Clear meals if no plans found
      } else {
        toast.success(`Found ${plans.length} diet plan(s)`);
        // Auto-load the most recent plan
        if (plans[0]) {
          loadDietPlan(plans[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching diet plans:", error);
      toast.error("Failed to fetch diet plans. Please try again.");
      setTodaysMeals([]); // Clear meals on error
    } finally {
      setLoadingPlans(false);
    }
  };

  // Load a specific diet plan
  const loadDietPlan = (plan: SavedDietPlan) => {
    setSelectedPlan(plan);
    setPatientName(plan.patientName);
    
    const meals = convertDietPlanToMeals(plan.meals, plan.activeFilter);
    setTodaysMeals(meals);
    
    toast.success(`Loaded diet plan from ${plan.createdAt.toDate().toLocaleDateString()}`);
  };

  // Update meal status
  const updateMealStatus = (mealId: string, status: "eaten" | "skipped" | "pending", notes?: string) => {
    setTodaysMeals(prev => 
      prev.map(meal => 
        meal.id === mealId 
          ? { ...meal, status, notes: notes || meal.notes }
          : meal
      )
    );
    toast.success(`Meal marked as ${status}`);
  };

  // Save feedback to Firebase
  const saveFeedback = async () => {
    if (!patientId.trim() || !selectedMeal) {
      toast.error("Please select a meal first");
      return;
    }

    try {
      const feedbackData = {
        patientId,
        patientName,
        mealId: selectedMeal,
        mealName: todaysMeals.find(m => m.id === selectedMeal)?.name || "Unknown",
        digestionRating: digestionRating[0],
        moodRating: moodRating[0],
        energyRating: energyRating[0],
        notes: feedbackNotes,
        createdAt: Timestamp.now(),
        date: new Date().toISOString().split('T')[0] // YYYY-MM-DD format
      };

      await addDoc(collection(db, "patients", patientId, "mealFeedback"), feedbackData);
      
      toast.success("Feedback saved successfully!");
      
      // Reset feedback form
      setSelectedMeal(null);
      setDigestionRating([3]);
      setMoodRating([3]);
      setEnergyRating([3]);
      setFeedbackNotes("");
      
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error("Failed to save feedback. Please try again.");
    }
  };

  const getMealIcon = (type: Meal["type"]) => {
    switch (type) {
      case 'breakfast': return Sun;
      case 'lunch': return Utensils;
      case 'snack': return Coffee;
      case 'dinner': return Moon;
      default: return Utensils;
    }
  };

  const getStatusIcon = (status: Meal["status"]) => {
    switch (status) {
      case 'eaten': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'skipped': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: Meal["status"]) => {
    switch (status) {
      case 'eaten': return 'bg-green-50 border-green-200';
      case 'skipped': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getEmojiForRating = (rating: number, type: 'digestion' | 'mood' | 'energy') => {
    if (type === 'digestion') return ['😰', '😕', '😐', '😊', '😄'][rating - 1] || '😐';
    if (type === 'mood') return ['😢', '😟', '😐', '🙂', '😊'][rating - 1] || '😐';
    if (type === 'energy') return ['😴', '🥱', '😐', '⚡', '🚀'][rating - 1] || '😐';
    return '😐';
  };

  // Mock fetch function for recipes
  const fetchRecipe = async () => {
    if (!searchFood) return;
    setRecipeData({ loading: true });
    setTimeout(() => {
      const key = searchFood.toLowerCase();
      if (mockRecipes[key]) {
        setRecipeData({ loading: false, ...mockRecipes[key] });
      } else {
        setRecipeData({ 
          loading: false, 
          error: "Recipe not found", 
          youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(searchFood)}` 
        });
      }
    }, 1000);
  };

  const selectedMealData = selectedMeal ? todaysMeals.find(m => m.id === selectedMeal) : null;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meal Logging & Feedback</h1>
          <p className="text-muted-foreground">Track your personalized Ayurvedic meals and how they make you feel</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/patient/dashboard')}>
          Back to Dashboard
        </Button>
      </div>

      {/* Patient Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Load Patient Diet Plan
          </CardTitle>
          <CardDescription>
            Enter patient details to load their personalized Ayurvedic diet plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="patient-id">Patient ID *</Label>
              <Input
                id="patient-id"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter patient ID"
              />
            </div>
            <div>
              <Label htmlFor="patient-name-display">Patient Name</Label>
              <Input
                id="patient-name-display"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="Will be loaded from plan"
                disabled={!!selectedPlan}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={fetchDietPlans} 
                disabled={loadingPlans || !patientId.trim()} 
                className="w-full gap-2"
              >
                {loadingPlans ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Load Diet Plan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Available Plans */}
          {savedPlans.length > 0 && (
            <div className="mt-4 space-y-2">
              <Label>Available Diet Plans:</Label>
              <div className="flex flex-wrap gap-2">
                {savedPlans.map((plan) => (
                  <Button
                    key={plan.id}
                    size="sm"
                    variant={selectedPlan?.id === plan.id ? "default" : "outline"}
                    onClick={() => loadDietPlan(plan)}
                    className="gap-1"
                  >
                    <Calendar className="w-3 h-3" />
                    {plan.createdAt.toDate().toLocaleDateString()} • {plan.planType}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Current Plan Info */}
          {selectedPlan && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Loaded Plan:</span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                {selectedPlan.patientName} • {selectedPlan.planDuration} • {selectedPlan.planType.replace('-', ' ')} 
                • Created: {selectedPlan.createdAt.toDate().toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Meals Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              Today's Ayurvedic Meals
            </CardTitle>
            <CardDescription>
              {todaysMeals.length > 0 
                ? `${todaysMeals.length} personalized meals from your diet plan` 
                : "Load a patient's diet plan to see their meals"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todaysMeals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Utensils className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No meals loaded</p>
                <p className="text-sm">Enter a patient ID above to load their personalized diet plan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todaysMeals.map((meal) => {
                  const MealIcon = getMealIcon(meal.type);
                  return (
                    <div 
                      key={meal.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${getStatusColor(meal.status)} ${selectedMeal === meal.id ? 'ring-2 ring-primary' : ''}`} 
                      onClick={() => setSelectedMeal(meal.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <MealIcon className="w-5 h-5 text-primary" />
                          <div>
                            <h3 className="font-semibold text-foreground">{meal.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {meal.time} • {meal.calories} calories
                            </p>
                            {meal.doshaBalance && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {meal.doshaBalance}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {getStatusIcon(meal.status)}
                      </div>
                      
                      {/* Meal Details */}
                      {selectedMeal === meal.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          {meal.quantity && (
                            <p className="text-sm"><strong>Quantity:</strong> {meal.quantity}</p>
                          )}
                          {meal.preparation && (
                            <p className="text-sm"><strong>Preparation:</strong> {meal.preparation}</p>
                          )}
                          {meal.benefits && (
                            <p className="text-sm"><strong>Benefits:</strong> {meal.benefits}</p>
                          )}
                          
                          {/* Status Update Buttons */}
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              variant={meal.status === 'eaten' ? 'default' : 'outline'}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMealStatus(meal.id, 'eaten');
                              }}
                              className="gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Eaten
                            </Button>
                            <Button 
                              size="sm" 
                              variant={meal.status === 'skipped' ? 'destructive' : 'outline'}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMealStatus(meal.id, 'skipped');
                              }}
                              className="gap-1"
                            >
                              <XCircle className="w-3 h-3" />
                              Skip
                            </Button>
                            <Button 
                              size="sm" 
                              variant={meal.status === 'pending' ? 'secondary' : 'outline'}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateMealStatus(meal.id, 'pending');
                              }}
                              className="gap-1"
                            >
                              <Clock className="w-3 h-3" />
                              Pending
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card>
          <CardHeader>
            <CardTitle>Post-Meal Feedback</CardTitle>
            <CardDescription>
              {selectedMealData 
                ? `Rate how "${selectedMealData.name}" made you feel`
                : "Select a meal to provide feedback"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!selectedMealData ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Select a meal above to provide feedback</p>
              </div>
            ) : (
              <>
                {/* Selected Meal Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">{selectedMealData.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedMealData.time} • Status: {selectedMealData.status}
                  </p>
                </div>

                {/* Digestion Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" /> 
                      Digestion
                    </label>
                    <span className="text-2xl">{getEmojiForRating(digestionRating[0], 'digestion')}</span>
                  </div>
                  <Slider 
                    value={digestionRating} 
                    onValueChange={setDigestionRating} 
                    max={5} 
                    min={1} 
                    step={1} 
                    className="w-full" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Poor</span>
                    <span>Excellent</span>
                  </div>
                </div>

                {/* Mood Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Heart className="w-4 h-4 text-primary" /> 
                      Mood
                    </label>
                    <span className="text-2xl">{getEmojiForRating(moodRating[0], 'mood')}</span>
                  </div>
                  <Slider 
                    value={moodRating} 
                    onValueChange={setMoodRating} 
                    max={5} 
                    min={1} 
                    step={1} 
                    className="w-full" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                {/* Energy Rating */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" /> 
                      Energy Level
                    </label>
                    <span className="text-2xl">{getEmojiForRating(energyRating[0], 'energy')}</span>
                  </div>
                  <Slider 
                    value={energyRating} 
                    onValueChange={setEnergyRating} 
                    max={5} 
                    min={1} 
                    step={1} 
                    className="w-full" 
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tired</span>
                    <span>Energetic</span>
                  </div>
                </div>

                <Textarea 
                  placeholder="Additional notes about how this meal made you feel..." 
                  value={feedbackNotes} 
                  onChange={(e) => setFeedbackNotes(e.target.value)} 
                  rows={3} 
                />
                
                <Button 
                  className="w-full" 
                  onClick={saveFeedback}
                  disabled={!patientId || !selectedMeal}
                >
                  Save Feedback to Patient Record
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recipe Search Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recipe & Preparation Guide</CardTitle>
            <CardDescription>Search for cooking instructions for your Ayurvedic meals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter food name (e.g., quinoa, oatmeal)..."
                value={searchFood}
                onChange={(e) => setSearchFood(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchRecipe()}
              />
              <Button onClick={fetchRecipe} className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>

            {recipeData.loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <p>Loading recipe...</p>
              </div>
            )}
            
            {recipeData.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{recipeData.error}</p>
              </div>
            )}
            
            {recipeData.recipe && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">Recipe Instructions:</h4>
                <p className="text-green-700">{recipeData.recipe}</p>
              </div>
            )}
            
            {recipeData.youtube && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <a 
                  className="text-blue-600 hover:text-blue-800 underline font-medium" 
                  href={recipeData.youtube} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  → Watch cooking videos on YouTube
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      {todaysMeals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Utensils className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Total Meals</div>
                  <div className="text-2xl font-bold">{todaysMeals.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">Completed</div>
                  <div className="text-2xl font-bold">
                    {todaysMeals.filter(m => m.status === 'eaten').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <div className="font-medium">Pending</div>
                  <div className="text-2xl font-bold">
                    {todaysMeals.filter(m => m.status === 'pending').length}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-medium">Total Calories</div>
                  <div className="text-2xl font-bold">
                    {todaysMeals.reduce((sum, meal) => sum + meal.calories, 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MealLogging;