from supabase import create_client, Client

# Supabase configuration
SUPABASE_URL = "https://tsqdwcqafuffcjklpcsy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcWR3Y3FhZnVmZmNqa2xwY3N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NTEwNDQsImV4cCI6MjA2NjEyNzA0NH0.RLVhpsyERnVmI6JLo7NIs3FPeoQvjAbYmQ_zyoLD-nI"

# Service role key for authenticated operations (bypasses RLS)
# Get this from Supabase dashboard: Settings → API → service_role key
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzcWR3Y3FhZnVmZmNqa2xwY3N5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDU1MTA0NCwiZXhwIjoyMDY2MTI3MDQ0fQ.0u-R5ANC7ffNFN-Fbw3B-zwDLN6pss1pP1YNpR3Qit0"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# JWT configuration
SECRET_KEY = "ai-study-buddy-secret-key-2024-super-secure-jwt-token-signing-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 