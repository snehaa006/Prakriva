"""
Enhanced dataset loader with validation, caching, and error handling
"""
import pandas as pd
import os
from typing import Dict, Optional
from functools import lru_cache
from loguru import logger
from config import settings
from exceptions import DatasetError


# Mapping for Dosha text values in food
DOSHA_MAP = {"decreases": -1, "neutral": 0, "increases": 1}


class DatasetLoader:
    """Enhanced dataset loader with caching and validation"""
    
    def __init__(self):
        self._cache = {}
    
    @staticmethod
    def _validate_file_exists(path: str) -> None:
        """Validate that dataset file exists"""
        if not os.path.exists(path):
            raise DatasetError(f"Dataset file not found: {path}", "FILE_NOT_FOUND")
    
    @staticmethod
    def _safe_numeric_conversion(df: pd.DataFrame, columns: list) -> pd.DataFrame:
        """Safely convert columns to numeric with error handling"""
        for col in columns:
            if col in df.columns:
                try:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
                except Exception as e:
                    logger.warning(f"Failed to convert {col} to numeric: {e}")
        return df
    
    @lru_cache(maxsize=4)
    def load_food_dataset(self, path: Optional[str] = None) -> pd.DataFrame:
        """Load and process food dataset with caching"""
        path = path or settings.FOOD_DATASET_PATH
        logger.info(f"Loading food dataset from: {path}")
        
        try:
            self._validate_file_exists(path)
            df = pd.read_csv(path)
            
            # Clean column names
            df.columns = [c.strip() for c in df.columns]
            
            # Convert numeric columns safely
            numeric_cols = ["Calories", "Protein", "Carbs", "Fat"]
            df = self._safe_numeric_conversion(df, numeric_cols)
            
            # Process dosha mappings
            for dosha in ["Vata", "Pitta", "Kapha"]:
                col = f"Dosha_{dosha}"
                if col in df.columns:
                    df[col] = (df[col]
                              .fillna("neutral")
                              .astype(str)
                              .str.lower()
                              .str.strip()
                              .map(DOSHA_MAP)
                              .fillna(0))
            
            # Create dietary flags
            df["is_veg"] = (df.get("Vegetarian", "")
                           .astype(str)
                           .str.lower()
                           .isin(["yes", "true", "y", "1"]))
            
            df["is_vegan"] = (df.get("Vegan", "")
                             .astype(str)
                             .str.lower()
                             .isin(["yes", "true", "y", "1"]))
            
            # Create searchable food key
            df["food_key"] = (df["Food_Item"]
                             .astype(str)
                             .str.strip()
                             .str.lower())
            
            # Validate essential columns
            required_cols = ["Food_Item", "Calories"]
            missing_cols = [col for col in required_cols if col not in df.columns]
            if missing_cols:
                raise DatasetError(
                    f"Missing required columns in food dataset: {missing_cols}",
                    "MISSING_COLUMNS"
                )
            
            logger.success(f"Loaded food dataset: {df.shape[0]} items")
            return df
            
        except Exception as e:
            logger.error(f"Failed to load food dataset: {e}")
            raise DatasetError(f"Failed to load food dataset: {e}", "LOAD_FAILED")
    
    @lru_cache(maxsize=4)
    def load_dosha_dataset(self, path: Optional[str] = None) -> pd.DataFrame:
        """Load dosha dataset with validation"""
        path = path or settings.DOSHA_DATASET_PATH
        logger.info(f"Loading dosha dataset from: {path}")
        
        try:
            self._validate_file_exists(path)
            df = pd.read_csv(path)
            df.columns = [c.strip() for c in df.columns]
            
            # Validate dosha column exists
            if "Dosha" not in df.columns:
                raise DatasetError("Missing 'Dosha' column", "MISSING_COLUMNS")
            
            logger.success(f"Loaded dosha dataset: {df.shape[0]} records")
            return df
            
        except Exception as e:
            logger.error(f"Failed to load dosha dataset: {e}")
            raise DatasetError(f"Failed to load dosha dataset: {e}", "LOAD_FAILED")
    
    @lru_cache(maxsize=4)
    def load_patient_dataset(self, path: Optional[str] = None) -> pd.DataFrame:
        """Load patient dataset with validation"""
        path = path or settings.PATIENT_DATASET_PATH
        logger.info(f"Loading patient dataset from: {path}")
        
        try:
            self._validate_file_exists(path)
            df = pd.read_csv(path)
            df.columns = [c.strip() for c in df.columns]
            
            # Convert numeric fields safely
            numeric_cols = ["Age", "Weight_kg", "Height_cm", "BMI", "Daily_Caloric_Intake"]
            df = self._safe_numeric_conversion(df, numeric_cols)
            
            # Create patient key for lookup
            if "Patient_ID" in df.columns:
                df["patient_key"] = (df["Patient_ID"]
                                   .astype(str)
                                   .str.strip()
                                   .str.lower())
            
            logger.success(f"Loaded patient dataset: {df.shape[0]} records")
            return df
            
        except Exception as e:
            logger.error(f"Failed to load patient dataset: {e}")
            raise DatasetError(f"Failed to load patient dataset: {e}", "LOAD_FAILED")
    
    @lru_cache(maxsize=4)
    def load_lifestyle_dataset(self, path: Optional[str] = None) -> pd.DataFrame:
        """Load lifestyle dataset with validation"""
        path = path or settings.LIFESTYLE_DATASET_PATH
        logger.info(f"Loading lifestyle dataset from: {path}")
        
        try:
            self._validate_file_exists(path)
            df = pd.read_csv(path)
            df.columns = [c.strip() for c in df.columns]
            
            # Convert numeric fields safely
            numeric_cols = ["GPA", "calories_day", "fruit_day", 
                          "waffle_calories", "tortilla_calories", "turkey_calories"]
            df = self._safe_numeric_conversion(df, numeric_cols)
            
            # Create patient key for lookup
            if "Patient_ID" in df.columns:
                df["patient_key"] = (df["Patient_ID"]
                                   .astype(str)
                                   .str.strip()
                                   .str.lower())
            
            logger.success(f"Loaded lifestyle dataset: {df.shape[0]} records")
            return df
            
        except Exception as e:
            logger.error(f"Failed to load lifestyle dataset: {e}")
            raise DatasetError(f"Failed to load lifestyle dataset: {e}", "LOAD_FAILED")
    
    def load_all_datasets(self) -> Dict[str, pd.DataFrame]:
        """Load all datasets with comprehensive error handling"""
        logger.info("Loading all datasets...")
        
        datasets = {}
        errors = []
        
        dataset_loaders = {
            "food": self.load_food_dataset,
            "dosha": self.load_dosha_dataset,
            "patient": self.load_patient_dataset,
            "lifestyle": self.load_lifestyle_dataset
        }
        
        for name, loader in dataset_loaders.items():
            try:
                datasets[name] = loader()
            except DatasetError as e:
                logger.error(f"Failed to load {name} dataset: {e.message}")
                errors.append(f"{name}: {e.message}")
        
        if not datasets.get("food") or not datasets.get("dosha"):
            raise DatasetError(
                "Critical datasets (food, dosha) failed to load",
                "CRITICAL_DATASETS_MISSING"
            )
        
        if errors:
            logger.warning(f"Some datasets failed to load: {errors}")
        
        logger.success(f"Successfully loaded {len(datasets)} datasets")
        return datasets
    
    def get_dataset_info(self) -> Dict[str, Dict]:
        """Get information about loaded datasets"""
        try:
            datasets = self.load_all_datasets()
            info = {}
            
            for name, df in datasets.items():
                info[name] = {
                    "shape": df.shape,
                    "columns": list(df.columns),
                    "memory_usage_mb": round(df.memory_usage(deep=True).sum() / 1024**2, 2),
                    "null_counts": df.isnull().sum().to_dict()
                }
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get dataset info: {e}")
            return {}


# Global dataset loader instance
dataset_loader = DatasetLoader()


def load_all_datasets() -> Dict[str, pd.DataFrame]:
    """Convenience function for backward compatibility"""
    return dataset_loader.load_all_datasets()


if __name__ == "__main__":
    # Test dataset loading
    try:
        data = load_all_datasets()
        for name, df in data.items():
            print(f"{name}: {df.shape}")
        
        # Print dataset info
        info = dataset_loader.get_dataset_info()
        print("\nDataset Information:")
        for name, details in info.items():
            print(f"{name}: {details['shape']} - {details['memory_usage_mb']}MB")
            
    except Exception as e:
        print(f"Error: {e}")