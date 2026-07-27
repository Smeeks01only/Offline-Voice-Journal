import requests
import json

response = requests.get("http://localhost:8000/api/entries/")
print(f"Status: {response.status_code}")
print(f"Total entries: {len(response.json())}")

# Print first two entries
print(json.dumps(response.json()[:2], indent=2))
