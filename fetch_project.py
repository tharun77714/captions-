import os
import json
from supabase import create_client

url = "https://teydehnwtfeyfmzxcsta.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRleWRlaG53dGZleWZtenhjc3RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTI0MjU3MCwiZXhwIjoyMDk2ODE4NTcwfQ.VprBWN0245PWK-yuts_7uj-jiPXQA7bjU_U-7NSIF5k"

supabase = create_client(url, key)
response = supabase.table('projects').select('*').eq('id', '83838c82-3ac6-4ec8-9f3e-b41236bb7287').execute()
if response.data:
    with open("project_data.json", "w", encoding='utf-8') as f:
        json.dump(response.data[0], f, indent=2, ensure_ascii=False)
    print("Project data written to project_data.json")
else:
    print("Project not found")
