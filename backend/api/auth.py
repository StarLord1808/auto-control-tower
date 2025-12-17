"""
Authentication module for the Autonomous Control Tower
Handles user registration, login, and JWT token management
"""
import os
import jwt
import uuid
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

from backend.shared.db.database import get_db_context
from backend.shared.db.models import User
from backend.shared.constants import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS


def generate_token(user_id, username, role):
    """Generate JWT token for authenticated user"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token):
    """Decode and validate JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def require_auth(f):
    """Decorator to protect routes with JWT authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        # Decode token
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Add user info to request context
        request.user = payload
        
        return f(*args, **kwargs)
    
    return decorated_function


def register_user(username, email, password, role='viewer'):
    """Register a new user"""
    try:
        with get_db_context() as db:
            # Check if username already exists
            existing_user = db.query(User).filter(User.username == username).first()
            if existing_user:
                return None, 'Username already exists'
            
            # Check if email already exists
            existing_email = db.query(User).filter(User.email == email).first()
            if existing_email:
                return None, 'Email already exists'
            
            # Create new user
            user = User(
                user_id=f"USR_{str(uuid.uuid4())[:8]}",
                username=username,
                email=email,
                password_hash=generate_password_hash(password),
                role=role,
                created_at=datetime.utcnow()
            )
            
            db.add(user)
            db.commit()
            
            return user, None
    except Exception as e:
        return None, str(e)


def login_user(username, password):
    """Authenticate user and return JWT token"""
    try:
        with get_db_context() as db:
            user = db.query(User).filter(User.username == username).first()
            
            if not user:
                return None, 'Invalid username or password'
            
            if not user.is_active:
                return None, 'Account is disabled'
            
            if not check_password_hash(user.password_hash, password):
                return None, 'Invalid username or password'
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
            
            # Generate token
            token = generate_token(user.user_id, user.username, user.role)
            
            return {
                'token': token,
                'user': {
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }, None
    except Exception as e:
        return None, str(e)


def get_current_user(user_id):
    """Get user details by user_id"""
    try:
        with get_db_context() as db:
            user = db.query(User).filter(User.user_id == user_id).first()
            if user:
                return {
                    'user_id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'last_login': user.last_login.isoformat() if user.last_login else None
                }
            return None
    except Exception as e:
        return None
