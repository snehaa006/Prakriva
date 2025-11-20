# main.py - Corrected & robust API implementation
import os
import json
import importlib
from pathlib import Path
from typing import Dict, Any, Optional, Callable, List

import pandas as pd
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, auth as firebase_auth
from loguru import logger
import uvicorn
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Ensure logs directory exists (loguru will write there)
os.makedirs("logs", exist_ok=True)

# Configure logging
logger.configure(
    handlers=[
        {
            "sink": "logs/app.log",
            "format": os.getenv("LOG_FORMAT", "{time} | {level} | {message}"),
            "level": os.getenv("LOG_LEVEL", "INFO"),
            "rotation": "1 day",
        }
    ]
)

logger.info("Starting Ayurvedic Meal Planner API startup sequence")

# --- Dynamic import helpers (tries multiple file/function name variants) ---
def import_callable(
    module_names: List[str],
    callable_names: List[str],
    class_names: Optional[List[str]] = None,
) -> Callable:
    """
    Try a list of module names and look for one of the callable_names as a function,
    or as a method of a MealPlanner-like class or module-level object named 'meal_planner'.
    Returns the callable (function or bound method). Raises ImportError if none found.
    """
    class_names = class_names or ["MealPlanner"]
    for mod_name in module_names:
        try:
            mod = importlib.import_module(mod_name)
            logger.info(f"Imported module candidate: {mod_name}")
        except Exception as e:
            logger.debug(f"Could not import {mod_name}: {e}")
            continue

        # 1) look for module-level functions
        for name in callable_names:
            if hasattr(mod, name):
                obj = getattr(mod, name)
                if callable(obj):
                    logger.info(f"Found callable '{name}' in module '{mod_name}'")
                    return obj

        # 2) look for a class (MealPlanner) and its methods
        for cls_name in class_names:
            if hasattr(mod, cls_name):
                try:
                    cls = getattr(mod, cls_name)
                    instance = cls()  # try no-arg constructor
                    for name in callable_names:
                        if hasattr(instance, name):
                            method = getattr(instance, name)
                            if callable(method):
                                logger.info(f"Found method '{name}' on class '{cls_name}' in '{mod_name}'")
                                return method
                except Exception as e:
                    logger.debug(f"Couldn't instantiate class '{cls_name}' in '{mod_name}': {e}")

        # 3) look for a module-level object (e.g. meal_planner = MealPlanner(...))
        if hasattr(mod, "meal_planner"):
            mp_obj = getattr(mod, "meal_planner")
            for name in callable_names:
                if hasattr(mp_obj, name):
                    method = getattr(mp_obj, name)
                    if callable(method):
                        logger.info(f"Found method '{name}' on module-level 'meal_planner' in '{mod_name}'")
                        return method

    raise ImportError(f"No suitable callable found in modules: {module_names} with names {callable_names}")


# --- Import models and core components with helpful errors if missing ---
try:
    models_mod = importlib.import_module("models")
    UserProfile = getattr(models_mod, "UserProfile")
    # DoshaResult may simply be a dict on some projects; we accept either
    DoshaResultType = getattr(models_mod, "DoshaResult", dict)
    Gender = getattr(models_mod, "Gender")
    PhysicalActivityLevel = getattr(models_mod, "PhysicalActivityLevel")
    Goal = getattr(models_mod, "Goal")
    logger.info("Loaded model types from models.py")
except Exception as e:
    logger.error(f"Failed to import models from 'models.py': {e}")
    raise ImportError("Please ensure you have a models.py exporting UserProfile, Gender, PhysicalActivityLevel, Goal") from e

# Meal planner function detection: try a few likely modules & function names
try:
    meal_planner_generate = import_callable(
        module_names=["meal_planner", "api_generate", "planner", "planner_api"],
        callable_names=["generate_meal_plan_advanced", "generate_meal_plan", "generate_plan", "generate"],
        class_names=["MealPlanner", "Planner"]
    )
except ImportError as e:
    logger.error("Meal planner module/function not found: " + str(e))
    raise

# Dosha analyzer detection
try:
    analyze_dosha = import_callable(
        module_names=["dosha_analysis", "dosha", "dosha_analyzer"],
        callable_names=["analyze_dosha", "compute_dosha", "get_dosha"]
    )
except ImportError as e:
    logger.error("Dosha analysis function not found: " + str(e))
    raise

# Calorie calculator detection
try:
    calculate_daily_calories = import_callable(
        module_names=["calorie_calculator", "calories", "nutrition"],
        callable_names=["calculate_daily_calories", "calc_daily_calories", "estimate_calories", "calculate_calories"]
    )
except ImportError as e:
    logger.error("Calorie calculation function not found: " + str(e))
    raise

logger.info("Core components imported successfully")


# --- Initialize FastAPI app ---
app = FastAPI(
    title="Ayurvedic Meal Planner API",
    description="API for generating personalized Ayurvedic meal plans",
    version="1.0.0",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-frontend-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)


# --- Food dataset load ---
FOOD_DATASET: Optional[pd.DataFrame] = None


def load_food_dataset():
    global FOOD_DATASET
    try:
        food_dataset_path = os.getenv("FOOD_DATASET_PATH", "data/food_dataset.csv")
        if os.path.exists(food_dataset_path):
            FOOD_DATASET = pd.read_csv(food_dataset_path)
            logger.info(f"Loaded food dataset with {len(FOOD_DATASET)} items from {food_dataset_path}")
        else:
            logger.error(f"Food dataset not found at: {food_dataset_path}, using fallback minimal dataset")
            FOOD_DATASET = pd.DataFrame(
                {
                    "Food_Item": ["Rice", "Dal", "Chapati", "Vegetables", "Fruits"],
                    "Category": ["Grains", "Pulses", "Grains", "Vegetables", "Fruits"],
                    "Calories": [130, 116, 71, 25, 60],
                    "Protein": [2.7, 9.0, 3.1, 3.0, 0.9],
                    "Carbohydrates": [28, 20, 15, 5, 15],
                    "Fat": [0.3, 0.4, 0.4, 0.3, 0.2],
                }
            )
            logger.warning("Using minimal fallback food dataset")
    except Exception as e:
        logger.error(f"Error loading food dataset: {e}")
        raise


load_food_dataset()


# --- Firebase Admin init ---
def initialize_firebase():
    try:
        if not firebase_admin._apps:
            firebase_key_path = os.getenv("FIREBASE_KEY_PATH", "firebase_key.json")
            if not os.path.exists(firebase_key_path):
                logger.error(f"Firebase key file not found at {firebase_key_path}")
                raise FileNotFoundError(f"Firebase key file not found: {firebase_key_path}")
            cred = credentials.Certificate(firebase_key_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        else:
            logger.info("Firebase Admin SDK already initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
        # fail early so dev knows about it
        raise


initialize_firebase()


# --- Pydantic Models for API ---
class GenerateMealPlanRequest(BaseModel):
    patientId: str
    profile: Dict[str, Any]
    days: Optional[int] = 7
    model: Optional[str] = None


class MealPlanResponse(BaseModel):
    plan: Dict[str, Any]
    message: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str


# --- Authentication dependency ---
def verify_doctor(authorization: str = Header(...)):
    """
    Verify the Firebase ID token and ensure user has role 'doctor'.
    This function is defensive because firebase_admin exceptions may differ by version.
    """
    try:
        if not authorization or not authorization.startswith("Bearer "):
            logger.error("Invalid authorization header format")
            raise HTTPException(
                status_code=401,
                detail="Invalid authorization header format. Expected 'Bearer <token>'",
            )

        token = authorization.split("Bearer ")[1].strip()
        if not token:
            logger.error("Authorization Bearer token empty")
            raise HTTPException(status_code=401, detail="Token is empty")

        logger.info("Verifying Firebase ID token")
        decoded = firebase_auth.verify_id_token(token)

        # roles may be stored at top-level or under custom_claims depending on your set-up
        user_role = decoded.get("role")
        if not user_role:
            user_role = decoded.get("custom_claims", {}).get("role")

        logger.info(f"Token verified for uid={decoded.get('uid')}, role={user_role}")

        if user_role != "doctor":
            logger.warning(f"User {decoded.get('uid')} attempted access without doctor role")
            raise HTTPException(status_code=403, detail="Only doctors can generate meal plans")

        return decoded

    except Exception as e:
        # defensive mapping of common firebase messages to HTTP errors
        msg = str(e).lower()
        if "expired" in msg:
            logger.error("Expired Firebase token")
            raise HTTPException(status_code=401, detail="Token has expired")
        if "invalid" in msg or "decode" in msg:
            logger.error("Invalid Firebase token")
            raise HTTPException(status_code=401, detail="Invalid ID token")
        logger.error(f"Authentication error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


# --- Helpers to safely map profile dict into your UserProfile object ---
def safe_enum_cast(enum_type, value, fallback=None):
    """
    Attempt to match a string/enum value to a member of enum_type.
    If enum_type is not actually an Enum, just return the value.
    """
    try:
        # If it's already an enum member, return
        if hasattr(enum_type, "__members__"):
            if value is None:
                return fallback
            # try common matches
            val = str(value).strip().lower()
            for member in enum_type:
                if member.name.lower() == val or str(member.value).lower() == val:
                    return member
            # last attempt: try constructing
            try:
                return enum_type(val)
            except Exception:
                return fallback or list(enum_type)[0]
        else:
            return value
    except Exception as e:
        logger.debug(f"safe_enum_cast failed: {e}")
        return fallback


def create_user_profile(profile_data: Dict[str, Any]) -> Any:
    """
    Convert incoming profile dict to your project's UserProfile dataclass / pydantic model.
    This tries to be permissive with different key names.
    """
    try:
        field_mapping = {
            "age": "Age",
            "gender": "Gender",
            "weight": "Weight_kg",
            "height": "Height_cm",
            "activity_level": "Physical_Activity_Level",
            "goal": "Goal",
            "allergies": "Allergies",
            "food_preference": "Food_preference",
        }

        mapped_profile: Dict[str, Any] = {}
        # normalize keys (incoming may be camelCase or snake_case)
        for key, value in profile_data.items():
            k = key.lower()
            mapped_key = field_mapping.get(k, key)
            mapped_profile[mapped_key] = value

        # defaults and enum casting
        if "Age" not in mapped_profile and "age" in profile_data:
            mapped_profile["Age"] = profile_data["age"]

        # Gender
        if "Gender" in mapped_profile:
            mapped_profile["Gender"] = safe_enum_cast(Gender, mapped_profile["Gender"], fallback=None)
        else:
            # attempt to get from alternate keys
            g = profile_data.get("gender") or profile_data.get("sex")
            mapped_profile["Gender"] = safe_enum_cast(Gender, g, fallback=None)

        # Weight/Height defaults
        mapped_profile.setdefault("Weight_kg", profile_data.get("weight", 70))
        mapped_profile.setdefault("Height_cm", profile_data.get("height", 170))

        # Activity level
        if "Physical_Activity_Level" in mapped_profile:
            mapped_profile["Physical_Activity_Level"] = safe_enum_cast(
                PhysicalActivityLevel, mapped_profile["Physical_Activity_Level"], fallback=None
            )
        else:
            activity = profile_data.get("activity_level", profile_data.get("activity", "moderate"))
            mapped_profile["Physical_Activity_Level"] = safe_enum_cast(PhysicalActivityLevel, activity, fallback=None)

        # Goal
        if "Goal" in mapped_profile:
            mapped_profile["Goal"] = safe_enum_cast(Goal, mapped_profile["Goal"], fallback=None)
        else:
            goal = profile_data.get("goal", "maintenance")
            mapped_profile["Goal"] = safe_enum_cast(Goal, goal, fallback=None)

        # If your UserProfile is a pydantic model / dataclass we can instantiate it
        user_profile = UserProfile(**mapped_profile)
        logger.info(f"Created UserProfile: {user_profile}")
        return user_profile

    except Exception as e:
        logger.error(f"Error creating UserProfile: {e}")
        raise ValueError(f"Invalid profile data: {e}")


# --- Routes ---
@app.get("/", response_model=HealthResponse)
async def root():
    return HealthResponse(
        status="healthy",
        service="Ayurvedic Meal Planner API",
        version="1.0.0",
        environment=os.getenv("FLASK_ENV", "production"),
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="Ayurvedic Meal Planner API",
        version="1.0.0",
        environment=os.getenv("FLASK_ENV", "production"),
    )


@app.get("/test-auth")
async def test_auth(user=Depends(verify_doctor)):
    return {
        "message": "Authentication successful",
        "user_id": user.get("uid"),
        "email": user.get("email"),
        "role": user.get("role") or user.get("custom_claims", {}).get("role"),
        "timestamp": user.get("iat"),
    }


@app.post("/generateMealPlan", response_model=MealPlanResponse)
async def generate_meal_plan_endpoint(request: GenerateMealPlanRequest, user=Depends(verify_doctor)):
    try:
        logger.info(f"Doctor {user['uid']} requested meal plan for patient {request.patientId}")

        # Validate
        if not request.patientId or not request.patientId.strip():
            raise HTTPException(status_code=400, detail="Patient ID is required")
        if not request.profile or not isinstance(request.profile, dict):
            raise HTTPException(status_code=400, detail="Patient profile is required and must be an object")

        if FOOD_DATASET is None or FOOD_DATASET.empty:
            raise HTTPException(status_code=500, detail="Food dataset not available. Please check server configuration.")

        # Convert profile
        try:
            user_profile = create_user_profile(request.profile)
            logger.info(f"Created UserProfile with Age={getattr(user_profile, 'Age', None)}")
        except Exception as e:
            logger.error(f"Error creating user profile: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid profile data: {str(e)}")

        # Dosha analysis (defensive)
        try:
            dosha_result = analyze_dosha(user_profile)
            logger.info(f"Dosha analysis result: {dosha_result}")
        except Exception as e:
            logger.warning(f"Dosha analysis failed, using default. Error: {e}")
            dosha_result = {"dosha": "vata", "confidence": 0.5, "description": "Default dosha assignment"}

        # Calorie calculation (defensive)
        try:
            daily_calories = calculate_daily_calories(user_profile)
            logger.info(f"Calculated daily calories: {daily_calories}")
        except Exception as e:
            logger.warning(f"Calorie calculation failed, using default. Error: {e}")
            # fallback heuristic
            gender_field = getattr(user_profile, "Gender", None)
            gender_name = None
            try:
                gender_name = gender_field.name.lower() if hasattr(gender_field, "name") else str(gender_field).lower()
            except Exception:
                gender_name = str(gender_field).lower() if gender_field else None
            base_calories = 1800 if gender_name == "female" else 2200
            daily_calories = base_calories

        # Call meal planner. Try keyword call first; fallback to positional call.
        logger.info("Calling meal planner generator...")
        try:
            meal_plan = meal_planner_generate(
                user_profile=user_profile,
                food_df=FOOD_DATASET,
                dosha_info=dosha_result,
                daily_calories=daily_calories,
                days=request.days or 7,
                model=request.model or os.getenv("DEFAULT_MODEL", "gpt-4"),
            )
        except TypeError as te:
            logger.debug(f"Keyword call failed, trying positional call: {te}")
            try:
                meal_plan = meal_planner_generate(
                    user_profile,
                    FOOD_DATASET,
                    dosha_result,
                    daily_calories,
                    request.days or 7,
                    request.model or os.getenv("DEFAULT_MODEL", "gpt-4"),
                )
            except Exception as e:
                logger.error(f"Meal planner failed with positional call: {e}")
                raise

        if not meal_plan:
            logger.error("Meal plan generation returned empty result")
            raise HTTPException(status_code=500, detail="Meal plan generation failed - empty result")

        logger.info("Successfully generated meal plan")

        # Prepare metadata. Be defensive: meal_plan may be dict or custom object
        try:
            summary = meal_plan.get("summary", {}) if isinstance(meal_plan, dict) else getattr(meal_plan, "summary", {}) or {}
            method = summary.get("method", "advanced") if isinstance(summary, dict) else "advanced"
        except Exception:
            method = "advanced"

        response = MealPlanResponse(
            plan=meal_plan if isinstance(meal_plan, dict) else (meal_plan.__dict__ if hasattr(meal_plan, "__dict__") else {"result": str(meal_plan)}),
            message="Meal plan generated successfully",
            metadata={
                "generated_by": user.get("uid"),
                "patient_id": request.patientId,
                "model_version": os.getenv("MODEL_VERSION", "1.0.0"),
                "dosha": dosha_result.get("dosha", "unknown") if isinstance(dosha_result, dict) else getattr(dosha_result, "dosha", "unknown"),
                "daily_calories": daily_calories,
                "days": request.days or 7,
                "generation_method": method,
            },
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating meal plan: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- Debug / config endpoint ---
@app.get("/config")
async def get_config(user=Depends(verify_doctor)):
    return {
        "environment": os.getenv("FLASK_ENV"),
        "food_dataset_loaded": FOOD_DATASET is not None,
        "food_dataset_size": len(FOOD_DATASET) if FOOD_DATASET is not None else 0,
        "firebase_key_exists": os.path.exists(os.getenv("FIREBASE_KEY_PATH", "")),
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
        "default_model": os.getenv("DEFAULT_MODEL", "gpt-4"),
        "available_columns": list(FOOD_DATASET.columns) if FOOD_DATASET is not None else [],
    }


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "True").lower() == "true"

    logger.info(f"Starting FastAPI server on {host}:{port} (debug={debug})")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=os.getenv("LOG_LEVEL", "info").lower(),
    )
