"""
Pydantic models for request/response validation (Pydantic v2)
"""
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class GenderEnum(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class ActivityLevelEnum(str, Enum):
    SEDENTARY = "sedentary"
    MODERATE = "moderate"
    ACTIVE = "active"


class GoalEnum(str, Enum):
    MAINTENANCE = "maintenance"
    WEIGHT_LOSS = "weight_loss"
    WEIGHT_GAIN = "weight_gain"


class FoodPreferenceEnum(str, Enum):
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    NON_VEGETARIAN = "non_vegetarian"


class DoshaEnum(str, Enum):
    VATA = "vata"
    PITTA = "pitta"
    KAPHA = "kapha"


class UserProfile(BaseModel):
    """User profile with comprehensive validation"""
    
    Patient_ID: Optional[str] = Field(None, description="Unique patient identifier")
    Age: int = Field(..., ge=1, le=120, description="Age in years")
    Gender: GenderEnum = Field(..., description="Gender")
    Weight_kg: float = Field(..., ge=20, le=500, description="Weight in kg")
    Height_cm: float = Field(..., ge=50, le=250, description="Height in cm")
    
    Physical_Activity_Level: ActivityLevelEnum = Field(
        ActivityLevelEnum.MODERATE, description="Physical activity level"
    )
    Goal: GoalEnum = Field(GoalEnum.MAINTENANCE, description="Health goal")
    
    Food_preference: Optional[FoodPreferenceEnum] = Field(
        None, description="Dietary preference"
    )
    Allergies: Optional[str] = Field(None, description="Comma-separated allergies")
    Dietary_Restrictions: Optional[str] = Field(None, description="Comma-separated dietary restrictions")
    Health_Conditions: Optional[str] = Field(None, description="Comma-separated health conditions")
    Medications: Optional[str] = Field(None, description="Current medications")
    
    Body_Frame: Optional[str] = None
    Skin: Optional[str] = None
    Hair: Optional[str] = None
    Appetite: Optional[str] = None
    Sleep: Optional[str] = None
    Energy_Level: Optional[str] = None
    Stress_Response: Optional[str] = None
    Digestion: Optional[str] = None
    
    @field_validator('Allergies', 'Dietary_Restrictions', 'Health_Conditions', 'Medications')
    def validate_comma_separated(cls, v):
        if v and isinstance(v, str):
            return v.strip()
        return v
    
    @property
    def BMI(self) -> float:
        """Calculate BMI"""
        return round(self.Weight_kg / (self.Height_cm / 100) ** 2, 2)


class MealPlanRequest(BaseModel):
    user_profile: UserProfile = Field(..., description="User profile data")
    days: int = Field(7, ge=1, le=30, description="Number of days for meal plan")
    model: str = Field("gpt-4", description="LLM model to use")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Additional preferences")


class DoshaResult(BaseModel):
    dosha: DoshaEnum = Field(..., description="Primary dosha")
    scores: Dict[str, float] = Field(..., description="Dosha scores")
    confidence: float = Field(..., ge=0, le=1, description="Prediction confidence")
    method: str = Field(..., description="Prediction method (ML/LLM/Hybrid)")


class MealItem(BaseModel):
    name: str = Field(..., description="Dish name")
    ingredients: List[str] = Field(..., description="List of ingredients")
    portion: str = Field(..., description="Portion size")
    calories: float = Field(..., ge=0, description="Estimated calories")
    protein: Optional[float] = Field(None, ge=0, description="Protein in grams")
    carbs: Optional[float] = Field(None, ge=0, description="Carbs in grams")
    fat: Optional[float] = Field(None, ge=0, description="Fat in grams")
    reason: Optional[str] = Field(None, description="Ayurvedic reasoning")


class DayMeals(BaseModel):
    breakfast: List[MealItem] = Field(..., description="Breakfast items")
    lunch: List[MealItem] = Field(..., description="Lunch items")
    dinner: List[MealItem] = Field(..., description="Dinner items")
    snacks: Optional[List[MealItem]] = Field(None, description="Snack items")


class MealPlan(BaseModel):
    plan: Dict[str, DayMeals] = Field(..., description="Daily meal plans")
    totals: Dict[str, float] = Field(..., description="Daily calorie totals")
    
    @field_validator('plan')
    def validate_plan_keys(cls, v):
        for key in v.keys():
            if not key.startswith('day_'):
                raise ValueError(f"Invalid plan key: {key}. Must start with 'day_'")
        return v


class MealPlanResponse(BaseModel):
    plan: Union[MealPlan, Dict[str, Any]] = Field(..., description="Generated meal plan")
    dosha: DoshaResult = Field(..., description="Dosha analysis")
    daily_calories: int = Field(..., description="Target daily calories")
    plan_id: Optional[str] = Field(None, description="Saved plan ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class APIResponse(BaseModel):
    success: bool = Field(..., description="Request success status")
    data: Optional[Any] = Field(None, description="Response data")
    message: Optional[str] = Field(None, description="Response message")
    error: Optional[str] = Field(None, description="Error message if any")


class HealthCheck(BaseModel):
    status: str = Field(..., description="Service status")
    version: str = Field(..., description="API version")
    timestamp: str = Field(..., description="Current timestamp")
    dependencies: Dict[str, str] = Field(..., description="Dependency status")
