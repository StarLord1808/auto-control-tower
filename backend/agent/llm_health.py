"""
Health check utilities for LLM providers
Tests connectivity and availability of Mistral AI and OpenAI
"""
import os
from datetime import datetime
from typing import Dict, Optional


def check_mistral_health() -> Dict:
    """
    Check Mistral AI health with lightweight request
    
    Returns:
        Dictionary with health status
    """
    try:
        from langchain_mistralai import ChatMistralAI
        
        api_key = os.getenv("MISTRAL_API_KEY")
        if not api_key:
            return {
                'provider': 'mistral',
                'status': 'unavailable',
                'healthy': False,
                'error': 'API key not configured',
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Try a minimal API call
        client = ChatMistralAI(
            model="mistral-small-latest",
            temperature=0,
            max_retries=0,
            timeout=5
        )
        
        from langchain_core.messages import HumanMessage
        response = client.invoke([HumanMessage(content="test")])
        
        return {
            'provider': 'mistral',
            'status': 'healthy',
            'healthy': True,
            'response_time_ms': None,  # Could add timing
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'provider': 'mistral',
            'status': 'unhealthy',
            'healthy': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


def check_openai_health() -> Dict:
    """
    Check OpenAI health with lightweight request
    
    Returns:
        Dictionary with health status
    """
    try:
        from langchain_openai import ChatOpenAI
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {
                'provider': 'openai',
                'status': 'unavailable',
                'healthy': False,
                'error': 'API key not configured',
                'timestamp': datetime.utcnow().isoformat()
            }
        
        # Try a minimal API call
        client = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0,
            max_retries=0,
            timeout=5
        )
        
        from langchain_core.messages import HumanMessage
        response = client.invoke([HumanMessage(content="test")])
        
        return {
            'provider': 'openai',
            'status': 'healthy',
            'healthy': True,
            'response_time_ms': None,
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            'provider': 'openai',
            'status': 'unhealthy',
            'healthy': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }


def get_llm_status() -> Dict:
    """
    Get status of all LLM providers
    
    Returns:
        Dictionary with all provider statuses
    """
    mistral_status = check_mistral_health()
    openai_status = check_openai_health()
    
    # Determine overall status
    healthy_count = sum([
        mistral_status['healthy'],
        openai_status['healthy']
    ])
    
    if healthy_count == 2:
        overall_status = 'healthy'
    elif healthy_count == 1:
        overall_status = 'degraded'
    else:
        overall_status = 'unhealthy'
    
    return {
        'overall_status': overall_status,
        'healthy_providers': healthy_count,
        'total_providers': 2,
        'providers': {
            'mistral': mistral_status,
            'openai': openai_status
        },
        'timestamp': datetime.utcnow().isoformat()
    }


def log_health_metrics(status: Dict):
    """
    Log health check results
    
    Args:
        status: Health status dictionary
    """
    print(f"[LLM Health] Overall: {status['overall_status']}")
    print(f"[LLM Health] Mistral: {status['providers']['mistral']['status']}")
    print(f"[LLM Health] OpenAI: {status['providers']['openai']['status']}")
    
    if status['overall_status'] == 'unhealthy':
        print("[LLM Health] WARNING: All LLM providers are unhealthy!")
    elif status['overall_status'] == 'degraded':
        print("[LLM Health] WARNING: Some LLM providers are unhealthy")
