"""
Create users table for authentication
Run this script to add the users table to your database
"""
import sys
import os

# Add flask-api to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend/flask-api')))

from db.database import engine
from db.models import User, Base
from dotenv import load_dotenv

# Load environment variables
load_dotenv('backend/flask-api/.env')

def create_users_table():
    """Create the users table"""
    print("Creating users table...")
    try:
        # Create only the users table
        User.__table__.create(engine, checkfirst=True)
        print("✓ Users table created successfully!")
    except Exception as e:
        print(f"Error creating users table: {e}")

if __name__ == "__main__":
    create_users_table()
