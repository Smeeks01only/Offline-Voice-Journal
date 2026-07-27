import requests
import time
import sys

# Get entry_id from command line or default to 1
entry_id = sys.argv[1] if len(sys.argv) > 1 else 1

print(f"Polling status for entry {entry_id}...")

for _ in range(60): # 5 mins max
    r = requests.get(f"http://localhost:8000/api/entries/{entry_id}/")
    data = r.json()
    print(data["status"])
    if data["status"] in ("done", "error"):
        import json
        print(json.dumps(data, indent=2))
        break
    time.sleep(5)
