from django.core.management.base import BaseCommand
from journal.models import Entry

class Command(BaseCommand):
    help = 'Seeds the database with mock entries to test FTS5 search.'

    def handle(self, *args, **options):
        # We simulate the entries already being transcribed by creating them directly.
        # The post_save signal in models.py only kicks off the background thread if audio_path is present.
        
        mock_data = [
            "Today I felt really productive. I finally finished the React frontend and connected it to the Django API.",
            "I'm quite stressed about the upcoming deployment. The server configuration seems a bit flaky.",
            "Had a great walk in the park. The weather was beautiful, and it gave me time to think about my SQLite FTS5 implementation.",
            "This voice journal app is coming together nicely. I just need to figure out how to reliably parse the Ollama JSON responses."
        ]
        
        count = 0
        for transcript in mock_data:
            # We don't provide an audio_path, so the background thread is bypassed.
            Entry.objects.create(
                transcript=transcript,
                status='done',
                duration_sec=15.0
            )
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {count} mock entries."))
        self.stdout.write("You can test search by hitting: http://localhost:8000/api/search/?q=SQLite")
