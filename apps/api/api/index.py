import os
import sys
from pathlib import Path

# Ensure the backend root (apps/api) is in Python's module search path
api_dir = Path(__file__).resolve().parent.parent
if str(api_dir) not in sys.path:
    sys.path.insert(0, str(api_dir))

# Explicitly declare serverless environment for Vercel execution
os.environ["IS_SERVERLESS"] = "1"
os.environ["VERCEL"] = "1"

from app.main import app

# Export the ASGI application for Vercel
# Vercel's @vercel/python automatically uses `app` or `handler`
handler = app
