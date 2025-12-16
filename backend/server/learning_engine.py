"""
Reinforcement Learning Engine for AI Agent
Calculates outcome metrics and adjusts confidence scores based on historical performance
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../flask-api')))

from db.database import get_db_context
from db.models import OutcomeMetric, MitigationAction, AgentDecision


def calculate_outcome_metrics(action_id: str) -> Optional[OutcomeMetric]:
    """
    Calculate outcome metrics for a completed mitigation action
    
    Args:
        action_id: ID of the mitigation action
    
    Returns:
        OutcomeMetric record or None
    """
    try:
        with get_db_context() as db:
            action = db.query(MitigationAction).filter(
                MitigationAction.action_id == action_id
            ).first()
            
            if not action or action.status != 'completed':
                return None
            
            # Check if outcome already exists
            existing = db.query(OutcomeMetric).filter(
                OutcomeMetric.action_id == action_id
            ).first()
            
            if existing:
                return existing
            
            # Calculate variances
            cost_variance = 0
            time_variance = 0
            
            if action.estimated_cost_usd and action.actual_cost_usd:
                cost_variance = (
                    (float(action.actual_cost_usd) - float(action.estimated_cost_usd)) / 
                    float(action.estimated_cost_usd) * 100
                )
            
            if action.estimated_time_saved_hours and action.actual_time_saved_hours:
                time_variance = (
                    (action.actual_time_saved_hours - action.estimated_time_saved_hours) / 
                    action.estimated_time_saved_hours * 100
                )
            
            # Get confidence score from decision
            decision = db.query(AgentDecision).filter(
                AgentDecision.event_id == action.event_id
            ).first()
            
            confidence = decision.confidence_score if decision else 75.0
            
            # Determine success
            outcome_success = (
                (action.feedback_rating is None or action.feedback_rating >= 3) and
                (abs(cost_variance) < 50) and
                (time_variance > -50)
            )
            
            # Create outcome metric
            outcome = OutcomeMetric(
                outcome_id=f"OUT_{str(uuid.uuid4())[:8]}",
                action_id=action_id,
                shipment_id=action.shipment_id,
                predicted_cost_usd=action.estimated_cost_usd,
                actual_cost_usd=action.actual_cost_usd,
                cost_variance_percent=cost_variance,
                predicted_time_saved_hours=action.estimated_time_saved_hours,
                actual_time_saved_hours=action.actual_time_saved_hours,
                time_variance_percent=time_variance,
                predicted_confidence_score=confidence,
                outcome_success=outcome_success,
                learning_weight=1.0,
                created_at=datetime.utcnow()
            )
            
            db.add(outcome)
            db.commit()
            db.refresh(outcome)
            
            return outcome
            
    except Exception as e:
        print(f"Error calculating outcome metrics: {e}")
        return None


def update_confidence_scores(action_type: str, time_window_days: int = 30) -> Dict:
    """
    Update confidence scores for an action type based on recent outcomes
    
    Args:
        action_type: Type of action (e.g., 'reroute', 'expedite')
        time_window_days: Number of days to look back
    
    Returns:
        Dictionary with updated confidence information
    """
    try:
        with get_db_context() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=time_window_days)
            
            # Get recent outcomes for this action type
            outcomes = db.query(OutcomeMetric).join(MitigationAction).filter(
                MitigationAction.action_type == action_type,
                OutcomeMetric.created_at >= cutoff_date
            ).all()
            
            if not outcomes:
                return {
                    'action_type': action_type,
                    'recommended_confidence': 75.0,
                    'sample_size': 0,
                    'reason': 'No historical data available'
                }
            
            # Calculate weighted accuracy
            accuracy = calculate_weighted_accuracy(action_type, time_window_days)
            
            # Recommend confidence based on accuracy
            if accuracy >= 90:
                recommended_confidence = 95.0
                reason = f"Excellent historical accuracy ({accuracy:.1f}%)"
            elif accuracy >= 75:
                recommended_confidence = 85.0
                reason = f"Good historical accuracy ({accuracy:.1f}%)"
            elif accuracy >= 60:
                recommended_confidence = 75.0
                reason = f"Moderate historical accuracy ({accuracy:.1f}%)"
            elif accuracy >= 40:
                recommended_confidence = 60.0
                reason = f"Below average accuracy ({accuracy:.1f}%)"
            else:
                recommended_confidence = 50.0
                reason = f"Poor historical accuracy ({accuracy:.1f}%)"
            
            return {
                'action_type': action_type,
                'recommended_confidence': recommended_confidence,
                'sample_size': len(outcomes),
                'accuracy_percent': accuracy,
                'reason': reason,
                'time_window_days': time_window_days
            }
            
    except Exception as e:
        print(f"Error updating confidence scores: {e}")
        return {}


def calculate_weighted_accuracy(action_type: str, time_window_days: int = 30) -> float:
    """
    Calculate weighted accuracy for an action type
    More recent outcomes have higher weight
    
    Args:
        action_type: Type of action
        time_window_days: Number of days to look back
    
    Returns:
        Weighted accuracy percentage (0-100)
    """
    try:
        with get_db_context() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=time_window_days)
            
            outcomes = db.query(OutcomeMetric).join(MitigationAction).filter(
                MitigationAction.action_type == action_type,
                OutcomeMetric.created_at >= cutoff_date
            ).order_by(OutcomeMetric.created_at.desc()).all()
            
            if not outcomes:
                return 75.0  # Default confidence
            
            # Calculate weighted accuracy (more recent = higher weight)
            total_weight = 0
            weighted_success = 0
            
            for i, outcome in enumerate(outcomes):
                # Exponential decay: most recent has weight 1.0, oldest has weight 0.5
                weight = 1.0 - (i / len(outcomes)) * 0.5
                weight *= outcome.learning_weight or 1.0
                
                total_weight += weight
                if outcome.outcome_success:
                    weighted_success += weight
            
            accuracy = (weighted_success / total_weight * 100) if total_weight > 0 else 75.0
            return accuracy
            
    except Exception as e:
        print(f"Error calculating weighted accuracy: {e}")
        return 75.0


def get_learning_insights(days: int = 30) -> Dict:
    """
    Generate insights on AI performance over time
    
    Args:
        days: Number of days to analyze
    
    Returns:
        Dictionary with learning insights
    """
    try:
        with get_db_context() as db:
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            outcomes = db.query(OutcomeMetric).filter(
                OutcomeMetric.created_at >= cutoff_date
            ).all()
            
            if not outcomes:
                return {
                    'period_days': days,
                    'total_outcomes': 0,
                    'insights': []
                }
            
            # Calculate metrics by action type
            action_types = {}
            for outcome in outcomes:
                action = outcome.action
                if not action:
                    continue
                
                action_type = action.action_type
                if action_type not in action_types:
                    action_types[action_type] = {
                        'total': 0,
                        'successful': 0,
                        'cost_variances': [],
                        'time_variances': []
                    }
                
                action_types[action_type]['total'] += 1
                if outcome.outcome_success:
                    action_types[action_type]['successful'] += 1
                
                if outcome.cost_variance_percent is not None:
                    action_types[action_type]['cost_variances'].append(
                        float(outcome.cost_variance_percent)
                    )
                if outcome.time_variance_percent is not None:
                    action_types[action_type]['time_variances'].append(
                        float(outcome.time_variance_percent)
                    )
            
            # Generate insights
            insights = []
            for action_type, metrics in action_types.items():
                success_rate = (metrics['successful'] / metrics['total'] * 100) if metrics['total'] > 0 else 0
                
                avg_cost_var = sum(metrics['cost_variances']) / len(metrics['cost_variances']) if metrics['cost_variances'] else 0
                avg_time_var = sum(metrics['time_variances']) / len(metrics['time_variances']) if metrics['time_variances'] else 0
                
                insight = {
                    'action_type': action_type,
                    'total_actions': metrics['total'],
                    'success_rate_percent': success_rate,
                    'avg_cost_variance_percent': avg_cost_var,
                    'avg_time_variance_percent': avg_time_var,
                    'recommendation': ''
                }
                
                # Add recommendation
                if success_rate >= 80:
                    insight['recommendation'] = f"High confidence in {action_type} actions"
                elif success_rate >= 60:
                    insight['recommendation'] = f"Moderate confidence in {action_type} actions"
                else:
                    insight['recommendation'] = f"Low confidence in {action_type} actions - consider alternatives"
                
                insights.append(insight)
            
            return {
                'period_days': days,
                'total_outcomes': len(outcomes),
                'successful_outcomes': sum(1 for o in outcomes if o.outcome_success),
                'overall_success_rate': sum(1 for o in outcomes if o.outcome_success) / len(outcomes) * 100,
                'insights_by_action_type': insights
            }
            
    except Exception as e:
        print(f"Error getting learning insights: {e}")
        return {}


def recommend_confidence_adjustment(context: Dict) -> float:
    """
    Recommend confidence adjustment for a new decision based on historical data
    
    Args:
        context: Dictionary with action_type, shipment_context, etc.
    
    Returns:
        Recommended confidence score (0-100)
    """
    action_type = context.get('action_type', 'unknown')
    
    # Get historical accuracy for this action type
    accuracy = calculate_weighted_accuracy(action_type, time_window_days=30)
    
    # Base confidence on accuracy
    if accuracy >= 90:
        return 95.0
    elif accuracy >= 75:
        return 85.0
    elif accuracy >= 60:
        return 75.0
    elif accuracy >= 40:
        return 60.0
    else:
        return 50.0
