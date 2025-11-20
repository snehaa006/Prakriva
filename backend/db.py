"""
Enhanced database layer with comprehensive error handling and retry logic
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from loguru import logger

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud.exceptions import GoogleCloudError

from config import settings
from exceptions import DatabaseError


class FirestoreManager:
    """Enhanced Firestore database manager"""
    
    def __init__(self):
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self) -> None:
        """Initialize Firebase with proper error handling"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                if not os.path.exists(settings.FIREBASE_KEY_PATH):
                    raise DatabaseError(
                        f"Firebase credentials file not found: {settings.FIREBASE_KEY_PATH}",
                        "CREDENTIALS_NOT_FOUND"
                    )
                
                cred = credentials.Certificate(settings.FIREBASE_KEY_PATH)
                firebase_admin.initialize_app(cred)
                logger.success("Firebase initialized successfully")
            else:
                logger.info("Firebase already initialized")
            
            self.db = firestore.client()
            
            # Test connection
            self._test_connection()
            
        except Exception as e:
            logger.error(f"Firebase initialization failed: {e}")
            raise DatabaseError(f"Failed to initialize Firebase: {e}", "INIT_FAILED")
    
    def _test_connection(self) -> None:
        """Test database connectivity"""
        try:
            # Try to read from a test collection
            test_ref = self.db.collection('health_check').limit(1)
            list(test_ref.stream())
            logger.info("Database connection test successful")
        except Exception as e:
            logger.warning(f"Database connection test failed: {e}")
            # Don't raise error here as the database might be empty
    
    def _retry_operation(self, operation, max_retries: int = 3, delay: float = 1.0):
        """Retry database operations with exponential backoff"""
        import time
        
        for attempt in range(max_retries):
            try:
                return operation()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                
                wait_time = delay * (2 ** attempt)
                logger.warning(f"Database operation failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
    
    def save_generated_plan(
        self, 
        user_id: str, 
        payload: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Save generated meal plan with enhanced metadata
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _save_operation():
                doc_ref = self.db.collection(settings.GENERATED_PLANS_COL).document()
                
                # Prepare document data
                doc_data = {
                    "user_id": str(user_id),
                    "payload": payload,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "updated_at": firestore.SERVER_TIMESTAMP,
                    "version": settings.MODEL_VERSION,
                    "status": "active"
                }
                
                # Add metadata if provided
                if metadata:
                    doc_data["metadata"] = metadata
                
                # Add plan statistics
                if "plan" in payload:
                    plan_stats = self._calculate_plan_statistics(payload["plan"])
                    doc_data["statistics"] = plan_stats
                
                doc_ref.set(doc_data)
                return doc_ref.id
            
            doc_id = self._retry_operation(_save_operation)
            logger.success(f"Saved meal plan with ID: {doc_id}")
            return doc_id
            
        except Exception as e:
            logger.error(f"Failed to save meal plan: {e}")
            raise DatabaseError(f"Failed to save meal plan: {e}", "SAVE_FAILED")
    
    def get_generated_plan(self, plan_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a generated meal plan by ID
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _get_operation():
                doc_ref = self.db.collection(settings.GENERATED_PLANS_COL).document(plan_id)
                doc = doc_ref.get()
                
                if doc.exists:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    return data
                return None
            
            result = self._retry_operation(_get_operation)
            
            if result:
                logger.info(f"Retrieved meal plan: {plan_id}")
            else:
                logger.warning(f"Meal plan not found: {plan_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to get meal plan {plan_id}: {e}")
            raise DatabaseError(f"Failed to retrieve meal plan: {e}", "GET_FAILED")
    
    def get_user_plans(
        self, 
        user_id: str, 
        limit: int = 10, 
        status: str = "active"
    ) -> List[Dict[str, Any]]:
        """
        Get all meal plans for a specific user
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _query_operation():
                query = (self.db.collection(settings.GENERATED_PLANS_COL)
                        .where(filter=FieldFilter("user_id", "==", str(user_id)))
                        .where(filter=FieldFilter("status", "==", status))
                        .order_by("created_at", direction=firestore.Query.DESCENDING)
                        .limit(limit))
                
                docs = query.stream()
                plans = []
                
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    plans.append(data)
                
                return plans
            
            plans = self._retry_operation(_query_operation)
            logger.info(f"Retrieved {len(plans)} plans for user {user_id}")
            return plans
            
        except Exception as e:
            logger.error(f"Failed to get user plans for {user_id}: {e}")
            raise DatabaseError(f"Failed to retrieve user plans: {e}", "QUERY_FAILED")
    
    def update_plan_status(self, plan_id: str, status: str, reason: str = "") -> bool:
        """
        Update the status of a meal plan
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _update_operation():
                doc_ref = self.db.collection(settings.GENERATED_PLANS_COL).document(plan_id)
                
                update_data = {
                    "status": status,
                    "updated_at": firestore.SERVER_TIMESTAMP
                }
                
                if reason:
                    update_data["status_reason"] = reason
                
                doc_ref.update(update_data)
                return True
            
            success = self._retry_operation(_update_operation)
            logger.info(f"Updated plan {plan_id} status to {status}")
            return success
            
        except Exception as e:
            logger.error(f"Failed to update plan status {plan_id}: {e}")
            raise DatabaseError(f"Failed to update plan status: {e}", "UPDATE_FAILED")
    
    def save_doctor_edit(
        self, 
        plan_id: str, 
        doctor_id: str, 
        edited_plan: Dict[str, Any],
        reason: str = "",
        edit_type: str = "modification"
    ) -> str:
        """
        Save doctor edits with enhanced tracking
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _save_edit_operation():
                doc_ref = self.db.collection(settings.DOCTOR_EDITS_COL).document()
                
                doc_data = {
                    "plan_id": str(plan_id),
                    "doctor_id": str(doctor_id),
                    "edited_plan": edited_plan,
                    "reason": reason,
                    "edit_type": edit_type,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "status": "active",
                    "version": settings.MODEL_VERSION
                }
                
                # Calculate edit statistics
                if edited_plan:
                    edit_stats = self._calculate_edit_statistics(edited_plan)
                    doc_data["edit_statistics"] = edit_stats
                
                doc_ref.set(doc_data)
                return doc_ref.id
            
            edit_id = self._retry_operation(_save_edit_operation)
            
            # Also update the original plan to reference this edit
            try:
                self._link_edit_to_plan(plan_id, edit_id)
            except Exception as e:
                logger.warning(f"Failed to link edit to plan: {e}")
            
            logger.success(f"Saved doctor edit with ID: {edit_id}")
            return edit_id
            
        except Exception as e:
            logger.error(f"Failed to save doctor edit: {e}")
            raise DatabaseError(f"Failed to save doctor edit: {e}", "SAVE_EDIT_FAILED")
    
    def get_plan_edits(self, plan_id: str) -> List[Dict[str, Any]]:
        """
        Get all edits for a specific plan
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _query_edits():
                query = (self.db.collection(settings.DOCTOR_EDITS_COL)
                        .where(filter=FieldFilter("plan_id", "==", str(plan_id)))
                        .where(filter=FieldFilter("status", "==", "active"))
                        .order_by("created_at", direction=firestore.Query.DESCENDING))
                
                docs = query.stream()
                edits = []
                
                for doc in docs:
                    data = doc.to_dict()
                    data['id'] = doc.id
                    edits.append(data)
                
                return edits
            
            edits = self._retry_operation(_query_edits)
            logger.info(f"Retrieved {len(edits)} edits for plan {plan_id}")
            return edits
            
        except Exception as e:
            logger.error(f"Failed to get plan edits for {plan_id}: {e}")
            raise DatabaseError(f"Failed to retrieve plan edits: {e}", "QUERY_EDITS_FAILED")
    
    def save_user_feedback(
        self, 
        plan_id: str, 
        user_id: str, 
        rating: int, 
        feedback: str = "",
        categories: Optional[List[str]] = None
    ) -> str:
        """
        Save user feedback for a meal plan
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _save_feedback():
                doc_ref = self.db.collection("user_feedback").document()
                
                doc_data = {
                    "plan_id": str(plan_id),
                    "user_id": str(user_id),
                    "rating": int(rating),
                    "feedback": feedback,
                    "created_at": firestore.SERVER_TIMESTAMP,
                    "status": "active"
                }
                
                if categories:
                    doc_data["categories"] = categories
                
                doc_ref.set(doc_data)
                return doc_ref.id
            
            feedback_id = self._retry_operation(_save_feedback)
            logger.success(f"Saved user feedback with ID: {feedback_id}")
            return feedback_id
            
        except Exception as e:
            logger.error(f"Failed to save user feedback: {e}")
            raise DatabaseError(f"Failed to save user feedback: {e}", "SAVE_FEEDBACK_FAILED")
    
    def get_analytics_data(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """
        Get analytics data for meal plans
        """
        try:
            if not self.db:
                raise DatabaseError("Database not initialized", "DB_NOT_INITIALIZED")
            
            def _get_analytics():
                # Get meal plans data
                plans_query = self.db.collection(settings.GENERATED_PLANS_COL).limit(limit)
                
                if start_date:
                    plans_query = plans_query.where(filter=FieldFilter("created_at", ">=", start_date))
                if end_date:
                    plans_query = plans_query.where(filter=FieldFilter("created_at", "<=", end_date))
                
                plans_docs = list(plans_query.stream())
                
                # Get feedback data
                feedback_query = self.db.collection("user_feedback").limit(limit)
                feedback_docs = list(feedback_query.stream())
                
                # Process analytics
                analytics = {
                    "total_plans": len(plans_docs),
                    "total_feedback": len(feedback_docs),
                    "avg_rating": 0.0,
                    "dosha_distribution": {},
                    "user_engagement": {},
                    "generated_at": datetime.now(timezone.utc).isoformat()
                }
                
                # Calculate averages and distributions
                if feedback_docs:
                    ratings = [doc.to_dict().get("rating", 0) for doc in feedback_docs]
                    analytics["avg_rating"] = sum(ratings) / len(ratings)
                
                # Dosha distribution
                dosha_counts = {}
                for doc in plans_docs:
                    data = doc.to_dict()
                    dosha = data.get("payload", {}).get("dosha", {}).get("dosha", "unknown")
                    dosha_counts[dosha] = dosha_counts.get(dosha, 0) + 1
                
                analytics["dosha_distribution"] = dosha_counts
                
                return analytics
            
            analytics = self._retry_operation(_get_analytics)
            logger.info("Generated analytics data successfully")
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get analytics data: {e}")
            raise DatabaseError(f"Failed to retrieve analytics: {e}", "ANALYTICS_FAILED")
    
    def _calculate_plan_statistics(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate statistics for a meal plan"""
        try:
            stats = {
                "total_days": 0,
                "total_meals": 0,
                "total_items": 0,
                "avg_calories_per_day": 0.0,
                "meal_variety": 0
            }
            
            if not isinstance(plan, dict):
                return stats
            
            day_keys = [key for key in plan.keys() if key.startswith('day_')]
            stats["total_days"] = len(day_keys)
            
            total_calories = 0
            unique_foods = set()
            total_meal_count = 0
            total_item_count = 0
            
            for day_key in day_keys:
                day_data = plan.get(day_key, {})
                if isinstance(day_data, dict):
                    for meal_type, items in day_data.items():
                        if isinstance(items, list):
                            total_meal_count += 1
                            total_item_count += len(items)
                            
                            for item in items:
                                if isinstance(item, dict):
                                    # Track calories
                                    calories = item.get('calories', 0)
                                    if isinstance(calories, (int, float)):
                                        total_calories += calories
                                    
                                    # Track unique foods
                                    food_name = item.get('name', '')
                                    if food_name:
                                        unique_foods.add(food_name.lower())
            
            stats["total_meals"] = total_meal_count
            stats["total_items"] = total_item_count
            stats["meal_variety"] = len(unique_foods)
            
            if stats["total_days"] > 0:
                stats["avg_calories_per_day"] = round(total_calories / stats["total_days"], 1)
            
            return stats
            
        except Exception as e:
            logger.warning(f"Failed to calculate plan statistics: {e}")
            return {"error": str(e)}
    
    def _calculate_edit_statistics(self, edited_plan: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate statistics for plan edits"""
        try:
            return {
                "edit_timestamp": datetime.now(timezone.utc).isoformat(),
                "edited_sections": list(edited_plan.keys()) if isinstance(edited_plan, dict) else [],
                "total_changes": len(edited_plan) if isinstance(edited_plan, dict) else 0
            }
        except Exception as e:
            logger.warning(f"Failed to calculate edit statistics: {e}")
            return {"error": str(e)}
    
    def _link_edit_to_plan(self, plan_id: str, edit_id: str) -> None:
        """Link an edit to the original plan"""
        try:
            doc_ref = self.db.collection(settings.GENERATED_PLANS_COL).document(plan_id)
            
            # Add edit reference to the plan
            doc_ref.update({
                "latest_edit_id": edit_id,
                "has_edits": True,
                "updated_at": firestore.SERVER_TIMESTAMP
            })
            
        except Exception as e:
            logger.warning(f"Failed to link edit {edit_id} to plan {plan_id}: {e}")
    
    def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        try:
            if not self.db:
                return {"status": "error", "message": "Database not initialized"}
            
            # Try a simple operation
            test_collection = self.db.collection("health_check")
            test_doc = test_collection.document("test")
            
            # Write test
            test_doc.set({
                "test": True,
                "timestamp": firestore.SERVER_TIMESTAMP
            })
            
            # Read test
            doc = test_doc.get()
            
            # Cleanup
            test_doc.delete()
            
            if doc.exists:
                return {
                    "status": "healthy",
                    "message": "Database operations working",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            else:
                return {
                    "status": "warning", 
                    "message": "Write successful but read failed"
                }
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "error",
                "message": f"Health check failed: {str(e)}"
            }


# Global database manager instance
db_manager = FirestoreManager()


# Backward compatibility functions
def save_generated_plan(user_id: str, payload: Dict[str, Any]) -> str:
    """Backward compatible save function"""
    return db_manager.save_generated_plan(user_id, payload)


def save_doctor_edit(plan_id: str, doctor_id: str, edited_plan: Dict[str, Any], reason: str = "") -> str:
    """Backward compatible edit save function"""
    return db_manager.save_doctor_edit(plan_id, doctor_id, edited_plan, reason)


def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get a meal plan by ID"""
    return db_manager.get_generated_plan(plan_id)


def get_user_plans(user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get all plans for a user"""
    return db_manager.get_user_plans(user_id, limit)