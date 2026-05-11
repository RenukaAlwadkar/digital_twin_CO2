import psycopg2
import sys

# Try both with and without pooler
urls_to_test = [
    "postgresql://neondb_owner:npg_iEy1FTz7nuLk@ep-still-queen-aqsba3nz-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require",
    "postgresql://neondb_owner:npg_iEy1FTz7nuLk@ep-still-queen-aqsba3nz.us-east-1.aws.neon.tech/neondb?sslmode=require"
]

for url in urls_to_test:
    print(f"\nTesting URL: {url}")
    try:
        conn = psycopg2.connect(url)
        print("✅ CONNECTION SUCCESSFUL!")
        conn.close()
    except Exception as e:
        print(f"❌ CONNECTION FAILED: {e}")
