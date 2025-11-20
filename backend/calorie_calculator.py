"""
Enhanced calorie calculator with multiple formulas and validation
"""
from typing import Dict, Tuple
from loguru import logger
from models import UserProfile, GenderEnum, ActivityLevelEnum, GoalEnum
from exceptions import CalorieCalculationError


class CalorieCalculator:
    """Enhanced calorie calculator with multiple methods"""
    
    # Activity multipliers for different formulas
    ACTIVITY_MULTIPLIERS = {
        ActivityLevelEnum.SEDENTARY: {
            "bmr": 1.2,
            "tdee": 1.2,
            "adjusted": 1.15  # More conservative for sedentary
        },
        ActivityLevelEnum.MODERATE: {
            "bmr": 1.55,
            "tdee": 1.55,
            "adjusted": 1.5
        },
        ActivityLevelEnum.ACTIVE: {
            "bmr": 1.725,
            "tdee": 1.725,
            "adjusted": 1.7
        }
    }
    
    # Goal adjustments (calories to add/subtract)
    GOAL_ADJUSTMENTS = {
        GoalEnum.WEIGHT_LOSS: -400,
        GoalEnum.MAINTENANCE: 0,
        GoalEnum.WEIGHT_GAIN: 400
    }
    
    @staticmethod
    def calculate_bmr_harris_benedict(
        weight_kg: float,
        height_cm: float,
        age: int,
        gender: GenderEnum
    ) -> float:
        """Calculate BMR using Harris-Benedict equation"""
        if gender == GenderEnum.MALE:
            return 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
        else:  # Female or other
            return 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    
    @staticmethod
    def calculate_bmr_mifflin_st_jeor(
        weight_kg: float,
        height_cm: float,
        age: int,
        gender: GenderEnum
    ) -> float:
        """Calculate BMR using Mifflin-St Jeor equation (more accurate)"""
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age
        if gender == GenderEnum.MALE:
            return bmr + 5
        else:  # Female or other
            return bmr - 161
    
    @staticmethod
    def calculate_bmr_katch_mcardle(
        weight_kg: float,
        body_fat_percentage: float
    ) -> float:
        """Calculate BMR using Katch-McArdle equation (requires body fat %)"""
        lean_mass_kg = weight_kg * (1 - body_fat_percentage / 100)
        return 370 + (21.6 * lean_mass_kg)
    
    @classmethod
    def estimate_body_fat_percentage(
        cls,
        bmi: float,
        age: int,
        gender: GenderEnum
    ) -> float:
        """Estimate body fat percentage from BMI and demographics"""
        if gender == GenderEnum.MALE:
            body_fat = (1.20 * bmi) + (0.23 * age) - 16.2
        else:  # Female or other
            body_fat = (1.20 * bmi) + (0.23 * age) - 5.4
        
        # Constrain to reasonable bounds
        return max(5, min(50, body_fat))
    
    @classmethod
    def calculate_calories_comprehensive(
        cls,
        user_profile: UserProfile
    ) -> Dict[str, float]:
        """Calculate calories using multiple methods for validation"""
        try:
            # Basic parameters
            weight = user_profile.Weight_kg
            height = user_profile.Height_cm
            age = user_profile.Age
            gender = user_profile.Gender
            activity = user_profile.Physical_Activity_Level
            goal = user_profile.Goal
            
            # Calculate BMR using different methods
            bmr_harris = cls.calculate_bmr_harris_benedict(weight, height, age, gender)
            bmr_mifflin = cls.calculate_bmr_mifflin_st_jeor(weight, height, age, gender)
            
            # Estimate body fat and calculate Katch-McArdle BMR
            bmi = user_profile.BMI
            body_fat = cls.estimate_body_fat_percentage(bmi, age, gender)
            bmr_katch = cls.calculate_bmr_katch_mcardle(weight, body_fat)
            
            # Use Mifflin-St Jeor as primary (most accurate for general population)
            primary_bmr = bmr_mifflin
            
            # Calculate TDEE with different activity multipliers
            multiplier = cls.ACTIVITY_MULTIPLIERS[activity]["bmr"]
            tdee = primary_bmr * multiplier
            
            # Apply goal adjustments
            goal_adjustment = cls.GOAL_ADJUSTMENTS[goal]
            target_calories = tdee + goal_adjustment
            
            # Apply minimum calorie constraints
            if goal == GoalEnum.WEIGHT_LOSS:
                min_calories = 1200 if gender != GenderEnum.MALE else 1500
                target_calories = max(min_calories, target_calories)
            
            # Return comprehensive results
            results = {
                "bmr_harris_benedict": round(bmr_harris, 1),
                "bmr_mifflin_st_jeor": round(bmr_mifflin, 1),
                "bmr_katch_mcardle": round(bmr_katch, 1),
                "tdee": round(tdee, 1),
                "target_calories": round(target_calories, 1),
                "goal_adjustment": goal_adjustment,
                "estimated_body_fat": round(body_fat, 1),
                "bmi": bmi,
                "activity_multiplier": multiplier
            }
            
            logger.info(f"Calculated calories for user: {target_calories} kcal/day")
            return results
            
        except Exception as e:
            logger.error(f"Calorie calculation failed: {e}")
            raise CalorieCalculationError(f"Failed to calculate calories: {e}")


# Global calculator instance
calorie_calculator = CalorieCalculator()


def estimate_calories(user_profile: UserProfile) -> float:
    """
    Backward compatible function that returns target calories as float
    """
    try:
        results = calorie_calculator.calculate_calories_comprehensive(user_profile)
        return results["target_calories"]
    except Exception as e:
        logger.error(f"Calorie estimation failed, using fallback: {e}")
        # Fallback to simple calculation
        return _fallback_calorie_calculation(user_profile)


def _fallback_calorie_calculation(user_profile: UserProfile) -> float:
    """Simple fallback calorie calculation"""
    try:
        # Basic BMR calculation
        weight = user_profile.Weight_kg
        height = user_profile.Height_cm
        age = user_profile.Age
        
        if user_profile.Gender == GenderEnum.MALE:
            bmr = 10 * weight + 6.25 * height - 5 * age + 5
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        
        # Apply activity multiplier
        activity_map = {
            ActivityLevelEnum.SEDENTARY: 1.2,
            ActivityLevelEnum.MODERATE: 1.55,
            ActivityLevelEnum.ACTIVE: 1.725
        }
        
        maintenance = bmr * activity_map.get(user_profile.Physical_Activity_Level, 1.55)
        
        # Apply goal adjustment
        if user_profile.Goal == GoalEnum.WEIGHT_LOSS:
            return max(1200, maintenance - 400)
        elif user_profile.Goal == GoalEnum.WEIGHT_GAIN:
            return maintenance + 400
        
        return maintenance
        
    except Exception as e:
        logger.error(f"Fallback calculation failed: {e}")
        return 2000.0  # Safe default


def get_calorie_breakdown(user_profile: UserProfile) -> Dict[str, float]:
    """Get detailed calorie breakdown including macronutrients"""
    try:
        results = calorie_calculator.calculate_calories_comprehensive(user_profile)
        target_calories = results["target_calories"]
        
        # Calculate macronutrient distribution (standard ratios)
        protein_ratio = 0.25  # 25% protein
        fat_ratio = 0.30      # 30% fat
        carb_ratio = 0.45     # 45% carbohydrates
        
        protein_calories = target_calories * protein_ratio
        fat_calories = target_calories * fat_ratio
        carb_calories = target_calories * carb_ratio
        
        # Convert to grams (4 cal/g protein, 9 cal/g fat, 4 cal/g carbs)
        protein_grams = protein_calories / 4
        fat_grams = fat_calories / 9
        carb_grams = carb_calories / 4
        
        breakdown = {
            **results,  # Include all previous results
            "protein_calories": round(protein_calories, 1),
            "fat_calories": round(fat_calories, 1),
            "carb_calories": round(carb_calories, 1),
            "protein_grams": round(protein_grams, 1),
            "fat_grams": round(fat_grams, 1),
            "carb_grams": round(carb_grams, 1)
        }
        
        return breakdown
        
    except Exception as e:
        logger.error(f"Calorie breakdown calculation failed: {e}")
        raise CalorieCalculationError(f"Failed to calculate calorie breakdown: {e}")


# For testing
if __name__ == "__main__":
    from models import UserProfile, GenderEnum, ActivityLevelEnum, GoalEnum
    
    # Test user profile
    test_user = UserProfile(
        Age=30,
        Gender=GenderEnum.FEMALE,
        Weight_kg=65,
        Height_cm=165,
        Physical_Activity_Level=ActivityLevelEnum.MODERATE,
        Goal=GoalEnum.MAINTENANCE
    )
    
    # Test calorie calculation
    try:
        calories = estimate_calories(test_user)
        print(f"Target calories: {calories}")
        
        breakdown = get_calorie_breakdown(test_user)
        print(f"Detailed breakdown: {breakdown}")
        
    except Exception as e:
        print(f"Test failed: {e}")