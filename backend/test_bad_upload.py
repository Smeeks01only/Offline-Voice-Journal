import requests

# Create dummy text file
with open("notes.txt", "w") as f:
    f.write("Just a text file")

with open("notes.txt", "rb") as f:  # any non-audio file
    response = requests.post(
        "http://localhost:8000/api/entries/",
        files={"audio_path": f},
    )

print(response.status_code)
print(response.json())
