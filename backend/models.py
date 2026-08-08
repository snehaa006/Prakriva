"""
Pydantic models for request/response validation (Pydantic v2)
"""
import re
from typing import Dict, List, Optional, Union, Any
from pydantic import BaseModel, Field, field_validator, model_validator
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


class YesNoEnum(str, Enum):
    YES = "Yes"
    NO = "No"


class MaternalAssessmentRequest(BaseModel):
    """
    Inputs for the maternal anemia / pregnancy-risk models.

    Age and height come from the profile captured at onboarding (date of birth
    and height); weight and the clinical readings are captured at every visit.
    Anemia status and pregnancy risk are model outputs and are never sent in.
    """

    Patient_ID: Optional[str] = Field(None, description="Unique patient identifier")

    # Carried over from the onboarding profile
    Age: Optional[int] = Field(None, ge=10, le=60, description="Age in years")
    Date_of_Birth: Optional[str] = Field(
        None, description="ISO date of birth; used to derive Age when Age is absent"
    )
    Height_cm: Optional[float] = Field(None, ge=100, le=220, description="Height in cm")

    # Captured at every antenatal visit
    Weight_kg: Optional[float] = Field(None, ge=25, le=200, description="Current weight in kg")
    BMI: Optional[float] = Field(None, ge=10, le=60, description="BMI, if already known")
    Gestational_Week: int = Field(..., ge=1, le=42, description="Weeks of gestation")
    Hemoglobin_g_dL: float = Field(..., ge=2, le=20, description="Hemoglobin in g/dL")
    Iron_Supplement: YesNoEnum = Field(..., description="Currently taking iron supplements")
    Systolic_BP: Optional[int] = Field(None, ge=60, le=250, description="Systolic blood pressure")
    Diastolic_BP: Optional[int] = Field(None, ge=30, le=160, description="Diastolic blood pressure")
    Blood_Pressure: Optional[str] = Field(
        None, description="Blood pressure as 'systolic/diastolic', e.g. '118/76'"
    )

    @field_validator("Blood_Pressure")
    def validate_bp_format(cls, v):
        if v and not re.match(r"^\s*\d{2,3}\s*/\s*\d{2,3}\s*$", v):
            raise ValueError("Blood_Pressure must look like '118/76'")
        return v

    @model_validator(mode="after")
    def validate_required_combinations(self):
        if self.Age is None and not self.Date_of_Birth:
            raise ValueError("Provide either Age or Date_of_Birth")
        if self.BMI is None and (self.Weight_kg is None or self.Height_cm is None):
            raise ValueError("Provide either BMI, or both Weight_kg and Height_cm")
        if not self.Blood_Pressure and (self.Systolic_BP is None or self.Diastolic_BP is None):
            raise ValueError(
                "Provide either Blood_Pressure ('118/76'), or both Systolic_BP and Diastolic_BP"
            )
        return self


class MaternalAssessmentResult(BaseModel):
    anemia_status: str = Field(..., description="Normal / Mild / Moderate / Severe")
    anemia_confidence: float = Field(..., ge=0, le=1)
    anemia_probabilities: Dict[str, float] = Field(...)
    pregnancy_risk: str = Field(..., description="Low / Medium / High")
    risk_confidence: float = Field(..., ge=0, le=1)
    risk_probabilities: Dict[str, float] = Field(...)
    features_used: Dict[str, Optional[float]] = Field(
        ..., description="Numeric features the models actually saw"
    )


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
