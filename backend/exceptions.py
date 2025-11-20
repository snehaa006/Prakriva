"""
Custom exceptions for the Ayurvedic Meal Planner API
"""


class AyurvedicPlannerError(Exception):
    """Base exception for all planner errors"""
    def __init__(self, message: str, error_code: str = None):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class DatasetError(AyurvedicPlannerError):
    """Raised when there are issues with dataset loading or processing"""
    pass


class ModelError(AyurvedicPlannerError):
    """Raised when there are ML model related errors"""
    pass


class DoshaPredictionError(AyurvedicPlannerError):
    """Raised when dosha prediction fails"""
    pass


class MealPlanGenerationError(AyurvedicPlannerError):
    """Raised when meal plan generation fails"""
    pass


class DatabaseError(AyurvedicPlannerError):
    """Raised when database operations fail"""
    pass


class ValidationError(AyurvedicPlannerError):
    """Raised when input validation fails"""
    pass


class LLMError(AyurvedicPlannerError):
    """Raised when LLM API calls fail"""
    pass


class CalorieCalculationError(AyurvedicPlannerError):
    """Raised when calorie calculation fails"""
    pass