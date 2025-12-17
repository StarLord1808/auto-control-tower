"""
Circuit Breaker pattern for LLM API calls
Provides fault tolerance and graceful degradation
"""
import time
from enum import Enum
from typing import Callable, Any, Optional
from datetime import datetime, timedelta


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"      # Failing, reject calls
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker for protecting against cascading failures
    
    States:
    - CLOSED: Normal operation, calls go through
    - OPEN: Too many failures, reject calls immediately
    - HALF_OPEN: After timeout, try one call to test recovery
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 3,
        timeout_seconds: int = 60,
        reset_timeout_seconds: int = 30
    ):
        """
        Initialize circuit breaker
        
        Args:
            name: Name of the circuit (e.g., "mistral", "openai")
            failure_threshold: Number of failures before opening circuit
            timeout_seconds: How long to wait before attempting reset
            reset_timeout_seconds: How long to stay in HALF_OPEN before closing
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.reset_timeout_seconds = reset_timeout_seconds
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
        self.last_state_change: datetime = datetime.utcnow()
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection
        
        Args:
            func: Function to call
            *args, **kwargs: Arguments to pass to function
        
        Returns:
            Result of function call
        
        Raises:
            Exception: If circuit is OPEN or function fails
        """
        if self.state == CircuitState.OPEN:
            if self.should_attempt_reset():
                print(f"[{self.name}] Circuit entering HALF_OPEN state")
                self.state = CircuitState.HALF_OPEN
                self.last_state_change = datetime.utcnow()
            else:
                raise Exception(f"Circuit breaker {self.name} is OPEN")
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e
    
    def record_success(self):
        """Record successful call"""
        self.success_count += 1
        
        if self.state == CircuitState.HALF_OPEN:
            # Success in HALF_OPEN state, close the circuit
            print(f"[{self.name}] Circuit closing after successful test")
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.last_state_change = datetime.utcnow()
        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            self.failure_count = 0
    
    def record_failure(self):
        """Record failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.state == CircuitState.HALF_OPEN:
            # Failure in HALF_OPEN state, reopen the circuit
            print(f"[{self.name}] Circuit reopening after failed test")
            self.state = CircuitState.OPEN
            self.last_state_change = datetime.utcnow()
        elif self.failure_count >= self.failure_threshold:
            # Too many failures, open the circuit
            print(f"[{self.name}] Circuit opening after {self.failure_count} failures")
            self.state = CircuitState.OPEN
            self.last_state_change = datetime.utcnow()
    
    def should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if self.last_failure_time is None:
            return False
        
        elapsed = (datetime.utcnow() - self.last_failure_time).total_seconds()
        return elapsed >= self.timeout_seconds
    
    def get_status(self) -> dict:
        """Get current circuit breaker status"""
        return {
            'name': self.name,
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'last_failure_time': self.last_failure_time.isoformat() if self.last_failure_time else None,
            'last_state_change': self.last_state_change.isoformat(),
            'time_since_last_failure': (
                (datetime.utcnow() - self.last_failure_time).total_seconds()
                if self.last_failure_time else None
            )
        }


def call_with_circuit_breaker(
    circuit: CircuitBreaker,
    func: Callable,
    fallback: Optional[Callable] = None,
    *args,
    **kwargs
) -> Any:
    """
    Call function with circuit breaker and optional fallback
    
    Args:
        circuit: CircuitBreaker instance
        func: Function to call
        fallback: Optional fallback function if circuit is open
        *args, **kwargs: Arguments to pass to function
    
    Returns:
        Result of function or fallback
    """
    try:
        return circuit.call(func, *args, **kwargs)
    except Exception as e:
        print(f"Circuit breaker {circuit.name} prevented call: {e}")
        if fallback:
            print(f"Using fallback for {circuit.name}")
            return fallback(*args, **kwargs)
        raise e
