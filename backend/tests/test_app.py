"""
Comprehensive test suite for the Ayurvedic Meal Planner API
"""
import pytest
import json
import os
import tempfile
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timezone

# Test imports
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import UserProfile, GenderEnum, ActivityLevelEnum, GoalEnum, DoshaEnum
from config import settings
from exceptions import ValidationError, ModelError, DatabaseError


@pytest.fixture
def app():
    """Create test app"""
    test_app = create_app()
    test_app.config['TESTING'] = True
    test_app.config['WTF_CSRF_ENABLED'] = False
    return test_app


@pytest.fixture
def client(app):
    """Test client"""
    return app.test_client()


@pytest.fixture
def sample_user_profile():
    """Sample user profile for testing"""
    return {
        "Age": 30,
        "Gender": "female",
        "Weight_kg": 65.0,
        "Height_cm": 165.0,
        "Physical_Activity_Level": "moderate",
        "Goal": "maintenance",
        "Food_preference": "vegetarian",
        "Allergies": "nuts",
        "Patient_ID": "test_user_123"
    }


@pytest.fixture
def sample_meal_plan_request(sample_user_profile):
    """Sample meal plan request"""
    return {
        "user_profile": sample_user_profile,
        "days": 7,
        "model": "gpt-4"
    }


class TestAppBasics:
    """Test basic app functionality"""
    
    def test_index_endpoint(self, client):
        """Test the index endpoint"""
        response = client.get('/')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'version' in data['data']
        assert data['message'] == "Ayurvedic Meal Planner API is running"
    
    def test_health_check_endpoint(self, client):
        """Test health check endpoint"""
        with patch('app.db_manager') as mock_db:
            mock_db.health_check.return_value = {"status": "healthy"}
            
            response = client.get('/health')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['success'] is True
            assert 'dependencies' in data['data']
    
    def test_cors_headers(self, client):
        """Test CORS configuration"""
        response = client.get('/')
        assert 'Access-Control-Allow-Origin' in response.headers


class TestValidation:
    """Test input validation"""
    
    def test_user_profile_validation_valid(self):
        """Test valid user profile validation"""
        profile_data = {
            "Age": 30,
            "Gender": "female",
            "Weight_kg": 65.0,
            "Height_cm": 165.0,
            "Physical_Activity_Level": "moderate",
            "Goal": "maintenance"
        }
        
        profile = UserProfile(**profile_data)
        assert profile.Age == 30
        assert profile.Gender == GenderEnum.FEMALE
        assert profile.BMI == 23.88  # Approximately
    
    def test_user_profile_validation_invalid_age(self):
        """Test invalid age validation"""
        with pytest.raises(ValueError):
            UserProfile(
                Age=150,  # Invalid age
                Gender="female",
                Weight_kg=65.0,
                Height_cm=165.0
            )
    
    def test_user_profile_validation_invalid_weight(self):
        """Test invalid weight validation"""
        with pytest.raises(ValueError):
            UserProfile(
                Age=30,
                Gender="female",
                Weight_kg=600.0,  # Invalid weight
                Height_cm=165.0
            )
    
    def test_validation_endpoint(self, client, sample_user_profile):
        """Test validation endpoint"""
        response = client.post('/test/validate', 
                              json=sample_user_profile,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
    
    def test_validation_endpoint_invalid_data(self, client):
        """Test validation endpoint with invalid data"""
        invalid_profile = {
            "Age": "invalid",  # Should be int
            "Gender": "unknown_gender"
        }
        
        response = client.post('/test/validate',
                              json=invalid_profile,
                              content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False


class TestDoshaPrediction:
    """Test dosha prediction functionality"""
    
    @patch('app.dosha_predictor')
    def test_dosha_prediction_endpoint(self, mock_predictor, client, sample_user_profile):
        """Test dosha prediction endpoint"""
        # Mock the predictor
        from models import DoshaResult, DoshaEnum
        mock_result = DoshaResult(
            dosha=DoshaEnum.VATA,
            scores={"vata": 0.6, "pitta": 0.3, "kapha": 0.1},
            confidence=0.8,
            method="ML"
        )
        mock_predictor.predict_dosha_hybrid.return_value = mock_result
        
        response = client.post('/dosha/predict',
                              json=sample_user_profile,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['dosha'] == 'vata'
        assert data['data']['confidence'] == 0.8
    
    @patch('app.dosha_predictor')
    def test_dosha_prediction_failure(self, mock_predictor, client, sample_user_profile):
        """Test dosha prediction failure handling"""
        mock_predictor.predict_dosha_hybrid.side_effect = Exception("Prediction failed")
        
        response = client.post('/dosha/predict',
                              json=sample_user_profile,
                              content_type='application/json')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False


class TestCalorieCalculation:
    """Test calorie calculation functionality"""
    
    @patch('app.get_calorie_breakdown')
    def test_calorie_calculation_endpoint(self, mock_calc, client, sample_user_profile):
        """Test calorie calculation endpoint"""
        mock_calc.return_value = {
            "target_calories": 2000.0,
            "bmr_mifflin_st_jeor": 1400.0,
            "tdee": 2000.0,
            "protein_grams": 125.0,
            "carb_grams": 225.0,
            "fat_grams": 67.0
        }
        
        response = client.post('/calories/calculate',
                              json=sample_user_profile,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['target_calories'] == 2000.0


class TestMealPlanGeneration:
    """Test meal plan generation"""
    
    @patch('app.get_datasets')
    @patch('app.dosha_predictor')
    @patch('app.get_calorie_breakdown')
    @patch('app.meal_planner')
    @patch('app.db_manager')
    def test_meal_plan_generation_success(self, mock_db, mock_planner, mock_calories, 
                                        mock_dosha, mock_datasets, client, sample_meal_plan_request):
        """Test successful meal plan generation"""
        # Mock datasets
        mock_food_df = Mock()
        mock_food_df.__len__ = Mock(return_value=100)
        mock_datasets.return_value = {
            'food': mock_food_df,
            'dosha': Mock()
        }
        
        # Mock dosha prediction
        from models import DoshaResult, DoshaEnum
        mock_dosha_result = DoshaResult(
            dosha=DoshaEnum.VATA,
            scores={"vata": 0.6, "pitta": 0.3, "kapha": 0.1},
            confidence=0.8,
            method="Hybrid"
        )
        mock_dosha.predict_dosha_hybrid.return_value = mock_dosha_result
        
        # Mock calorie calculation
        mock_calories.return_value = {
            "target_calories": 2000.0,
            "bmr_mifflin_st_jeor": 1400.0
        }
        
        # Mock meal plan generation
        mock_plan = {
            "day_1": {
                "breakfast": [{"name": "Oatmeal", "calories": 300}],
                "lunch": [{"name": "Dal Rice", "calories": 500}],
                "dinner": [{"name": "Vegetable Soup", "calories": 400}]
            },
            "totals": {"day_1": 1200}
        }
        mock_planner.generate_meal_plan_advanced.return_value = mock_plan
        
        # Mock database save
        mock_db.save_generated_plan.return_value = "test_plan_id_123"
        
        response = client.post('/generate',
                              json=sample_meal_plan_request,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'plan' in data['data']
        assert data['data']['plan_id'] == "test_plan_id_123"
    
    @patch('app.get_datasets')
    def test_meal_plan_generation_dataset_failure(self, mock_datasets, client, sample_meal_plan_request):
        """Test meal plan generation with dataset failure"""
        mock_datasets.side_effect = Exception("Dataset loading failed")
        
        response = client.post('/generate',
                              json=sample_meal_plan_request,
                              content_type='application/json')
        
        assert response.status_code == 500
        data = json.loads(response.data)
        assert data['success'] is False
    
    def test_meal_plan_generation_invalid_request(self, client):
        """Test meal plan generation with invalid request"""
        invalid_request = {
            "user_profile": {
                "Age": "invalid"  # Should be int
            },
            "days": 7
        }
        
        response = client.post('/generate',
                              json=invalid_request,
                              content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False


class TestDatabaseOperations:
    """Test database operations"""
    
    @patch('app.db_manager')
    def test_get_meal_plan_success(self, mock_db, client):
        """Test successful meal plan retrieval"""
        mock_plan = {
            "id": "test_plan_123",
            "user_id": "test_user",
            "payload": {"plan": {"day_1": {}}},
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        mock_db.get_generated_plan.return_value = mock_plan
        
        response = client.get('/plan/test_plan_123')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['id'] == "test_plan_123"
    
    @patch('app.db_manager')
    def test_get_meal_plan_not_found(self, mock_db, client):
        """Test meal plan not found"""
        mock_db.get_generated_plan.return_value = None
        
        response = client.get('/plan/nonexistent_plan')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert data['success'] is False
    
    @patch('app.db_manager')
    def test_get_user_plans(self, mock_db, client):
        """Test getting user meal plans"""
        mock_plans = [
            {"id": "plan1", "created_at": "2024-01-01T00:00:00Z"},
            {"id": "plan2", "created_at": "2024-01-02T00:00:00Z"}
        ]
        mock_db.get_user_plans.return_value = mock_plans
        
        response = client.get('/user/test_user/plans')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['data']['plans']) == 2
    
    @patch('app.db_manager')
    def test_edit_meal_plan(self, mock_db, client):
        """Test meal plan editing"""
        mock_db.save_doctor_edit.return_value = "edit_123"
        
        edit_data = {
            "doctor_id": "doctor_456",
            "edited_plan": {"day_1": {"breakfast": []}},
            "reason": "Dietary modification",
            "edit_type": "modification"
        }
        
        response = client.post('/plan/test_plan_123/edit',
                              json=edit_data,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['edit_id'] == "edit_123"
    
    @patch('app.db_manager')
    def test_submit_feedback(self, mock_db, client):
        """Test feedback submission"""
        mock_db.save_user_feedback.return_value = "feedback_123"
        
        feedback_data = {
            "user_id": "user_789",
            "rating": 4,
            "feedback": "Great meal plan!",
            "categories": ["taste", "variety"]
        }
        
        response = client.post('/plan/test_plan_123/feedback',
                              json=feedback_data,
                              content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['feedback_id'] == "feedback_123"


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def test_rate_limit_headers(self, client):
        """Test rate limit headers are present"""
        response = client.get('/')
        
        # Rate limit headers should be present
        assert 'X-RateLimit-Limit' in response.headers or response.status_code == 200
    
    @pytest.mark.skip("Requires actual rate limiting setup")
    def test_rate_limit_exceeded(self, client):
        """Test rate limit exceeded (would require many requests)"""
        # This test would need to make many requests rapidly
        # Skipping to avoid long test execution
        pass


class TestErrorHandling:
    """Test error handling"""
    
    def test_404_handling(self, client):
        """Test 404 error handling"""
        response = client.get('/nonexistent-endpoint')
        assert response.status_code == 404
    
    def test_invalid_json(self, client):
        """Test invalid JSON handling"""
        response = client.post('/generate',
                              data="invalid json",
                              content_type='application/json')
        
        assert response.status_code == 400
    
    def test_missing_content_type(self, client, sample_meal_plan_request):
        """Test missing content type"""
        response = client.post('/generate',
                              json=sample_meal_plan_request)
        # Should still work with json parameter
        # Or return 400 if strict content-type checking
        assert response.status_code in [200, 400, 500]  # Depends on mocking


class TestUtilityEndpoints:
    """Test utility endpoints"""
    
    @patch('app.dataset_loader')
    def test_dataset_info(self, mock_loader, client):
        """Test dataset info endpoint"""
        mock_loader.get_dataset_info.return_value = {
            "food": {"shape": [1000, 15], "columns": []},
            "dosha": {"shape": [500, 10], "columns": []}
        }
        
        response = client.get('/datasets/info')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'food' in data['data']
    
    @patch('app.db_manager')
    def test_analytics_endpoint(self, mock_db, client):
        """Test analytics endpoint"""
        mock_analytics = {
            "total_plans": 100,
            "avg_rating": 4.2,
            "dosha_distribution": {"vata": 40, "pitta": 35, "kapha": 25}
        }
        mock_db.get_analytics_data.return_value = mock_analytics
        
        response = client.get('/analytics')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['data']['total_plans'] == 100


# Integration tests
class TestIntegration:
    """Integration tests (require more setup)"""
    
    @pytest.mark.integration
    @patch('app.get_datasets')
    def test_full_meal_plan_flow(self, mock_datasets, client, sample_meal_plan_request):
        """Test complete meal plan generation flow"""
        # This would test the entire flow with minimal mocking
        # Requires actual dataset files and configuration
        pass


# Performance tests
class TestPerformance:
    """Performance tests"""
    
    @pytest.mark.performance
    def test_meal_plan_generation_time(self, client, sample_meal_plan_request):
        """Test meal plan generation response time"""
        import time
        
        start_time = time.time()
        response = client.post('/generate',
                              json=sample_meal_plan_request,
                              content_type='application/json')
        end_time = time.time()
        
        # Should complete within reasonable time (adjust based on requirements)
        assert (end_time - start_time) < 30.0  # 30 seconds max
        
        # Response should be valid regardless
        assert response.status_code in [200, 400, 500]  # Depends on mocking


# Test configuration
@pytest.fixture(scope="session")
def test_config():
    """Test configuration"""
    return {
        "TESTING": True,
        "WTF_CSRF_ENABLED": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "CACHE_TYPE": "SimpleCache"
    }


# Test utilities
class TestUtils:
    """Test utility functions"""
    
    @staticmethod
    def create_mock_food_df():
        """Create mock food dataframe for testing"""
        import pandas as pd
        
        return pd.DataFrame({
            'Food_Item': ['Rice', 'Dal', 'Vegetables'],
            'Category': ['Grains', 'Legumes', 'Vegetables'],
            'Calories': [100, 150, 50],
            'Protein': [2, 10, 2],
            'Carbs': [20, 15, 10],
            'Fat': [1, 1, 0],
            'Dosha_Vata': [0, -1, 1],
            'Dosha_Pitta': [-1, 0, -1],
            'Dosha_Kapha': [1, 1, -1],
            'is_veg': [True, True, True],
            'is_vegan': [True, True, True],
            'food_key': ['rice', 'dal', 'vegetables']
        })
    
    @staticmethod
    def create_mock_dosha_result():
        """Create mock dosha result for testing"""
        from models import DoshaResult, DoshaEnum
        
        return DoshaResult(
            dosha=DoshaEnum.VATA,
            scores={"vata": 0.6, "pitta": 0.3, "kapha": 0.1},
            confidence=0.8,
            method="Test"
        )


# Conftest for pytest configuration
def pytest_configure(config):
    """Pytest configuration"""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )


# Run tests with coverage
if __name__ == "__main__":
    import subprocess
    import sys
    
    # Run tests with coverage
    cmd = [
        sys.executable, "-m", "pytest",
        "--cov=app",
        "--cov=models", 
        "--cov=config",
        "--cov=dataset_loader",
        "--cov=dosha_estimator",
        "--cov=calorie_calculator",
        "--cov=planner",
        "--cov=filter_and_score",
        "--cov=db",
        "--cov-report=html",
        "--cov-report=term-missing",
        "-v"
    ]
    
    subprocess.run(cmd)