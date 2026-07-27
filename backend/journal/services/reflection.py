import json
import urllib.request
import urllib.error

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "gemma3:4b"

# Exact prompt template to use for generating reflections
PROMPT_TEMPLATE = """You are an insightful journaling assistant. Analyze the following transcript of a voice journal entry and provide a reflection.

Transcript: "{transcript}"

You must respond ONLY with a raw, valid JSON object containing exactly the following keys:
- "mood": A single word or short phrase describing the emotional tone (string).
- "themes": Key topics discussed (list of strings).
- "summary": A brief 1-2 sentence summary of the entry (string).
- "follow_up_question": A thoughtful question to prompt further reflection (string).

Do not include any preamble, explanations, or markdown formatting (e.g. no ```json blocks).
"""

# Stricter prompt for retry
RETRY_PROMPT_TEMPLATE = """You previously returned invalid JSON. 
Analyze the transcript below and return the reflection.

Transcript: "{transcript}"

CRITICAL INSTRUCTION: You MUST return ONLY valid JSON. No markdown code blocks, no text outside the JSON object.
Format must be exactly:
{
  "mood": "string",
  "themes": ["string", "string"],
  "summary": "string",
  "follow_up_question": "string"
}
"""

def generate_reflection(transcript: str) -> dict:
    """
    Calls Ollama to generate a reflection on the transcript.
    Retries once with a stricter prompt if JSON parsing fails.
    Returns the parsed JSON dictionary.
    """
    def _call_ollama(prompt: str) -> str:
        data = {
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "format": "json" # Ollama feature to enforce JSON structure
        }
        req = urllib.request.Request(
            OLLAMA_URL, 
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        try:
            with urllib.request.urlopen(req) as response:
                result = json.loads(response.read().decode('utf-8'))
                return result.get("response", "")
        except Exception as e:
            raise Exception(f"Failed to communicate with Ollama: {e}")

    try:
        response_text = _call_ollama(PROMPT_TEMPLATE.format(transcript=transcript))
        # Strip potential markdown fences anyway just to be safe
        clean_response = response_text.strip()
        if clean_response.startswith('```json'):
            clean_response = clean_response[7:]
        if clean_response.startswith('```'):
            clean_response = clean_response[3:]
        if clean_response.endswith('```'):
            clean_response = clean_response[:-3]
        return json.loads(clean_response.strip())
    except json.JSONDecodeError:
        # Retry once with stricter prompt
        response_text = _call_ollama(RETRY_PROMPT_TEMPLATE.format(transcript=transcript))
        clean_response = response_text.strip()
        if clean_response.startswith('```json'):
            clean_response = clean_response[7:]
        if clean_response.startswith('```'):
            clean_response = clean_response[3:]
        if clean_response.endswith('```'):
            clean_response = clean_response[:-3]
        try:
            return json.loads(clean_response.strip())
        except json.JSONDecodeError:
            raise Exception("Ollama model repeatedly failed to return valid JSON.")
