import threading
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

class Entry(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("transcribing", "Transcribing"),
        ("reflecting", "Reflecting"),
        ("done", "Done"),
        ("error", "Error"),
    ]
    created_at = models.DateTimeField(auto_now_add=True)
    audio_path = models.FileField(upload_to="audio/")
    transcript = models.TextField(blank=True)
    duration_sec = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)

class Reflection(models.Model):
    entry = models.OneToOneField(Entry, on_delete=models.CASCADE, related_name="reflection")
    mood = models.CharField(max_length=50, blank=True)
    themes = models.JSONField(default=list)
    summary = models.TextField(blank=True)
    follow_up_question = models.TextField(blank=True)
    model_version = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

def process_entry_audio(entry_id):
    try:
        entry = Entry.objects.get(id=entry_id)
        entry.status = "transcribing"
        entry.save(update_fields=["status"])
        
        from journal.services.transcription import transcribe_audio
        
        transcript_text, duration_sec = transcribe_audio(entry.audio_path.path)
        
        entry.transcript = transcript_text
        entry.duration_sec = duration_sec
        entry.status = "reflecting"
        entry.save(update_fields=["transcript", "duration_sec", "status"])
        
        from journal.services.reflection import generate_reflection, MODEL_NAME
        
        if transcript_text.strip():
            reflection_data = generate_reflection(transcript_text)
            
            Reflection.objects.create(
                entry=entry,
                mood=reflection_data.get("mood", ""),
                themes=reflection_data.get("themes", []),
                summary=reflection_data.get("summary", ""),
                follow_up_question=reflection_data.get("follow_up_question", ""),
                model_version=MODEL_NAME
            )
            
        entry.status = "done"
        entry.save(update_fields=["status"])
        
    except Exception as e:
        try:
            entry = Entry.objects.get(id=entry_id)
            entry.status = "error"
            entry.error_message = str(e)
            entry.save(update_fields=["status", "error_message"])
        except Exception:
            pass

@receiver(post_save, sender=Entry)
def start_transcription_on_create(sender, instance, created, **kwargs):
    if created and instance.audio_path:
        thread = threading.Thread(target=process_entry_audio, args=(instance.id,))
        thread.start()
