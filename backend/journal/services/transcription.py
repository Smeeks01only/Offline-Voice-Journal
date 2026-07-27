import os
import time
from faster_whisper import WhisperModel

# Module-level singleton model
MODEL_SIZE = "base"
# Load model on CPU with int8 compute type
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")

def transcribe_audio(audio_path: str) -> tuple[str, float]:
    """
    Transcribes the given audio file using faster-whisper.
    Returns a tuple of (transcript_text, duration_seconds).
    """
    segments, info = model.transcribe(audio_path, beam_size=5)
    
    # Consume the generator to perform transcription
    text_segments = []
    for segment in segments:
        text_segments.append(segment.text)
        
    transcript_text = " ".join(text_segments).strip()
    
    # Return transcript text and the duration of the audio in seconds
    return transcript_text, info.duration
