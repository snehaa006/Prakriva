"""
Enhanced hybrid dosha predictor combining ML and LLM approaches
"""
import os
import pickle
import json
import numpy as np
import pandas as pd
from typing import Dict, Optional, Tuple, Any
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier
from openai import OpenAI
from loguru import logger

from config import settings
from models import UserProfile, DoshaResult, DoshaEnum
from exceptions import ModelError, DoshaPredictionError, LLMError


class DoshaPredictor:
    """Enhanced dosha predictor with ML + LLM hybrid approach"""
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.ml_model = None
        self.label_encoder = None
        self.feature_encoders = {}
        self.scaler = None
        self.feature_columns = []
        self._load_ml_model()
    
    def _load_ml_model(self) -> None:
        """Load the trained ML model and preprocessors"""
        try:
            if not os.path.exists(settings.MODEL_PATH):
                logger.warning(f"ML model not found at {settings.MODEL_PATH}")
                return
            
            with open(settings.MODEL_PATH, 'rb') as f:
                model_data = pickle.load(f)
            
            self.ml_model = model_data.get('model')
            self.feature_encoders = model_data.get('encoders', {})
            self.scaler = model_data.get('scaler')
            self.label_encoder = model_data.get('target_le')
            
            if self.ml_model:
                self.feature_columns = list(self.feature_encoders.keys())
                logger.success("ML model loaded successfully")
            else:
                logger.warning("ML model data is incomplete")
                
        except Exception as e:
            logger.error(f"Failed to load ML model: {e}")
            self.ml_model = None
    
    def _preprocess_user_data(self, user_profile: UserProfile) -> Optional[np.ndarray]:
        """Preprocess user data for ML model"""
        try:
            if not self.ml_model or not self.feature_encoders:
                return None
            
            # Convert user profile to dict
            user_dict = user_profile.dict()
            
            # Create feature vector
            features = {}
            
            # Map user profile fields to model features
            field_mapping = {
                'Age': 'Age',
                'Gender': 'Gender',
                'Body_Frame': 'Body Frame',
                'Skin': 'Skin',
                'Hair': 'Hair',
                'Appetite': 'Appetite',
                'Sleep': 'Sleep',
                'Energy_Level': 'Energy Level',
                'Stress_Response': 'Stress Response',
                'Digestion': 'Digestion'
            }
            
            for user_field, model_field in field_mapping.items():
                if model_field in self.feature_columns:
                    value = user_dict.get(user_field)
                    if value is not None:
                        features[model_field] = str(value).lower() if isinstance(value, str) else value
                    else:
                        # Use default values for missing features
                        features[model_field] = self._get_default_value(model_field)
            
            # Encode categorical features
            encoded_features = []
            for col in self.feature_columns:
                if col in features:
                    value = features[col]
                    if col in self.feature_encoders:
                        try:
                            # Handle unseen categories
                            encoder = self.feature_encoders[col]
                            if hasattr(encoder, 'classes_') and value not in encoder.classes_:
                                # Use most common class as default
                                value = encoder.classes_[0]
                            encoded_value = encoder.transform([value])[0]
                            encoded_features.append(encoded_value)
                        except Exception:
                            encoded_features.append(0)  # Default encoding
                    else:
                        # Numeric feature
                        encoded_features.append(float(value) if value is not None else 0.0)
                else:
                    encoded_features.append(0)  # Missing feature default
            
            # Convert to numpy array and scale
            feature_array = np.array(encoded_features).reshape(1, -1)
            if self.scaler:
                feature_array = self.scaler.transform(feature_array)
            
            return feature_array
            
        except Exception as e:
            logger.error(f"Feature preprocessing failed: {e}")
            return None
    
    def _get_default_value(self, feature_name: str) -> str:
        """Get default values for missing features"""
        defaults = {
            'Gender': 'female',
            'Body Frame': 'medium',
            'Skin': 'normal',
            'Hair': 'normal',
            'Appetite': 'moderate',
            'Sleep': 'normal',
            'Energy Level': 'moderate',
            'Stress Response': 'moderate',
            'Digestion': 'normal'
        }
        return defaults.get(feature_name, 'moderate')
    
    def predict_dosha_ml(self, user_profile: UserProfile) -> Optional[DoshaResult]:
        """Predict dosha using ML model"""
        try:
            if not self.ml_model:
                logger.warning("ML model not available")
                return None
            
            features = self._preprocess_user_data(user_profile)
            if features is None:
                logger.warning("Feature preprocessing failed")
                return None
            
            # Get predictions and probabilities
            prediction = self.ml_model.predict(features)[0]
            probabilities = self.ml_model.predict_proba(features)[0]
            
            # Convert prediction back to dosha name
            dosha_name = self.label_encoder.inverse_transform([prediction])[0].lower()
            
            # Create score dictionary
            dosha_classes = [cls.lower() for cls in self.label_encoder.classes_]
            scores = dict(zip(dosha_classes, probabilities))
            
            # Calculate confidence (max probability)
            confidence = float(max(probabilities))
            
            result = DoshaResult(
                dosha=DoshaEnum(dosha_name),
                scores=scores,
                confidence=confidence,
                method="ML"
            )
            
            logger.info(f"ML dosha prediction: {dosha_name} (confidence: {confidence:.2f})")
            return result
            
        except Exception as e:
            logger.error(f"ML dosha prediction failed: {e}")
            return None
    
    def predict_dosha_llm(
        self, 
        user_profile: UserProfile, 
        dosha_df: Optional[pd.DataFrame] = None,
        model: str = None
    ) -> Optional[DoshaResult]:
        """Predict dosha using LLM"""
        try:
            model = model or settings.DEFAULT_MODEL
            
            # Build comprehensive prompt
            prompt = self._build_dosha_prompt(user_profile, dosha_df)
            
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Ayurvedic practitioner with deep knowledge of dosha analysis."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse LLM response
            result = self._parse_llm_dosha_response(content)
            if result:
                result.method = "LLM"
                logger.info(f"LLM dosha prediction: {result.dosha} (confidence: {result.confidence:.2f})")
            
            return result
            
        except Exception as e:
            logger.error(f"LLM dosha prediction failed: {e}")
            return None
    
    def _build_dosha_prompt(self, user_profile: UserProfile, dosha_df: Optional[pd.DataFrame]) -> str:
        """Build comprehensive prompt for dosha analysis"""
        
        user_data = {
            "age": user_profile.Age,
            "gender": user_profile.Gender.value,
            "weight_kg": user_profile.Weight_kg,
            "height_cm": user_profile.Height_cm,
            "bmi": user_profile.BMI,
            "activity_level": user_profile.Physical_Activity_Level.value,
            "goal": user_profile.Goal.value
        }
        
        # Add optional attributes if available
        optional_attrs = [
            'Body_Frame', 'Skin', 'Hair', 'Appetite', 'Sleep', 
            'Energy_Level', 'Stress_Response', 'Digestion'
        ]
        
        for attr in optional_attrs:
            value = getattr(user_profile, attr, None)
            if value:
                user_data[attr.lower()] = value
        
        prompt = f"""Analyze the following user profile and determine their primary dosha (Vata, Pitta, or Kapha) based on Ayurvedic principles:

User Profile:
{json.dumps(user_data, indent=2)}

Consider the following Ayurvedic characteristics:

VATA (Air + Space):
- Light, thin body frame
- Dry skin and hair
- Variable appetite
- Light sleep, easily disturbed
- High energy in bursts
- Quick to stress, anxious
- Irregular digestion

PITTA (Fire + Water):  
- Medium build
- Warm, oily skin
- Strong appetite
- Moderate sleep needs
- Consistent energy
- Intense, focused stress response
- Strong digestion

KAPHA (Earth + Water):
- Heavy, sturdy build
- Thick, moist skin
- Slow but steady appetite
- Deep, long sleep
- Steady, enduring energy
- Calm stress response
- Slow digestion

Provide your analysis in this exact JSON format:
{{
    "primary_dosha": "vata|pitta|kapha",
    "confidence": 0.0-1.0,
    "scores": {{
        "vata": 0.0-1.0,
        "pitta": 0.0-1.0,
        "kapha": 0.0-1.0
    }},
    "reasoning": "brief explanation of key factors"
}}

Ensure scores sum to 1.0 and reflect the relative strength of each dosha."""
        
        return prompt
    
    def _parse_llm_dosha_response(self, content: str) -> Optional[DoshaResult]:
        """Parse LLM response into DoshaResult"""
        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                logger.error("No JSON found in LLM response")
                return None
            
            data = json.loads(json_match.group())
            
            primary_dosha = data.get("primary_dosha", "").lower()
            confidence = float(data.get("confidence", 0.0))
            scores = data.get("scores", {})
            
            # Validate dosha
            if primary_dosha not in ["vata", "pitta", "kapha"]:
                logger.error(f"Invalid dosha from LLM: {primary_dosha}")
                return None
            
            # Normalize scores if they don't sum to 1
            score_sum = sum(scores.values())
            if score_sum > 0:
                scores = {k: v/score_sum for k, v in scores.items()}
            
            return DoshaResult(
                dosha=DoshaEnum(primary_dosha),
                scores=scores,
                confidence=confidence,
                method="LLM"
            )
            
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return None
    
    def predict_dosha_hybrid(
        self, 
        user_profile: UserProfile, 
        dosha_df: Optional[pd.DataFrame] = None,
        model: str = None
    ) -> DoshaResult:
        """Hybrid prediction combining ML and LLM"""
        try:
            ml_result = None
            llm_result = None
            
            # Try ML prediction first
            if self.ml_model:
                ml_result = self.predict_dosha_ml(user_profile)
            
            # Try LLM prediction
            llm_result = self.predict_dosha_llm(user_profile, dosha_df, model)
            
            # Combine results intelligently
            if ml_result and llm_result:
                return self._combine_predictions(ml_result, llm_result)
            elif ml_result:
                ml_result.method = "ML_only"
                return ml_result
            elif llm_result:
                llm_result.method = "LLM_only"
                return llm_result
            else:
                # Fallback to default
                return DoshaResult(
                    dosha=DoshaEnum.VATA,
                    scores={"vata": 0.4, "pitta": 0.3, "kapha": 0.3},
                    confidence=0.3,
                    method="fallback"
                )
                
        except Exception as e:
            logger.error(f"Hybrid prediction failed: {e}")
            raise DoshaPredictionError(f"Dosha prediction failed: {e}")
    
    def _combine_predictions(self, ml_result: DoshaResult, llm_result: DoshaResult) -> DoshaResult:
        """Intelligently combine ML and LLM predictions"""
        
        # Weight based on confidence
        ml_weight = ml_result.confidence
        llm_weight = llm_result.confidence
        total_weight = ml_weight + llm_weight
        
        if total_weight > 0:
            ml_weight /= total_weight
            llm_weight /= total_weight
        else:
            ml_weight = llm_weight = 0.5
        
        # Combine scores
        combined_scores = {}
        all_doshas = set(ml_result.scores.keys()) | set(llm_result.scores.keys())
        
        for dosha in all_doshas:
            ml_score = ml_result.scores.get(dosha, 0.0)
            llm_score = llm_result.scores.get(dosha, 0.0)
            combined_scores[dosha] = (ml_score * ml_weight) + (llm_score * llm_weight)
        
        # Determine primary dosha
        primary_dosha = max(combined_scores.keys(), key=lambda k: combined_scores[k])
        
        # Combined confidence (average weighted by agreement)
        agreement = 1.0 if ml_result.dosha == llm_result.dosha else 0.7
        combined_confidence = ((ml_result.confidence + llm_result.confidence) / 2) * agreement
        
        return DoshaResult(
            dosha=DoshaEnum(primary_dosha),
            scores=combined_scores,
            confidence=combined_confidence,
            method="Hybrid"
        )


# Global predictor instance
dosha_predictor = DoshaPredictor()


# Backward compatibility functions
def predict_dosha_ml(user_profile: UserProfile, model=None, label_encoder=None, 
                    encoders=None, scaler=None) -> str:
    """Backward compatible ML prediction function"""
    try:
        if isinstance(user_profile, dict):
            # Convert dict to UserProfile if needed
            user_profile = UserProfile(**user_profile)
        
        result = dosha_predictor.predict_dosha_ml(user_profile)
        return result.dosha.value if result else "Unknown"
    except Exception as e:
        logger.error(f"ML prediction failed: {e}")
        return "Unknown"


def predict_dosha_llm(user_profile: UserProfile, dosha_df=None, model="gpt-4") -> Dict:
    """Backward compatible LLM prediction function"""
    try:
        if isinstance(user_profile, dict):
            user_profile = UserProfile(**user_profile)
        
        result = dosha_predictor.predict_dosha_llm(user_profile, dosha_df, model)
        if result:
            return {
                "dosha": result.dosha.value,
                "scores": result.scores,
                "confidence": result.confidence
            }
        else:
            return {"dosha": "Unknown", "scores": {}, "confidence": 0.0}
    except Exception as e:
        logger.error(f"LLM prediction failed: {e}")
        return {"dosha": "Unknown", "scores": {}, "confidence": 0.0}


def load_model(model_path: str) -> Tuple:
    """Backward compatible model loading function"""
    try:
        predictor = DoshaPredictor()
        return (predictor.ml_model, predictor.label_encoder, 
                predictor.feature_encoders, predictor.scaler)
    except Exception as e:
        logger.error(f"Model loading failed: {e}")
        return (None, None, {}, None)