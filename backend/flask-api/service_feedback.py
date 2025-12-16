"""
Service layer for human feedback and outcome tracking
Handles approval/rejection of mitigations and confidence score adjustments
"""
import uuid
from datetime import datetime
from typing import Dict, Optional, List, Tuple
from sqlalchemy.orm import Session

from db.database import get_db_context
from db.models import (
    MitigationAction, FeedbackHistory, OutcomeMetric,
    AgentDecision, User
)


def approve_mitigation(
    action_id: str,
    user_id: str,
    feedback: Optional[str] = None,
    rating: Optional[int] = None
) -> Tuple[Optional[MitigationAction], Optional[str]]:
    """
    Approve a mitigation action with optional feedback
    
    Args:
        action_id: ID of the mitigation action
        user_id: ID of the user approving
        feedback: Optional feedback text
        rating: Optional rating 1-5
    
    Returns:
        Tuple of (MitigationAction, error_message)
    """
    try:
        with get_db_context() as db:
            action = db.query(MitigationAction).filter(
                MitigationAction.action_id == action_id
            ).first()
            
            if not action:
                return None, "Mitigation action not found"
            
            if action.status not in ['proposed', 'simulating']:
                return None, f"Cannot approve action with status: {action.status}"
            
            # Update action
            action.status = 'approved'
            action.approved_at = datetime.utcnow()
            action.approved_by_user_id = user_id
            action.approved_by = user_id
            
            if feedback:
                action.human_feedback = feedback
            if rating:
                action.feedback_rating = rating
            
            db.commit()
            db.refresh(action)
            
            return action, None
            
    except Exception as e:
        return None, str(e)


def reject_mitigation(
    action_id: str,
    user_id: str,
    reason: str
) -> Tuple[Optional[MitigationAction], Optional[str]]:
    """
    Reject a mitigation action with reason
    
    Args:
        action_id: ID of the mitigation action
        user_id: ID of the user rejecting
        reason: Reason for rejection
    
    Returns:
        Tuple of (MitigationAction, error_message)
    """
    try:
        with get_db_context() as db:
            action = db.query(MitigationAction).filter(
                MitigationAction.action_id == action_id
            ).first()
            
            if not action:
                return None, "Mitigation action not found"
            
            if action.status not in ['proposed', 'simulating']:
                return None, f"Cannot reject action with status: {action.status}"
            
            # Update action
            action.status = 'rejected'
            action.approved_at = datetime.utcnow()
            action.approved_by_user_id = user_id
            action.approved_by = user_id
            action.human_feedback = reason
            action.feedback_rating = 1  # Rejection implies low rating
            
            db.commit()
            db.refresh(action)
            
            return action, None
            
    except Exception as e:
        return None, str(e)


def submit_outcome_feedback(
    action_id: str,
    actual_cost: Optional[float] = None,
    actual_time_saved: Optional[int] = None,
    rating: Optional[int] = None,
    feedback: Optional[str] = None
) -> Tuple[Optional[Dict], Optional[str]]:
    """
    Submit actual outcome data for a completed mitigation
    Creates FeedbackHistory and OutcomeMetric records
    Adjusts confidence scores based on variance
    
    Args:
        action_id: ID of the mitigation action
        actual_cost: Actual cost incurred
        actual_time_saved: Actual time saved in hours
        rating: Human rating 1-5
        feedback: Additional feedback text
    
    Returns:
        Tuple of (result_dict, error_message)
    """
    try:
        with get_db_context() as db:
            action = db.query(MitigationAction).filter(
                MitigationAction.action_id == action_id
            ).first()
            
            if not action:
                return None, "Mitigation action not found"
            
            if action.status not in ['completed', 'executing']:
                return None, f"Cannot submit feedback for action with status: {action.status}"
            
            # Update action with actual outcomes
            if actual_cost is not None:
                action.actual_cost_usd = actual_cost
            if actual_time_saved is not None:
                action.actual_time_saved_hours = actual_time_saved
            if rating is not None:
                action.feedback_rating = rating
            if feedback is not None:
                action.human_feedback = feedback
            
            # Get associated decision for confidence score
            decision = db.query(AgentDecision).filter(
                AgentDecision.event_id == action.event_id,
                AgentDecision.decision_type == 'risk_assessment'
            ).first()
            
            old_confidence = decision.confidence_score if decision else 75.0
            
            # Calculate confidence adjustment
            adjustment_factor, adjustment_reason = calculate_confidence_adjustment(
                predicted_cost=float(action.estimated_cost_usd) if action.estimated_cost_usd else 0,
                actual_cost=actual_cost or 0,
                predicted_time=action.estimated_time_saved_hours or 0,
                actual_time=actual_time_saved or 0,
                rating=rating
            )
            
            new_confidence = min(99.0, max(1.0, old_confidence * adjustment_factor))
            
            # Create FeedbackHistory record
            feedback_record = FeedbackHistory(
                feedback_id=f"FB_{str(uuid.uuid4())[:8]}",
                action_id=action_id,
                decision_id=decision.decision_id if decision else None,
                predicted_cost=action.estimated_cost_usd,
                actual_cost=actual_cost,
                predicted_time_saved=action.estimated_time_saved_hours,
                actual_time_saved=actual_time_saved,
                confidence_score_before=old_confidence,
                confidence_score_after=new_confidence,
                adjustment_reason=adjustment_reason,
                created_at=datetime.utcnow()
            )
            db.add(feedback_record)
            
            # Create OutcomeMetric record
            cost_variance = 0
            time_variance = 0
            
            if action.estimated_cost_usd and actual_cost:
                cost_variance = ((actual_cost - float(action.estimated_cost_usd)) / 
                               float(action.estimated_cost_usd) * 100)
            
            if action.estimated_time_saved_hours and actual_time_saved:
                time_variance = ((actual_time_saved - action.estimated_time_saved_hours) / 
                               action.estimated_time_saved_hours * 100)
            
            # Determine success based on variance and rating
            outcome_success = (
                (rating is None or rating >= 3) and
                (abs(cost_variance) < 50) and  # Within 50% of prediction
                (time_variance > -50)  # Not significantly worse than predicted
            )
            
            outcome_record = OutcomeMetric(
                outcome_id=f"OUT_{str(uuid.uuid4())[:8]}",
                action_id=action_id,
                shipment_id=action.shipment_id,
                predicted_cost_usd=action.estimated_cost_usd,
                actual_cost_usd=actual_cost,
                cost_variance_percent=cost_variance,
                predicted_time_saved_hours=action.estimated_time_saved_hours,
                actual_time_saved_hours=actual_time_saved,
                time_variance_percent=time_variance,
                predicted_confidence_score=old_confidence,
                outcome_success=outcome_success,
                learning_weight=1.0,
                created_at=datetime.utcnow()
            )
            db.add(outcome_record)
            
            db.commit()
            
            return {
                'action_id': action_id,
                'feedback_id': feedback_record.feedback_id,
                'outcome_id': outcome_record.outcome_id,
                'confidence_adjustment': {
                    'before': float(old_confidence),
                    'after': float(new_confidence),
                    'factor': adjustment_factor,
                    'reason': adjustment_reason
                },
                'variance': {
                    'cost_percent': cost_variance,
                    'time_percent': time_variance
                },
                'outcome_success': outcome_success
            }, None
            
    except Exception as e:
        return None, str(e)


def calculate_confidence_adjustment(
    predicted_cost: float,
    actual_cost: float,
    predicted_time: int,
    actual_time: int,
    rating: Optional[int] = None
) -> Tuple[float, str]:
    """
    Calculate confidence score adjustment factor based on prediction accuracy
    
    Args:
        predicted_cost: Predicted cost
        actual_cost: Actual cost
        predicted_time: Predicted time saved
        actual_time: Actual time saved
        rating: Human rating 1-5
    
    Returns:
        Tuple of (adjustment_factor, reason)
    """
    factors = []
    reasons = []
    
    # Cost accuracy factor
    if predicted_cost > 0 and actual_cost > 0:
        cost_error = abs(actual_cost - predicted_cost) / predicted_cost
        if cost_error < 0.1:  # Within 10%
            factors.append(1.05)
            reasons.append("Excellent cost prediction (±10%)")
        elif cost_error < 0.25:  # Within 25%
            factors.append(1.02)
            reasons.append("Good cost prediction (±25%)")
        elif cost_error < 0.5:  # Within 50%
            factors.append(1.0)
            reasons.append("Acceptable cost prediction (±50%)")
        else:
            factors.append(0.95)
            reasons.append(f"Poor cost prediction ({cost_error*100:.0f}% error)")
    
    # Time accuracy factor
    if predicted_time > 0 and actual_time > 0:
        time_error = abs(actual_time - predicted_time) / predicted_time
        if time_error < 0.1:
            factors.append(1.05)
            reasons.append("Excellent time prediction (±10%)")
        elif time_error < 0.25:
            factors.append(1.02)
            reasons.append("Good time prediction (±25%)")
        elif time_error < 0.5:
            factors.append(1.0)
            reasons.append("Acceptable time prediction (±50%)")
        else:
            factors.append(0.95)
            reasons.append(f"Poor time prediction ({time_error*100:.0f}% error)")
    
    # Human rating factor
    if rating is not None:
        if rating >= 4:
            factors.append(1.03)
            reasons.append(f"High human rating ({rating}/5)")
        elif rating == 3:
            factors.append(1.0)
            reasons.append("Neutral human rating (3/5)")
        else:
            factors.append(0.97)
            reasons.append(f"Low human rating ({rating}/5)")
    
    # Calculate overall adjustment
    if not factors:
        return 1.0, "No feedback data available"
    
    avg_factor = sum(factors) / len(factors)
    combined_reason = "; ".join(reasons)
    
    return avg_factor, combined_reason


def get_feedback_history(
    action_type: Optional[str] = None,
    limit: int = 100
) -> List[FeedbackHistory]:
    """
    Get feedback history with optional filters
    
    Args:
        action_type: Filter by action type
        limit: Maximum number of records
    
    Returns:
        List of FeedbackHistory records
    """
    try:
        with get_db_context() as db:
            query = db.query(FeedbackHistory).join(MitigationAction)
            
            if action_type:
                query = query.filter(MitigationAction.action_type == action_type)
            
            history = query.order_by(
                FeedbackHistory.created_at.desc()
            ).limit(limit).all()
            
            return history
            
    except Exception as e:
        print(f"Error getting feedback history: {e}")
        return []


def get_learning_analytics(action_type: Optional[str] = None) -> Dict:
    """
    Get learning analytics and confidence trends
    
    Args:
        action_type: Filter by action type
    
    Returns:
        Dictionary with learning metrics
    """
    try:
        with get_db_context() as db:
            query = db.query(OutcomeMetric).join(MitigationAction)
            
            if action_type:
                query = query.filter(MitigationAction.action_type == action_type)
            
            outcomes = query.all()
            
            if not outcomes:
                return {
                    'total_outcomes': 0,
                    'success_rate': 0,
                    'avg_cost_variance': 0,
                    'avg_time_variance': 0,
                    'confidence_trend': 'stable'
                }
            
            total = len(outcomes)
            successful = sum(1 for o in outcomes if o.outcome_success)
            
            avg_cost_var = sum(
                abs(float(o.cost_variance_percent or 0)) for o in outcomes
            ) / total
            
            avg_time_var = sum(
                abs(float(o.time_variance_percent or 0)) for o in outcomes
            ) / total
            
            return {
                'total_outcomes': total,
                'success_rate': (successful / total * 100) if total > 0 else 0,
                'avg_cost_variance_percent': avg_cost_var,
                'avg_time_variance_percent': avg_time_var,
                'action_type': action_type or 'all',
                'successful_outcomes': successful,
                'failed_outcomes': total - successful
            }
            
    except Exception as e:
        print(f"Error getting learning analytics: {e}")
        return {}
