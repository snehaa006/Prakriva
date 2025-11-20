"""
Enhanced Flask application with comprehensive features and production readiness
"""
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from werkzeug.exceptions import BadRequest, InternalServerError
from loguru import logger
import traceback

# Import our modules
from config import settings
from models import (
    UserProfile, MealPlanRequest, MealPlanResponse, 
    APIResponse, HealthCheck, DoshaResult
)
from dataset_loader import dataset_loader
from dosha_estimator import dosha_predictor
from calorie_calculator import estimate_calories, get_calorie_breakdown
from planner import meal_planner
from db import db_manager
from exceptions import (
    AyurvedicPlannerError, ValidationError, ModelError,
    DoshaPredictionError, MealPlanGenerationError, DatabaseError
)



def create_app() -> Flask:
    """Application factory pattern"""
    
    app = Flask(__name__)
    
    # Configure CORS
    CORS(app, origins=["http://localhost:3000", "https://yourdomain.com"])
    
    # Configure rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=[f"{settings.RATE_LIMIT_PER_HOUR} per hour"]
    )
    
    # Configure caching
    cache = Cache(app, config={
        'CACHE_TYPE': settings.CACHE_TYPE,
        'CACHE_DEFAULT_TIMEOUT': settings.CACHE_DEFAULT_TIMEOUT
    })
    
    # Store instances in app context
    app.limiter = limiter
    app.cache = cache
    
    return app


app = create_app()


# Global data loading with caching
@app.cache.memoize(timeout=3600)
def get_datasets():
    """Load and cache datasets"""
    try:
        return dataset_loader.load_all_datasets()
    except Exception as e:
        logger.error(f"Failed to load datasets: {e}")
        raise ModelError(f"Dataset loading failed: {e}")


# Middleware and request handling
@app.before_request
def before_request():
    """Pre-request processing"""
    g.request_start_time = datetime.now(timezone.utc)
    g.request_id = request.headers.get('X-Request-ID', 'unknown')
    
    # Log incoming request
    logger.info(f"Request {g.request_id}: {request.method} {request.path}")


@app.after_request
def after_request(response):
    """Post-request processing"""
    if hasattr(g, 'request_start_time'):
        duration = (datetime.now(timezone.utc) - g.request_start_time).total_seconds()
        logger.info(f"Request {getattr(g, 'request_id', 'unknown')} completed in {duration:.3f}s")
    
    # Add security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    return response


# Error handlers
@app.errorhandler(ValidationError)
def handle_validation_error(e):
    """Handle validation errors"""
    logger.warning(f"Validation error: {e.message}")
    return jsonify(APIResponse(
        success=False,
        error=e.message,
        message="Invalid input data"
    ).dict()), 400


@app.errorhandler(ModelError)
def handle_model_error(e):
    """Handle model-related errors"""
    logger.error(f"Model error: {e.message}")
    return jsonify(APIResponse(
        success=False,
        error="Model processing failed",
        message="Internal model error occurred"
    ).dict()), 500


@app.errorhandler(DatabaseError)
def handle_database_error(e):
    """Handle database errors"""
    logger.error(f"Database error: {e.message}")
    return jsonify(APIResponse(
        success=False,
        error="Database operation failed",
        message="Please try again later"
    ).dict()), 500


@app.errorhandler(AyurvedicPlannerError)
def handle_planner_error(e):
    """Handle general planner errors"""
    logger.error(f"Planner error: {e.message}")
    return jsonify(APIResponse(
        success=False,
        error=e.message,
        message="Meal planning failed"
    ).dict()), 500


@app.errorhandler(400)
def handle_bad_request(e):
    """Handle bad requests"""
    return jsonify(APIResponse(
        success=False,
        error="Bad request",
        message="Invalid request format"
    ).dict()), 400


@app.errorhandler(429)
def handle_rate_limit(e):
    """Handle rate limit exceeded"""
    return jsonify(APIResponse(
        success=False,
        error="Rate limit exceeded",
        message="Too many requests. Please try again later."
    ).dict()), 429


@app.errorhandler(500)
def handle_internal_error(e):
    """Handle internal server errors"""
    logger.error(f"Internal server error: {str(e)}\n{traceback.format_exc()}")
    return jsonify(APIResponse(
        success=False,
        error="Internal server error",
        message="An unexpected error occurred"
    ).dict()), 500


# API Routes
@app.route("/", methods=["GET"])
def index():
    """API root endpoint"""
    return jsonify(APIResponse(
        success=True,
        message="Ayurvedic Meal Planner API is running",
        data={
            "version": settings.MODEL_VERSION,
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    ).dict())


@app.route("/health", methods=["GET"])
def health_check():
    """Comprehensive health check endpoint"""
    try:
        # Check database
        db_status = db_manager.health_check()
        
        # Check datasets
        try:
            datasets = get_datasets()
            dataset_status = {
                "status": "healthy",
                "datasets_loaded": len(datasets),
                "total_foods": len(datasets.get('food', [])) if datasets.get('food') is not None else 0
            }
        except Exception as e:
            dataset_status = {
                "status": "error",
                "message": str(e)
            }
        
        # Check ML model
        ml_status = {
            "status": "healthy" if dosha_predictor.ml_model is not None else "warning",
            "model_loaded": dosha_predictor.ml_model is not None
        }
        
        health_data = HealthCheck(
            status="healthy",
            version=settings.MODEL_VERSION,
            timestamp=datetime.now(timezone.utc).isoformat(),
            dependencies={
                "database": db_status.get("status", "unknown"),
                "datasets": dataset_status.get("status", "unknown"),
                "ml_model": ml_status.get("status", "unknown")
            }
        )
        
        return jsonify(APIResponse(
            success=True,
            data=health_data.dict(),
            message="Health check completed"
        ).dict())
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return jsonify(APIResponse(
            success=False,
            error="Health check failed",
            message=str(e)
        ).dict()), 500


@app.route("/generate", methods=["POST"])
@app.limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE} per minute")
def generate_meal_plan():
    """
    Generate personalized meal plan
    Enhanced version with comprehensive validation and error handling
    """
    try:
        # Validate request content type
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        # Parse and validate request
        try:
            request_data = MealPlanRequest(**request.json)
        except Exception as e:
            raise ValidationError(f"Invalid request format: {str(e)}")
        
        user_profile = request_data.user_profile
        days = request_data.days
        model_name = request_data.model
        preferences = request_data.preferences or {}
        
        logger.info(f"Generating meal plan for user: {days} days, model: {model_name}")
        
        # Load datasets
        try:
            datasets = get_datasets()
            food_df = datasets["food"]
            dosha_df = datasets.get("dosha")
        except Exception as e:
            raise ModelError(f"Failed to load datasets: {e}")
        
        # Step 1: Predict dosha using hybrid approach
        try:
            dosha_result = dosha_predictor.predict_dosha_hybrid(
                user_profile, 
                dosha_df, 
                model_name
            )
            logger.info(f"Dosha prediction: {dosha_result.dosha} (confidence: {dosha_result.confidence:.2f})")
        except Exception as e:
            logger.warning(f"Dosha prediction failed, using fallback: {e}")
            dosha_result = DoshaResult(
                dosha="vata",
                scores={"vata": 0.4, "pitta": 0.3, "kapha": 0.3},
                confidence=0.3,
                method="fallback"
            )
        
        # Step 2: Calculate calories with detailed breakdown
        try:
            calorie_breakdown = get_calorie_breakdown(user_profile)
            daily_calories = calorie_breakdown["target_calories"]
            logger.info(f"Calculated daily calories: {daily_calories}")
        except Exception as e:
            logger.warning(f"Calorie calculation failed, using fallback: {e}")
            daily_calories = estimate_calories(user_profile)
            calorie_breakdown = {"target_calories": daily_calories}
        
        # Step 3: Generate meal plan
        try:
            plan = meal_planner.generate_meal_plan_advanced(
                user_profile=user_profile,
                food_df=food_df,
                dosha_info=dosha_result,
                daily_calories=daily_calories,
                days=days,
                model=model_name,
                preferences=preferences
            )
            logger.success("Meal plan generated successfully")
        except Exception as e:
            logger.error(f"Meal plan generation failed: {e}")
            raise MealPlanGenerationError(f"Failed to generate meal plan: {e}")
        
        # Step 4: Save plan to database
        doc_id = None
        try:
            save_payload = {
                "user_profile": user_profile.dict(),
                "dosha_result": dosha_result.dict(),
                "daily_calories": daily_calories,
                "calorie_breakdown": calorie_breakdown,
                "plan": plan,
                "generation_params": {
                    "days": days,
                    "model": model_name,
                    "preferences": preferences
                }
            }
            
            metadata = {
                "generation_method": "hybrid_llm_ml",
                "api_version": settings.MODEL_VERSION,
                "request_id": getattr(g, 'request_id', 'unknown')
            }
            
            doc_id = db_manager.save_generated_plan(
                user_id=user_profile.Patient_ID or "anonymous",
                payload=save_payload,
                metadata=metadata
            )
            logger.success(f"Plan saved with ID: {doc_id}")
            
        except Exception as e:
            logger.warning(f"Failed to save plan: {e}")
            # Continue without failing the request
        
        # Step 5: Prepare response
        response_data = MealPlanResponse(
            plan=plan,
            dosha=dosha_result,
            daily_calories=int(daily_calories),
            plan_id=doc_id,
            metadata={
                "generation_time": datetime.now(timezone.utc).isoformat(),
                "model_used": model_name,
                "method": dosha_result.method,
                "calorie_breakdown": calorie_breakdown
            }
        )
        
        return jsonify(APIResponse(
            success=True,
            data=response_data.dict(),
            message="Meal plan generated successfully"
        ).dict())
        
    except ValidationError as e:
        raise e  # Let error handler deal with it
    except (ModelError, DoshaPredictionError, MealPlanGenerationError) as e:
        raise e  # Let error handler deal with it
    except Exception as e:
        logger.error(f"Unexpected error in meal plan generation: {e}\n{traceback.format_exc()}")
        raise AyurvedicPlannerError(f"Meal plan generation failed: {str(e)}")


@app.route("/plan/<plan_id>", methods=["GET"])
@app.limiter.limit("60 per minute")
def get_meal_plan(plan_id: str):
    """Get a specific meal plan by ID"""
    try:
        plan = db_manager.get_generated_plan(plan_id)
        
        if not plan:
            return jsonify(APIResponse(
                success=False,
                error="Plan not found",
                message=f"No meal plan found with ID: {plan_id}"
            ).dict()), 404
        
        return jsonify(APIResponse(
            success=True,
            data=plan,
            message="Meal plan retrieved successfully"
        ).dict())
        
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to get meal plan {plan_id}: {e}")
        raise DatabaseError(f"Failed to retrieve meal plan: {e}")


@app.route("/user/<user_id>/plans", methods=["GET"])
@app.limiter.limit("30 per minute")
def get_user_meal_plans(user_id: str):
    """Get all meal plans for a specific user"""
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50
        status = request.args.get('status', 'active')
        
        plans = db_manager.get_user_plans(user_id, limit, status)
        
        return jsonify(APIResponse(
            success=True,
            data={
                "plans": plans,
                "total": len(plans),
                "user_id": user_id,
                "status": status
            },
            message=f"Retrieved {len(plans)} meal plans"
        ).dict())
        
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to get user plans for {user_id}: {e}")
        raise DatabaseError(f"Failed to retrieve user plans: {e}")


@app.route("/plan/<plan_id>/edit", methods=["POST"])
@app.limiter.limit("10 per minute")
def edit_meal_plan(plan_id: str):
    """Allow doctors to edit meal plans"""
    try:
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        data = request.json
        doctor_id = data.get('doctor_id')
        edited_plan = data.get('edited_plan')
        reason = data.get('reason', '')
        edit_type = data.get('edit_type', 'modification')
        
        if not doctor_id:
            raise ValidationError("doctor_id is required")
        
        if not edited_plan:
            raise ValidationError("edited_plan is required")
        
        # Save the edit
        edit_id = db_manager.save_doctor_edit(
            plan_id=plan_id,
            doctor_id=doctor_id,
            edited_plan=edited_plan,
            reason=reason,
            edit_type=edit_type
        )
        
        return jsonify(APIResponse(
            success=True,
            data={"edit_id": edit_id, "plan_id": plan_id},
            message="Meal plan edited successfully"
        ).dict())
        
    except ValidationError as e:
        raise e
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to edit meal plan {plan_id}: {e}")
        raise DatabaseError(f"Failed to edit meal plan: {e}")


@app.route("/plan/<plan_id>/edits", methods=["GET"])
@app.limiter.limit("30 per minute")
def get_plan_edits(plan_id: str):
    """Get all edits for a specific meal plan"""
    try:
        edits = db_manager.get_plan_edits(plan_id)
        
        return jsonify(APIResponse(
            success=True,
            data={
                "edits": edits,
                "total": len(edits),
                "plan_id": plan_id
            },
            message=f"Retrieved {len(edits)} edits"
        ).dict())
        
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to get edits for plan {plan_id}: {e}")
        raise DatabaseError(f"Failed to retrieve edits: {e}")


@app.route("/plan/<plan_id>/feedback", methods=["POST"])
@app.limiter.limit("5 per minute")
def submit_feedback(plan_id: str):
    """Submit user feedback for a meal plan"""
    try:
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        data = request.json
        user_id = data.get('user_id')
        rating = data.get('rating')
        feedback = data.get('feedback', '')
        categories = data.get('categories', [])
        
        if not user_id:
            raise ValidationError("user_id is required")
        
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            raise ValidationError("rating must be an integer between 1 and 5")
        
        feedback_id = db_manager.save_user_feedback(
            plan_id=plan_id,
            user_id=user_id,
            rating=rating,
            feedback=feedback,
            categories=categories
        )
        
        return jsonify(APIResponse(
            success=True,
            data={"feedback_id": feedback_id, "plan_id": plan_id},
            message="Feedback submitted successfully"
        ).dict())
        
    except ValidationError as e:
        raise e
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Failed to submit feedback for plan {plan_id}: {e}")
        raise DatabaseError(f"Failed to submit feedback: {e}")


@app.route("/dosha/predict", methods=["POST"])
@app.limiter.limit("20 per minute")
def predict_dosha_only():
    """Standalone dosha prediction endpoint"""
    try:
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        try:
            user_profile = UserProfile(**request.json)
        except Exception as e:
            raise ValidationError(f"Invalid user profile: {str(e)}")
        
        # Load dosha dataset
        try:
            datasets = get_datasets()
            dosha_df = datasets.get("dosha")
        except Exception as e:
            logger.warning(f"Failed to load dosha dataset: {e}")
            dosha_df = None
        
        # Predict dosha
        dosha_result = dosha_predictor.predict_dosha_hybrid(
            user_profile, 
            dosha_df, 
            request.json.get('model', settings.DEFAULT_MODEL)
        )
        
        return jsonify(APIResponse(
            success=True,
            data=dosha_result.dict(),
            message="Dosha predicted successfully"
        ).dict())
        
    except ValidationError as e:
        raise e
    except DoshaPredictionError as e:
        raise e
    except Exception as e:
        logger.error(f"Dosha prediction failed: {e}")
        raise DoshaPredictionError(f"Dosha prediction failed: {e}")


@app.route("/calories/calculate", methods=["POST"])
@app.limiter.limit("30 per minute")
def calculate_calories():
    """Standalone calorie calculation endpoint"""
    try:
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        try:
            user_profile = UserProfile(**request.json)
        except Exception as e:
            raise ValidationError(f"Invalid user profile: {str(e)}")
        
        # Calculate calories with breakdown
        calorie_data = get_calorie_breakdown(user_profile)
        
        return jsonify(APIResponse(
            success=True,
            data=calorie_data,
            message="Calories calculated successfully"
        ).dict())
        
    except ValidationError as e:
        raise e
    except Exception as e:
        logger.error(f"Calorie calculation failed: {e}")
        raise AyurvedicPlannerError(f"Calorie calculation failed: {e}")


@app.route("/analytics", methods=["GET"])
@app.limiter.limit("10 per minute")
def get_analytics():
    """Get analytics data (admin endpoint)"""
    try:
        # In production, add authentication check here
        
        limit = min(int(request.args.get('limit', 1000)), 5000)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Parse dates if provided
        start_dt = datetime.fromisoformat(start_date) if start_date else None
        end_dt = datetime.fromisoformat(end_date) if end_date else None
        
        analytics = db_manager.get_analytics_data(start_dt, end_dt, limit)
        
        return jsonify(APIResponse(
            success=True,
            data=analytics,
            message="Analytics data retrieved successfully"
        ).dict())
        
    except ValueError as e:
        raise ValidationError(f"Invalid date format: {e}")
    except DatabaseError as e:
        raise e
    except Exception as e:
        logger.error(f"Analytics retrieval failed: {e}")
        raise DatabaseError(f"Failed to retrieve analytics: {e}")


@app.route("/datasets/info", methods=["GET"])
@app.limiter.limit("20 per minute")
def get_dataset_info():
    """Get information about loaded datasets"""
    try:
        info = dataset_loader.get_dataset_info()
        
        return jsonify(APIResponse(
            success=True,
            data=info,
            message="Dataset information retrieved successfully"
        ).dict())
        
    except Exception as e:
        logger.error(f"Failed to get dataset info: {e}")
        raise ModelError(f"Failed to retrieve dataset information: {e}")


# Utility endpoints for testing
@app.route("/test/validate", methods=["POST"])
@app.limiter.limit("10 per minute")
def test_validation():
    """Test endpoint for request validation"""
    try:
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")
        
        # Try to validate as UserProfile
        user_profile = UserProfile(**request.json)
        
        return jsonify(APIResponse(
            success=True,
            data=user_profile.dict(),
            message="Validation successful"
        ).dict())
        
    except ValidationError as e:
        raise e
    except Exception as e:
        raise ValidationError(f"Validation failed: {str(e)}")


# Development/Debug endpoints (disable in production)
if settings.FLASK_ENV == "development":
    
    @app.route("/debug/error", methods=["GET"])
    def debug_error():
        """Test error handling"""
        error_type = request.args.get('type', 'general')
        
        if error_type == 'validation':
            raise ValidationError("Test validation error")
        elif error_type == 'model':
            raise ModelError("Test model error")
        elif error_type == 'database':
            raise DatabaseError("Test database error")
        else:
            raise Exception("Test general error")
    
    @app.route("/debug/cache", methods=["GET"])
    def debug_cache():
        """Test caching system"""
        cache_key = request.args.get('key', 'test')
        
        # Try to get from cache
        value = app.cache.get(cache_key)
        
        if value is None:
            value = f"Generated at {datetime.now().isoformat()}"
            app.cache.set(cache_key, value, timeout=60)
            cache_hit = False
        else:
            cache_hit = True
        
        return jsonify({
            "cache_key": cache_key,
            "value": value,
            "cache_hit": cache_hit
        })


if __name__ == "__main__":
    try:
        # Validate configuration
        logger.info("Starting Ayurvedic Meal Planner API...")
        logger.info(f"Environment: {settings.FLASK_ENV}")
        logger.info(f"Debug: {settings.DEBUG}")
        logger.info(f"Port: {settings.PORT}")
        
        # Test critical components
        logger.info("Testing critical components...")
        
        # Test database
        db_health = db_manager.health_check()
        logger.info(f"Database status: {db_health.get('status', 'unknown')}")
        
        # Test dataset loading
        try:
            datasets = get_datasets()
            logger.success(f"Datasets loaded: {list(datasets.keys())}")
        except Exception as e:
            logger.warning(f"Dataset loading failed: {e}")
        
        # Test ML model
        if dosha_predictor.ml_model:
            logger.success("ML model loaded successfully")
        else:
            logger.warning("ML model not loaded")
        
        # Start the application
        logger.success("All components initialized successfully")
        
        app.run(
            host=settings.HOST,
            port=settings.PORT,
            debug=settings.DEBUG,
            threaded=True
        )
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

        
    from api_generate import router as generate_router
    app.include_router(generate_router)
