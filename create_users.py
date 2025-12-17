#!/usr/bin/env python3
"""
Script to create a default admin user for the Autonomous Control Tower
Run this script to create an admin user if you're getting authentication errors
"""

import sys
import os

# Add flask-api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend/flask-api')))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), 'backend/flask-api/.env'))

from db.database import get_db_context
from db.models import User
from werkzeug.security import generate_password_hash
from datetime import datetime
import uuid

def create_admin_user():
    """Create a default admin user"""
    print("Creating default admin user...")
    
    try:
        with get_db_context() as db:
            # Check if admin user already exists
            existing_admin = db.query(User).filter(User.username == 'admin').first()
            
            if existing_admin:
                print("⚠️  Admin user already exists!")
                print(f"   Username: {existing_admin.username}")
                print(f"   Email: {existing_admin.email}")
                print(f"   Role: {existing_admin.role}")
                print(f"   Active: {existing_admin.is_active}")
                
                # Ask if user wants to reset password
                reset = input("\nDo you want to reset the admin password? (yes/no): ")
                if reset.lower() in ['yes', 'y']:
                    new_password = input("Enter new password: ")
                    existing_admin.password_hash = generate_password_hash(new_password)
                    existing_admin.is_active = True
                    db.commit()
                    print("✅ Admin password reset successfully!")
                    print(f"   Username: admin")
                    print(f"   Password: {new_password}")
                return
            
            # Create new admin user
            admin_user = User(
                user_id=f"USR_{str(uuid.uuid4())[:8]}",
                username='admin',
                email='admin@controltower.com',
                password_hash=generate_password_hash('admin123'),  # Default password
                role='admin',
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.add(admin_user)
            db.commit()
            
            print("✅ Admin user created successfully!")
            print(f"   Username: admin")
            print(f"   Password: admin123")
            print(f"   Email: admin@controltower.com")
            print(f"   Role: admin")
            print("\n⚠️  IMPORTANT: Change the default password after first login!")
            
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        sys.exit(1)

def create_test_user():
    """Create a test viewer user"""
    print("\nCreating test viewer user...")
    
    try:
        with get_db_context() as db:
            # Check if test user already exists
            existing_user = db.query(User).filter(User.username == 'testuser').first()
            
            if existing_user:
                print("⚠️  Test user already exists!")
                return
            
            # Create test user
            test_user = User(
                user_id=f"USR_{str(uuid.uuid4())[:8]}",
                username='testuser',
                email='test@controltower.com',
                password_hash=generate_password_hash('test123'),
                role='viewer',
                is_active=True,
                created_at=datetime.utcnow()
            )
            
            db.add(test_user)
            db.commit()
            
            print("✅ Test user created successfully!")
            print(f"   Username: testuser")
            print(f"   Password: test123")
            print(f"   Email: test@controltower.com")
            print(f"   Role: viewer")
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")

def list_users():
    """List all users in the database"""
    print("\n" + "="*60)
    print("Current Users in Database")
    print("="*60)
    
    try:
        with get_db_context() as db:
            users = db.query(User).all()
            
            if not users:
                print("No users found in database.")
                return
            
            for user in users:
                print(f"\n👤 {user.username}")
                print(f"   User ID: {user.user_id}")
                print(f"   Email: {user.email}")
                print(f"   Role: {user.role}")
                print(f"   Active: {'✅' if user.is_active else '❌'}")
                print(f"   Created: {user.created_at}")
                if user.last_login:
                    print(f"   Last Login: {user.last_login}")
            
            print(f"\n📊 Total users: {len(users)}")
            
    except Exception as e:
        print(f"❌ Error listing users: {e}")

if __name__ == "__main__":
    print("="*60)
    print("Autonomous Control Tower - User Management")
    print("="*60)
    
    # Create admin user
    create_admin_user()
    
    # Ask if user wants to create test user
    create_test = input("\nDo you want to create a test viewer user? (yes/no): ")
    if create_test.lower() in ['yes', 'y']:
        create_test_user()
    
    # List all users
    list_users()
    
    print("\n" + "="*60)
    print("✅ User management complete!")
    print("="*60)
    print("\nYou can now login with:")
    print("  Username: admin")
    print("  Password: admin123 (or your custom password)")
    print("\nAPI Login endpoint: POST /api/auth/login")
    print("Example:")
    print('  curl -X POST http://localhost:5000/api/auth/login \\')
    print('    -H "Content-Type: application/json" \\')
    print('    -d \'{"username": "admin", "password": "admin123"}\'')
