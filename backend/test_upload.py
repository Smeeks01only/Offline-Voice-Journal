import requests

with open(r"..\Journal_entry.mp3", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/entries/",
        files={"audio_path": f},
    )

print(f"Status: {response.status_code}")
print(response.json())
