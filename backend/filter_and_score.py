"""
Enhanced food filtering and scoring system with advanced algorithms
"""
import pandas as pd
import re
from typing import Dict, List, Optional, Tuple
from loguru import logger
from models import UserProfile, DoshaEnum
from exceptions import ValidationError


class FoodFilter:
    """Advanced food filtering and scoring system"""
    
    @staticmethod
    def parse_restrictions(restriction_str: str) -> List[str]:
        """Parse comma-separated restrictions into clean list"""
        if not restriction_str:
            return []
        
        restrictions = []
        for item in str(restriction_str).split(','):
            cleaned = item.strip().lower()
            if cleaned:
                restrictions.append(cleaned)
        return restrictions
    
    @staticmethod
    def create_regex_pattern(terms: List[str]) -> Optional[str]:
        """Create regex pattern for flexible matching"""
        if not terms:
            return None
        
        # Escape special characters and handle spaces
        escaped_terms = []
        for term in terms:
            # Replace spaces with flexible whitespace matching
            escaped = re.escape(term).replace(r'\ ', r'\s*')
            escaped_terms.append(escaped)
        
        return '|'.join(escaped_terms)
    
    @classmethod
    def filter_by_allergies(cls, df: pd.DataFrame, allergies: str) -> pd.DataFrame:
        """Filter out foods containing allergens"""
        if not allergies:
            return df
        
        allergen_list = cls.parse_restrictions(allergies)
        if not allergen_list:
            return df
        
        pattern = cls.create_regex_pattern(allergen_list)
        if not pattern:
            return df
        
        # Check both food name and ingredients if available
        mask = ~df["food_key"].str.contains(pattern, na=False, regex=True)
        
        # Also check ingredients column if it exists
        if "Ingredients" in df.columns:
            ingredients_mask = ~df["Ingredients"].astype(str).str.lower().str.contains(pattern, na=False, regex=True)
            mask = mask & ingredients_mask
        
        filtered_df = df[mask]
        removed = len(df) - len(filtered_df)
        
        if removed > 0:
            logger.info(f"Filtered out {removed} items due to allergies: {allergen_list}")
        
        return filtered_df
    
    @classmethod
    def filter_by_dietary_restrictions(cls, df: pd.DataFrame, restrictions: str) -> pd.DataFrame:
        """Filter out foods based on dietary restrictions"""
        if not restrictions:
            return df
        
        restriction_list = cls.parse_restrictions(restrictions)
        if not restriction_list:
            return df
        
        pattern = cls.create_regex_pattern(restriction_list)
        if not pattern:
            return df
        
        mask = ~df["food_key"].str.contains(pattern, na=False, regex=True)
        filtered_df = df[mask]
        removed = len(df) - len(filtered_df)
        
        if removed > 0:
            logger.info(f"Filtered out {removed} items due to restrictions: {restriction_list}")
        
        return filtered_df
    
    @classmethod
    def filter_by_diet_preference(cls, df: pd.DataFrame, user_profile: UserProfile) -> pd.DataFrame:
        """Filter based on vegetarian/vegan preferences"""
        food_pref = getattr(user_profile, 'Food_preference', None)
        
        if not food_pref:
            return df
        
        pref_str = food_pref.value.lower() if hasattr(food_pref, 'value') else str(food_pref).lower()
        
        if pref_str == "vegan":
            if "is_vegan" in df.columns:
                filtered_df = df[df["is_vegan"] == True]
                logger.info(f"Applied vegan filter: {len(filtered_df)}/{len(df)} items")
                return filtered_df
        elif pref_str == "vegetarian":
            if "is_veg" in df.columns:
                filtered_df = df[df["is_veg"] == True]
                logger.info(f"Applied vegetarian filter: {len(filtered_df)}/{len(df)} items")
                return filtered_df
        
        return df
    
    @classmethod
    def filter_by_dosha_balance(cls, df: pd.DataFrame, target_dosha: str, strictness: float = 0.7) -> pd.DataFrame:
        """Filter foods that help balance the target dosha"""
        if not target_dosha:
            return df
        
        dosha_col = f"Dosha_{target_dosha.capitalize()}"
        
        if dosha_col not in df.columns:
            logger.warning(f"Dosha column {dosha_col} not found")
            return df
        
        # Keep foods that are neutral or decrease the target dosha
        # strictness: 1.0 = only decreasing foods, 0.0 = all foods
        if strictness >= 0.8:
            # Very strict: only decreasing foods
            mask = df[dosha_col] < 0
        elif strictness >= 0.5:
            # Moderate: neutral and decreasing
            mask = df[dosha_col] <= 0
        else:
            # Lenient: allow slightly increasing foods too
            mask = df[dosha_col] <= 0.5
        
        filtered_df = df[mask]
        logger.info(f"Dosha filter ({target_dosha}): {len(filtered_df)}/{len(df)} items")
        
        return filtered_df
    
    @classmethod
    def filter_by_health_conditions(cls, df: pd.DataFrame, health_conditions: str) -> pd.DataFrame:
        """Filter foods based on health conditions"""
        if not health_conditions:
            return df
        
        conditions = cls.parse_restrictions(health_conditions)
        
        # Common condition-based food restrictions
        condition_restrictions = {
            'diabetes': ['sugar', 'honey', 'jaggery', 'sweet'],
            'hypertension': ['salt', 'sodium', 'pickle'],
            'heart disease': ['saturated fat', 'trans fat', 'cholesterol'],
            'kidney disease': ['protein', 'sodium', 'potassium'],
            'ibs': ['spicy', 'high fiber', 'dairy'],
            'gout': ['purine', 'organ meat', 'alcohol']
        }
        
        avoid_foods = set()
        for condition in conditions:
            condition_lower = condition.lower().strip()
            for health_condition, restrictions in condition_restrictions.items():
                if condition_lower in health_condition or health_condition in condition_lower:
                    avoid_foods.update(restrictions)
        
        if avoid_foods:
            pattern = cls.create_regex_pattern(list(avoid_foods))
            if pattern:
                mask = ~df["food_key"].str.contains(pattern, na=False, regex=True)
                filtered_df = df[mask]
                removed = len(df) - len(filtered_df)
                
                if removed > 0:
                    logger.info(f"Health condition filter removed {removed} items")
                
                return filtered_df
        
        return df
    
    @classmethod
    def score_foods_for_user(cls, df: pd.DataFrame, user_profile: UserProfile, 
                           dosha_result: Dict) -> pd.DataFrame:
        """Score foods based on user profile and dosha"""
        df_scored = df.copy()
        df_scored['user_score'] = 0.0
        
        target_dosha = dosha_result.get('dosha', '').lower()
        dosha_scores = dosha_result.get('scores', {})
        
        for idx, row in df_scored.iterrows():
            score = 0.0
            
            # Dosha balance score (most important)
            if target_dosha:
                dosha_col = f"Dosha_{target_dosha.capitalize()}"
                if dosha_col in row:
                    dosha_effect = row[dosha_col]
                    # Negative effect on dominant dosha is good
                    if dosha_effect < 0:
                        score += 40  # Strong positive
                    elif dosha_effect == 0:
                        score += 20  # Neutral is okay
                    else:
                        score -= 20  # Avoid increasing dominant dosha
            
            # Multi-dosha scoring
            for dosha, dosha_score in dosha_scores.items():
                dosha_col = f"Dosha_{dosha.capitalize()}"
                if dosha_col in row:
                    dosha_effect = row[dosha_col]
                    # Weight by dosha prominence in user
                    contribution = -dosha_effect * dosha_score * 20
                    score += contribution
            
            # Nutritional balance score
            calories = row.get('Calories', 0)
            protein = row.get('Protein', 0)
            
            # Moderate calorie foods preferred
            if 50 <= calories <= 400:
                score += 10
            elif calories > 600:
                score -= 10
            
            # Protein content bonus
            if protein > 5:
                score += 5
            
            # Category preferences
            category = str(row.get('Category', '')).lower()
            beneficial_categories = [
                'vegetables', 'fruits', 'whole grains', 
                'legumes', 'herbs', 'spices'
            ]
            
            for beneficial in beneficial_categories:
                if beneficial in category:
                    score += 15
                    break
            
            # Penalize processed foods
            processed_indicators = ['processed', 'packaged', 'canned', 'instant']
            food_name = str(row.get('Food_Item', '')).lower()
            
            for indicator in processed_indicators:
                if indicator in food_name or indicator in category:
                    score -= 15
                    break
            
            df_scored.at[idx, 'user_score'] = round(score, 2)
        
        # Sort by score (highest first)
        df_scored = df_scored.sort_values('user_score', ascending=False)
        
        return df_scored


def filter_foods_for_user(
    food_df: pd.DataFrame, 
    user_profile: UserProfile, 
    target_dosha: str = None,
    max_items: int = 150,
    dosha_strictness: float = 0.7
) -> pd.DataFrame:
    """
    Enhanced food filtering with comprehensive user preferences
    """
    try:
        logger.info(f"Starting food filtering for user with {len(food_df)} foods")
        
        df = food_df.copy()
        
        # Apply filters in order of importance
        
        # 1. Critical health and safety filters
        df = FoodFilter.filter_by_allergies(df, getattr(user_profile, 'Allergies', None))
        df = FoodFilter.filter_by_health_conditions(df, getattr(user_profile, 'Health_Conditions', None))
        
        # 2. Dietary preference filters
        df = FoodFilter.filter_by_diet_preference(df, user_profile)
        df = FoodFilter.filter_by_dietary_restrictions(df, getattr(user_profile, 'Dietary_Restrictions', None))
        
        # 3. Dosha-based filtering
        if target_dosha:
            df = FoodFilter.filter_by_dosha_balance(df, target_dosha, dosha_strictness)
        
        # 4. Ensure minimum variety
        if len(df) < 20 and dosha_strictness > 0.3:
            logger.warning("Too few foods after strict filtering, relaxing dosha filter")
            df = food_df.copy()
            # Reapply only critical filters
            df = FoodFilter.filter_by_allergies(df, getattr(user_profile, 'Allergies', None))
            df = FoodFilter.filter_by_diet_preference(df, user_profile)
            if target_dosha:
                df = FoodFilter.filter_by_dosha_balance(df, target_dosha, 0.3)  # More lenient
        
        # 5. Limit results for performance
        if len(df) > max_items:
            # Prioritize by calories for variety
            df = df.sort_values('Calories').head(max_items)
        
        logger.success(f"Food filtering complete: {len(df)} foods remaining")
        return df
        
    except Exception as e:
        logger.error(f"Food filtering failed: {e}")
        raise ValidationError(f"Failed to filter foods: {e}")


def make_food_snippet(food_df: pd.DataFrame, n: int = 60) -> str:
    """
    Create optimized food snippet for LLM with better formatting
    """
    try:
        if len(food_df) == 0:
            return "No suitable foods found."
        
        # Select most important columns
        essential_cols = ["Food_Item", "Category", "Calories", "Protein", "Carbs", "Fat"]
        dosha_cols = ["Dosha_Vata", "Dosha_Pitta", "Dosha_Kapha"]
        diet_cols = ["is_veg", "is_vegan"]
        
        available_cols = [col for col in essential_cols if col in food_df.columns]
        available_cols += [col for col in dosha_cols if col in food_df.columns]
        available_cols += [col for col in diet_cols if col in food_df.columns]
        
        # Add score column if available
        if 'user_score' in food_df.columns:
            available_cols.append('user_score')
        
        # Get top N foods
        sample_df = food_df.head(n)
        
        # Create compact representation
        lines = []
        lines.append("Available Foods (Name | Category | Calories | Protein | Carbs | Fat | Dosha Effects | Diet):")
        lines.append("-" * 100)
        
        for _, row in sample_df.iterrows():
            # Basic info
            name = str(row.get('Food_Item', 'Unknown'))[:30]
            category = str(row.get('Category', ''))[:15]
            calories = int(row.get('Calories', 0))
            protein = round(float(row.get('Protein', 0)), 1)
            carbs = round(float(row.get('Carbs', 0)), 1)
            fat = round(float(row.get('Fat', 0)), 1)
            
            # Dosha effects (simplified)
            dosha_effects = []
            for dosha in ['Vata', 'Pitta', 'Kapha']:
                col = f'Dosha_{dosha}'
                if col in row:
                    effect = row[col]
                    if effect > 0:
                        dosha_effects.append(f"{dosha}+")
                    elif effect < 0:
                        dosha_effects.append(f"{dosha}-")
            
            dosha_str = ",".join(dosha_effects) if dosha_effects else "neutral"
            
            # Diet info
            diet_info = []
            if row.get('is_vegan', False):
                diet_info.append('vegan')
            elif row.get('is_veg', False):
                diet_info.append('veg')
            
            diet_str = ",".join(diet_info) if diet_info else "non-veg"
            
            # Score if available
            score_str = f" ({round(row.get('user_score', 0), 1)})" if 'user_score' in row else ""
            
            line = f"{name} | {category} | {calories}cal | {protein}p | {carbs}c | {fat}f | {dosha_str} | {diet_str}{score_str}"
            lines.append(line)
        
        result = "\n".join(lines)
        
        # Add summary
        lines.append(f"\nTotal available foods: {len(food_df)}, showing top {min(n, len(food_df))}")
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to create food snippet: {e}")
        return f"Error creating food list: {e}"


def score_and_rank_foods(
    food_df: pd.DataFrame,
    user_profile: UserProfile,
    dosha_result: Dict,
    top_n: int = 100
) -> pd.DataFrame:
    """
    Score and rank foods for a specific user
    """
    try:
        scored_df = FoodFilter.score_foods_for_user(food_df, user_profile, dosha_result)
        
        # Add ranking
        scored_df['rank'] = range(1, len(scored_df) + 1)
        
        # Return top N
        result = scored_df.head(top_n)
        
        logger.info(f"Scored and ranked {len(result)} foods for user")
        
        return result
        
    except Exception as e:
        logger.error(f"Food scoring failed: {e}")
        return food_df.head(top_n)  # Fallback


# Backward compatibility
def filter_foods_by_preferences(food_df: pd.DataFrame, preferences: Dict) -> pd.DataFrame:
    """Legacy function for backward compatibility"""
    try:
        # Convert old preferences dict to UserProfile
        user_profile = UserProfile(
            Age=preferences.get('age', 30),
            Gender=preferences.get('gender', 'female'),
            Weight_kg=preferences.get('weight', 70),
            Height_cm=preferences.get('height', 165),
            Allergies=preferences.get('allergies'),
            Dietary_Restrictions=preferences.get('dietary_restrictions'),
            Food_preference=preferences.get('food_preference')
        )
        
        return filter_foods_for_user(
            food_df, 
            user_profile, 
            preferences.get('target_dosha'),
            preferences.get('max_items', 150)
        )
        
    except Exception as e:
        logger.error(f"Legacy filtering failed: {e}")
        return food_df