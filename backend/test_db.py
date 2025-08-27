from config import supabase
from datetime import datetime

def test_database_connection():
    try:
        # Test basic connection
        print("Testing database connection...")
        
        # Check if users table exists
        result = supabase.table("users").select("count", count="exact").execute()
        print(f"Users table exists. Count: {result.count}")
        
        # Get table structure by trying to insert a test user
        test_user = {
            "username": "test_user",
            "full_name": "Test User",
            "email": "test@example.com",
            "country": "Test Country",
            "school_name": "Test School",
            "password_hash": "test_hash",
            "created_at": datetime.utcnow().isoformat()
        }
        
        print("Attempting to insert test user...")
        result = supabase.table("users").insert(test_user).execute()
        
        if result.data:
            print("✅ Test user inserted successfully!")
            print("Users table structure:")
            for key in result.data[0].keys():
                print(f"  - {key}")
            
            # Clean up - delete the test user
            user_id = result.data[0]["id"]
            supabase.table("users").delete().eq("id", user_id).execute()
            print("✅ Test user cleaned up")
        else:
            print("❌ Failed to insert test user")
            print("Error:", result.error if hasattr(result, 'error') else "Unknown error")
            
        return True
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return False

if __name__ == "__main__":
    test_database_connection() 