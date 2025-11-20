"""
Enhanced meal planner with advanced LLM integration and fallback systems
"""
import os
import json
import re
from typing import Dict, List, Optional, Any, Union
from openai import OpenAI
from loguru import logger

from config import settings
from models import UserProfile, DoshaResult, MealPlan, MealItem, DayMeals
from filter_and_score import filter_foods_for_user, make_food_snippet, score_and_rank_foods
from exceptions import MealPlanGenerationError, LLMError


class MealPlanner:
    """Enhanced meal planner with multiple strategies"""
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.fallback_templates = self._load_fallback_templates()
    
    def _load_fallback_templates(self) -> Dict[str, List[Dict]]:
        """Load fallback meal templates for different doshas"""
        return {
            "vata": [
                {
                    "name": "Warm Oatmeal",
                    "ingredients": ["oats", "milk", "dates", "nuts"],
                    "portion": "1 bowl",
                    "calories": 300,
                    "reason": "Warm, nourishing, grounds Vata"
                },
                {
                    "name": "Vegetable Soup",
                    "ingredients": ["mixed vegetables", "ginger", "turmeric"],
                    "portion": "1 bowl",
                    "calories": 200,
                    "reason": "Warm, easy to digest"
                }
            ],
            "pitta": [
                {
                    "name": "Fresh Fruit Salad",
                    "ingredients": ["apple", "pear", "grapes", "mint"],
                    "portion": "1 bowl",
                    "calories": 150,
                    "reason": "Cooling, sweet, balances Pitta"
                },
                {
                    "name": "Cucumber Raita",
                    "ingredients": ["cucumber", "yogurt", "mint", "cumin"],
                    "portion": "1 serving",
                    "calories": 100,
                    "reason": "Cooling, soothing"
                }
            ],
            "kapha": [
                {
                    "name": "Spiced Tea",
                    "ingredients": ["ginger", "cardamom", "cinnamon", "black tea"],
                    "portion": "1 cup",
                    "calories": 20,
                    "reason": "Stimulating, warming, reduces Kapha"
                },
                {
                    "name": "Light Vegetable Stir-fry",
                    "ingredients": ["broccoli", "bell peppers", "ginger", "turmeric"],
                    "portion": "1 plate",
                    "calories": 250,
                    "reason": "Light, spiced, stimulating"
                }
            ]
        }
    
    def generate_meal_plan_advanced(
        self,
        user_profile: UserProfile,
        food_df,
        dosha_info: Union[DoshaResult, Dict],
        daily_calories: float,
        days: int = 7,
        model: str = None,
        preferences: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Advanced meal plan generation with multiple fallback strategies
        """
        try:
            model = model or settings.DEFAULT_MODEL
            
            # Convert dosha_info to dict if it's a DoshaResult
            if hasattr(dosha_info, 'dict'):
                dosha_dict = dosha_info.dict()
            else:
                dosha_dict = dosha_info
            
            target_dosha = dosha_dict.get("dosha")
            
            # Filter and score foods
            candidate_df = filter_foods_for_user(
                food_df, 
                user_profile, 
                target_dosha,
                max_items=200
            )
            
            if len(candidate_df) < 10:
                logger.warning("Very few suitable foods found, relaxing filters")
                candidate_df = filter_foods_for_user(
                    food_df,
                    user_profile,
                    target_dosha,
                    max_items=200,
                    dosha_strictness=0.3
                )
            
            # Score and rank foods
            scored_df = score_and_rank_foods(candidate_df, user_profile, dosha_dict)
            
            # Try different generation strategies
            strategies = [
                self._generate_with_structured_prompt,
                self._generate_with_simple_prompt,
                self._generate_with_template_guidance
            ]
            
            for i, strategy in enumerate(strategies):
                try:
                    logger.info(f"Trying meal plan generation strategy {i+1}")
                    plan = strategy(
                        user_profile, scored_df, dosha_dict, 
                        daily_calories, days, model, preferences
                    )
                    
                    if self._validate_plan(plan, days):
                        logger.success(f"Meal plan generated successfully with strategy {i+1}")
                        return plan
                    else:
                        logger.warning(f"Strategy {i+1} produced invalid plan")
                        
                except Exception as e:
                    logger.warning(f"Strategy {i+1} failed: {e}")
                    continue
            
            # Ultimate fallback
            logger.warning("All LLM strategies failed, using fallback template")
            return self._generate_fallback_plan(user_profile, dosha_dict, daily_calories, days)
            
        except Exception as e:
            logger.error(f"Meal plan generation completely failed: {e}")
            raise MealPlanGenerationError(f"Failed to generate meal plan: {e}")
    
    def _generate_with_structured_prompt(
        self, user_profile, food_df, dosha_info, daily_calories, days, model, preferences
    ) -> Dict[str, Any]:
        """Generate meal plan with detailed structured prompt"""
        
        food_snippet = make_food_snippet(food_df, n=80)
        
        # Calculate meal distribution
        breakfast_cal = int(daily_calories * 0.25)
        lunch_cal = int(daily_calories * 0.40)
        dinner_cal = int(daily_calories * 0.30)
        snack_cal = int(daily_calories * 0.05)
        
        prompt = f"""You are an expert Ayurvedic nutritionist. Create a {days}-day meal plan using ONLY the foods provided.

USER PROFILE:
- Age: {user_profile.Age}, Gender: {user_profile.Gender.value}
- Weight: {user_profile.Weight_kg}kg, Height: {user_profile.Height_cm}cm
- Activity: {user_profile.Physical_Activity_Level.value}
- Goal: {user_profile.Goal.value}
- Dosha: {dosha_info.get('dosha', 'unknown')} (confidence: {dosha_info.get('confidence', 0):.2f})
- Allergies: {getattr(user_profile, 'Allergies', None) or 'None'}
- Diet: {getattr(user_profile, 'Food_preference', 'No preference')}

CALORIE TARGETS:
- Total daily: {int(daily_calories)} calories
- Breakfast: ~{breakfast_cal} cal
- Lunch: ~{lunch_cal} cal  
- Dinner: ~{dinner_cal} cal
- Snacks: ~{snack_cal} cal

AYURVEDIC PRINCIPLES:
- For Vata: Warm, moist, grounding foods. Avoid cold, dry, light foods.
- For Pitta: Cool, sweet, mild foods. Avoid hot, spicy, acidic foods.
- For Kapha: Light, warm, spicy foods. Avoid heavy, cold, oily foods.

AVAILABLE FOODS:
{food_snippet}

REQUIREMENTS:
1. Use ONLY foods from the provided list
2. Include variety across days
3. Balance macronutrients appropriately
4. Follow Ayurvedic principles for the dominant dosha
5. Meet calorie targets (±50 calories per meal is acceptable)
6. Provide brief Ayurvedic reasoning for each meal

Return ONLY valid JSON in this exact format:
{{
  "day_1": {{
    "breakfast": [
      {{
        "name": "food name from list",
        "ingredients": ["ingredient1", "ingredient2"],
        "portion": "specific portion size",
        "calories": number,
        "protein": number,
        "carbs": number, 
        "fat": number,
        "reason": "Ayurvedic explanation"
      }}
    ],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  }},
  ... (continue for all {days} days),
  "totals": {{
    "day_1": total_calories_number,
    ...
  }},
  "summary": {{
    "total_foods_used": number,
    "dosha_focus": "{dosha_info.get('dosha', 'unknown')}",
    "avg_daily_calories": number
  }}
}}

Remember: Use precise food names from the provided list. Ensure nutritional balance and Ayurvedic appropriateness."""
        
        return self._call_llm_and_parse(prompt, model)
    
    def _generate_with_simple_prompt(
        self, user_profile, food_df, dosha_info, daily_calories, days, model, preferences
    ) -> Dict[str, Any]:
        """Simpler prompt for better parsing reliability"""
        
        # Get top foods only
        top_foods = food_df.head(40)
        food_list = []
        
        for _, row in top_foods.iterrows():
            food_info = f"{row['Food_Item']} ({int(row.get('Calories', 0))} cal"
            if 'user_score' in row:
                food_info += f", score: {row['user_score']:.1f}"
            food_info += ")"
            food_list.append(food_info)
        
        foods_text = "\n".join(food_list)
        
        prompt = f"""Create a {days}-day Ayurvedic meal plan for a {user_profile.Age}-year-old {user_profile.Gender.value}.
Target: {int(daily_calories)} calories/day
Dosha: {dosha_info.get('dosha', 'unknown')}

Available foods:
{foods_text}

Return only JSON format:
{{
  "day_1": {{"breakfast": [{{"name": "food", "portion": "1 serving", "calories": 200}}], "lunch": [...], "dinner": [...]}},
  "day_2": ...,
  "totals": {{"day_1": 2000, "day_2": 2000, ...}}
}}

Keep it simple but nutritionally balanced."""
        
        return self._call_llm_and_parse(prompt, model, max_tokens=1500)
    
    def _generate_with_template_guidance(
        self, user_profile, food_df, dosha_info, daily_calories, days, model, preferences
    ) -> Dict[str, Any]:
        """Use template-based approach with LLM customization"""
        
        target_dosha = dosha_info.get('dosha', 'vata').lower()
        base_templates = self.fallback_templates.get(target_dosha, self.fallback_templates['vata'])
        
        # Get food categories
        available_categories = food_df['Category'].value_counts().head(10).index.tolist()
        
        prompt = f"""Customize this meal template for {days} days using available foods.

User: {user_profile.Age}y {user_profile.Gender.value}, {target_dosha} dosha
Target: {int(daily_calories)} cal/day

Available food categories: {', '.join(available_categories)}

Base template foods: {json.dumps(base_templates[:3], indent=2)}

Create {days} days of meals using similar foods from available categories.
Return simple JSON with day_1, day_2, etc. and totals."""
        
        return self._call_llm_and_parse(prompt, model, max_tokens=1000)
    
    def _call_llm_and_parse(
        self, prompt: str, model: str, max_tokens: int = 2000, temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Call LLM and parse response with error handling"""
        
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert Ayurvedic nutritionist. Always return valid JSON only."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            json_text = self._extract_json_from_text(content)
            
            # Parse JSON
            plan = json.loads(json_text)
            
            return plan
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed: {e}")
            raise LLMError(f"Invalid JSON from LLM: {e}")
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise LLMError(f"LLM request failed: {e}")
    
    def _extract_json_from_text(self, text: str) -> str:
        """Extract JSON from potentially messy text"""
        
        # Remove markdown code blocks
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)
        
        # Find JSON-like structure
        json_pattern = r'\{[\s\S]*\}'
        match = re.search(json_pattern, text)
        
        if match:
            return match.group(0)
        
        # If no clear JSON found, try to clean the text
        text = text.strip()
        if text.startswith('{') and text.endswith('}'):
            return text
        
        raise ValueError("No valid JSON found in text")
    
    def _validate_plan(self, plan: Dict[str, Any], expected_days: int) -> bool:
        """Validate that the generated plan is structurally correct"""
        
        try:
            if not isinstance(plan, dict):
                return False
            
            # Check for required day keys
            day_keys = [f"day_{i+1}" for i in range(expected_days)]
            
            for day_key in day_keys:
                if day_key not in plan:
                    logger.warning(f"Missing day key: {day_key}")
                    return False
                
                day_data = plan[day_key]
                if not isinstance(day_data, dict):
                    return False
                
                # Check for required meal types
                required_meals = ['breakfast', 'lunch', 'dinner']
                for meal in required_meals:
                    if meal not in day_data:
                        logger.warning(f"Missing meal: {meal} in {day_key}")
                        return False
                    
                    if not isinstance(day_data[meal], list) or len(day_data[meal]) == 0:
                        logger.warning(f"Invalid meal data for {meal} in {day_key}")
                        return False
            
            # Check totals if present
            if 'totals' in plan:
                totals = plan['totals']
                if not isinstance(totals, dict):
                    return False
                
                for day_key in day_keys:
                    if day_key in totals:
                        total_cal = totals[day_key]
                        if not isinstance(total_cal, (int, float)) or total_cal <= 0:
                            logger.warning(f"Invalid total calories for {day_key}")
                            return False
            
            logger.info("Plan validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Plan validation failed: {e}")
            return False
    
    def _generate_fallback_plan(
        self, user_profile: UserProfile, dosha_info: Dict, 
        daily_calories: float, days: int
    ) -> Dict[str, Any]:
        """Generate a safe fallback meal plan"""
        
        try:
            target_dosha = dosha_info.get('dosha', 'vata').lower()
            templates = self.fallback_templates.get(target_dosha, self.fallback_templates['vata'])
            
            plan = {}
            
            # Create basic meals for each day
            for day in range(1, days + 1):
                day_key = f"day_{day}"
                
                # Simple meal structure
                daily_meals = {
                    "breakfast": [
                        {
                            "name": f"Ayurvedic Breakfast Bowl",
                            "ingredients": ["oats", "milk", "fruits", "nuts"],
                            "portion": "1 bowl",
                            "calories": int(daily_calories * 0.25),
                            "reason": f"Balancing for {target_dosha} dosha"
                        }
                    ],
                    "lunch": [
                        {
                            "name": "Balanced Vegetarian Meal",
                            "ingredients": ["rice", "dal", "vegetables", "ghee"],
                            "portion": "1 plate",
                            "calories": int(daily_calories * 0.40),
                            "reason": "Nourishing and balanced"
                        }
                    ],
                    "dinner": [
                        {
                            "name": "Light Evening Meal",
                            "ingredients": ["soup", "bread", "vegetables"],
                            "portion": "1 serving",
                            "calories": int(daily_calories * 0.30),
                            "reason": "Easy to digest"
                        }
                    ],
                    "snacks": [
                        {
                            "name": "Herbal Tea with Nuts",
                            "ingredients": ["herbal tea", "almonds"],
                            "portion": "1 cup + handful",
                            "calories": int(daily_calories * 0.05),
                            "reason": "Light and nourishing"
                        }
                    ]
                }
                
                plan[day_key] = daily_meals
            
            # Add totals
            plan["totals"] = {f"day_{i+1}": int(daily_calories) for i in range(days)}
            
            # Add metadata
            plan["summary"] = {
                "total_foods_used": len(templates) * 4,
                "dosha_focus": target_dosha,
                "avg_daily_calories": int(daily_calories),
                "method": "fallback_template"
            }
            
            logger.info("Generated fallback meal plan successfully")
            return plan
            
        except Exception as e:
            logger.error(f"Fallback plan generation failed: {e}")
            # Ultra-simple fallback
            return {
                "day_1": {
                    "breakfast": [{"name": "Simple breakfast", "calories": 400, "portion": "1 serving"}],
                    "lunch": [{"name": "Simple lunch", "calories": 600, "portion": "1 serving"}], 
                    "dinner": [{"name": "Simple dinner", "calories": 500, "portion": "1 serving"}]
                },
                "totals": {"day_1": 1500},
                "error": "Minimal fallback plan generated"
            }


# Global planner instance
meal_planner = MealPlanner()


# Backward compatibility function
def generate_meal_plan_llm(
    user_profile: UserProfile,
    food_df,
    dosha_info: Union[DoshaResult, Dict],
    daily_calories: float,
    days: int = 7,
    model: str = "gpt-4",
    food_snippet_rows: int = 60,
    max_tokens: int = 2000,
    temperature: float = 0.7
) -> Dict[str, Any]:
    """Backward compatible meal plan generation function"""
    
    try:
        # Convert old parameters to new format
        if isinstance(user_profile, dict):
            user_profile = UserProfile(**user_profile)
        
        result = meal_planner.generate_meal_plan_advanced(
            user_profile=user_profile,
            food_df=food_df,
            dosha_info=dosha_info,
            daily_calories=daily_calories,
            days=days,
            model=model
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Meal plan generation failed: {e}")
        return {
            "error": f"Meal plan generation failed: {str(e)}",
            "fallback": True,
            "day_1": {
                "breakfast": [{"name": "Basic breakfast", "calories": 300}],
                "lunch": [{"name": "Basic lunch", "calories": 500}],
                "dinner": [{"name": "Basic dinner", "calories": 400}]
            }
        }