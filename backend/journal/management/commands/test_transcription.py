import time
import os
from django.core.management.base import BaseCommand
from django.core.files import File
from journal.models import Entry

class Command(BaseCommand):
    help = 'Tests the transcription background process locally'

    def add_arguments(self, parser):
        parser.add_argument('audio_file', type=str, help='Path to an audio file (.wav, .mp3, etc.)')

    def handle(self, *args, **options):
        audio_file_path = options['audio_file']
        
        if not os.path.exists(audio_file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {audio_file_path}"))
            return

        self.stdout.write(self.style.SUCCESS(f"Creating entry for {audio_file_path}..."))

        # Create entry to trigger post_save signal
        with open(audio_file_path, 'rb') as f:
            entry = Entry()
            entry.audio_path.save(os.path.basename(audio_file_path), File(f), save=False)
            entry.save()

        self.stdout.write(self.style.SUCCESS(f"Entry created with ID {entry.id}. Status: {entry.status}"))
        self.stdout.write("Waiting for transcription to complete (polling)...")

        # Poll until status is not 'pending' or 'transcribing'
        while True:
            entry.refresh_from_db()
            self.stdout.write(f"Current status: {entry.status}")
            if entry.status in ['done', 'error', 'reflecting']:
                break
            time.sleep(2)

        if entry.status == 'error':
            self.stdout.write(self.style.ERROR(f"Transcription failed: {entry.error_message}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Transcription succeeded!"))
            self.stdout.write(f"Duration: {entry.duration_sec}s")
            self.stdout.write(f"Transcript: {entry.transcript}")
