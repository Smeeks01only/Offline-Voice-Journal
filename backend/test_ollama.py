import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "gemma3:4b",
        "prompt": 'Reply with only this JSON: {"message": "hello"}',
        "stream": False,
    },
)
print(response.json())
