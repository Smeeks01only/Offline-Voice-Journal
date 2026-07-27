import requests
import json

queries = ["anxious", "park", "xyzzy", "banana"]

for query in queries:
    r = requests.get("http://localhost:8000/api/search/", params={"q": query})
    print(f"\n--- Search results for: '{query}' ---")
    
    if r.status_code == 200:
        data = r.json()
        print(f"Found {len(data)} results.")
        print(json.dumps(data, indent=2))
    else:
        print(f"Error {r.status_code}: {r.text}")
