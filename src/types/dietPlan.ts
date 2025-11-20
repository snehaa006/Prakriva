// src/types/dietPlan.ts
import { Timestamp } from 'firebase/firestore';

// Food item interface from your context
export interface Food {
  Food_Item: string;
  Category: string;
  Calories: string;
  Protein: string;
  Fat: string;
  Carbs: string;
  Vegetarian: "Yes" | "No";
  Vegan: "Yes" | "No";
  Dosha_Vata: "Pacifying" | "Aggravating" | "Neutral";
  Dosha_Pitta: "Pacifying" | "Aggravating" | "Neutral";
  Dosha_Kapha: "Pacifying" | "Aggravating" | "Neutral";
  Food_Group: string;
}

// Diet plan row interface for table display
export interface DietPlanRow {
  id: string;
  time: string;
  meal: string;
  foodItem: string;
  preparation: string;
  quantity: string;
  benefits: string;
  doshaBalance: "vata" | "pitta" | "kapha" | "tridosh";
  restrictions?: string;
}

// Meal structure for different planning periods
export interface DailyMeals {
  Breakfast: Food[];
  Lunch: Food[];
  Dinner: Food[];
  Snack: Food[];
}

export interface WeeklyMeals {
  [day: string]: DailyMeals;
}

export interface MonthlyDayMeal {
  day: number;
  meals: DailyMeals;
}

export interface MonthlyMeals {
  [month: string]: MonthlyDayMeal[];
}

// Complete meal plan structure
export interface MealPlans {
  Daily: DailyMeals;
  Weekly: WeeklyMeals;
  Monthly: MonthlyMeals;
}

// Firebase document structure for saved diet plans
export interface SavedDietPlan {
  id: string;
  patientName: string;
  planDuration: string;
  planType: string;
  meals: MealPlans;
  createdAt: Timestamp;
  lastModified: Timestamp;
  activeFilter: "Daily" | "Weekly" | "Monthly";
  totalMeals: number;
}

// Plan types for selection
export type PlanType = 
  | "weight-management" 
  | "detox" 
  | "digestive-health" 
  | "immunity-boost" 
  | "diabetes-management";

// Plan durations for selection  
export type PlanDuration = "7 days" | "14 days" | "21 days" | "30 days";

// Dosha balance types
export type DoshaBalance = "vata" | "pitta" | "kapha" | "tridosh";

// Meal types
export type MealType = 
  | "Early Morning" 
  | "Breakfast" 
  | "Mid Morning" 
  | "Lunch" 
  | "Afternoon Snack" 
  | "Evening Snack" 
  | "Dinner" 
  | "Before Bed";

// Filter options for food explorer
export interface FoodFilters {
  search: string;
  category: string;
  foodGroup: string;
  doshaFilter: string;
  dietaryFilter: string;
  sortBy: "name" | "calories" | "protein";
}

// Nutrition summary interface
export interface NutritionSummary {
  Calories: number;
  Protein: number;
  Fat: number;
  Carbs: number;
}

// Firebase error handling
export interface FirebaseError {
  code: string;
  message: string;
}

// Food context interface
export interface FoodContextType {
  foods: Food[];
  selectedFoods: Food[];
  addToSelectedFoods: (food: Food) => void;
  removeFromSelectedFoods: (food: Food) => void;
  clearSelectedFoods: () => void;
  isLoading: boolean;
  error: string | null;
}