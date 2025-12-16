# Authentication Troubleshooting Guide

## Common Login Issues

### Issue 1: "Invalid username or password"

**Possible Causes:**
1. No users exist in the database
2. Wrong username or password
3. User account is disabled

**Solutions:**

#### Solution A: Create Admin User
```bash
# Run the user creation script
python3 create_users.py
```

This will create:
- **Admin user**: username=`admin`, password=`admin123`
- **Test user** (optional): username=`testuser`, password=`test123`

#### Solution B: Manual User Creation via SQL
```sql
-- Insert admin user directly
INSERT INTO users (
    user_id,
    username,
    email,
    password_hash,
    role,
    is_active,
    created_at
) VALUES (
    'USR_ADMIN01',
    'admin',
    'admin@controltower.com',
    -- Password hash for 'admin123' (generated with werkzeug.security)
    'scrypt:32768:8:1$...',  -- You need to generate this
    'admin',
    true,
    NOW()
);
```

**Note:** Password hashes must be generated using `werkzeug.security.generate_password_hash()`. Use the `create_users.py` script instead.

---

### Issue 2: "Authentication token is missing"

**Cause:** No Authorization header in request

**Solution:**
```bash
# Login first to get token
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}' \
  | jq -r '.token')

# Use token in subsequent requests
curl -X GET http://localhost:5000/api/dashboard/summary \
  -H "Authorization: Bearer $TOKEN"
```

---

### Issue 3: "Invalid or expired token"

**Possible Causes:**
1. Token has expired (24-hour expiration)
2. JWT_SECRET changed
3. Malformed token

**Solutions:**

#### Solution A: Get New Token
```bash
# Login again to get fresh token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

#### Solution B: Check JWT_SECRET
```bash
# Verify JWT_SECRET in .env file
cat backend/flask-api/.env | grep JWT_SECRET
```

If missing, add:
```env
JWT_SECRET=your-secret-key-change-in-production
```

---

### Issue 4: "Account is disabled"

**Cause:** User's `is_active` flag is set to `false`

**Solution:**
```sql
-- Enable user account
UPDATE users 
SET is_active = true 
WHERE username = 'admin';
```

Or use the `create_users.py` script to reset the user.

---

## Testing Authentication

### 1. Register New User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "viewer"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "USR_12345678",
    "username": "admin",
    "email": "admin@controltower.com",
    "role": "admin"
  }
}
```

### 3. Access Protected Endpoint
```bash
# Save token from login response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Use token to access protected endpoint
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Database Checks

### Check if Users Table Exists
```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'users'
);
```

### List All Users
```sql
SELECT 
    user_id,
    username,
    email,
    role,
    is_active,
    created_at,
    last_login
FROM users
ORDER BY created_at DESC;
```

### Check User Count
```sql
SELECT COUNT(*) as user_count FROM users;
```

### Find Specific User
```sql
SELECT * FROM users WHERE username = 'admin';
```

---

## Frontend Login Issues

### Issue: Login page not loading

**Causes:**
1. Frontend server not running
2. CORS issues
3. API server not running

**Solutions:**

#### Check Services
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Check if frontend is running
curl http://localhost:8000
```

#### Start Services
```bash
# Start all services
./start_demo.sh

# Or start individually
python3 backend/flask-api/main_app.py &
cd front-end && python3 -m http.server 8000 &
```

#### Check CORS Configuration
In `backend/flask-api/constants.py`:
```python
CORS_ORIGINS = ['http://localhost:8000', 'http://127.0.0.1:8000']
```

---

## Environment Variables

Required in `backend/flask-api/.env`:

```env
# Database
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/dbname

# JWT Authentication
JWT_SECRET=your-secret-key-change-in-production

# API Keys
MISTRAL_API_KEY=your_mistral_api_key
STATIC_API_KEY=your_static_api_key

# Flask Configuration
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True
```

---

## Quick Fix Checklist

- [ ] Database is running and accessible
- [ ] Users table exists
- [ ] At least one user exists (run `create_users.py`)
- [ ] User account is active (`is_active = true`)
- [ ] JWT_SECRET is set in `.env`
- [ ] Backend API is running on port 5000
- [ ] Frontend is running on port 8000 (if using web UI)
- [ ] CORS is configured correctly
- [ ] Using correct username and password

---

## Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Invalid username or password" | Wrong credentials or no users | Run `create_users.py` |
| "Authentication token is missing" | No Authorization header | Add `Authorization: Bearer <token>` |
| "Invalid or expired token" | Token expired or invalid | Login again to get new token |
| "Account is disabled" | User is inactive | Set `is_active = true` in database |
| "Username already exists" | Duplicate username | Use different username |
| "Email already exists" | Duplicate email | Use different email |

---

## Support

If you continue to experience authentication issues:

1. **Check logs:**
   ```bash
   tail -f backend.log
   ```

2. **Enable debug mode:**
   ```env
   FLASK_DEBUG=True
   ```

3. **Test database connection:**
   ```bash
   python3 backend/flask-api/test_db.py
   ```

4. **Verify user creation:**
   ```bash
   python3 create_users.py
   ```
