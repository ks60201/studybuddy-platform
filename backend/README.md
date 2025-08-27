# AI Study Buddy Backend

FastAPI backend for the AI Study Buddy application with Supabase integration.

## Features

- User registration with username, full name, email, country, school name, and password
- User login with email and password
- JWT token authentication
- Password hashing with bcrypt
- Supabase database integration
- CORS enabled for frontend integration

## Setup Instructions

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to your project dashboard
3. Navigate to SQL Editor
4. Run the SQL commands from `supabase_schema.sql`
5. Go to Settings > API to get your project URL and anon key

### 3. Configure Environment

Update the following variables in `main.py`:

```python
SUPABASE_URL = "your-supabase-project-url"
SUPABASE_KEY = "your-supabase-anon-key"
SECRET_KEY = "your-secure-secret-key"  # Change this to a secure random string
```

### 4. Run the Server

```bash
# Development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or run directly
python main.py
```

The API will be available at `http://localhost:8000`

## API Endpoints

### Authentication

- `POST /register` - Register a new user
- `POST /login` - Login with email and password
- `GET /me` - Get current user data (requires authentication)

### Utility

- `GET /` - Health check
- `GET /countries` - Get list of available countries

## API Documentation

Once the server is running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database Schema

The `users` table includes:

- `id` (UUID, Primary Key)
- `username` (VARCHAR, Unique)
- `full_name` (VARCHAR)
- `email` (VARCHAR, Unique)
- `country` (VARCHAR)
- `school_name` (VARCHAR)
- `password_hash` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Row Level Security (RLS) in Supabase
- CORS protection
- Input validation with Pydantic
