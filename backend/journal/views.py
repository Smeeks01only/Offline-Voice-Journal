from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import connection
from .models import Entry
from .serializers import EntrySerializer

class EntryListCreateView(APIView):
    def get(self, request):
        entries = Entry.objects.all().order_by('-created_at')
        serializer = EntrySerializer(entries, many=True)
        return Response(serializer.data)
        
    def post(self, request):
        audio_file = request.FILES.get('audio_path')
        if not audio_file:
            return Response({'error': 'No audio file provided.'}, status=status.HTTP_400_BAD_REQUEST)
            
        content_type = audio_file.content_type
        if not content_type or not content_type.startswith('audio/'):
            return Response({'error': 'Invalid file type. Must be an audio file.'}, status=status.HTTP_400_BAD_REQUEST)
            
        serializer = EntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class EntryDetailView(APIView):
    def get(self, request, pk):
        entry = get_object_or_404(Entry, pk=pk)
        serializer = EntrySerializer(entry)
        return Response(serializer.data)

class SearchEntriesView(APIView):
    def get(self, request):
        query = request.GET.get('q', '').strip()
        if not query:
            return Response([])
            
        sql = '''
            SELECT e.id, e.created_at, e.status, snippet(entry_fts, 0, '<b>', '</b>', '...', 10) as transcript_snippet
            FROM entry_fts fts
            JOIN journal_entry e ON fts.rowid = e.id
            WHERE entry_fts MATCH %s
            ORDER BY rank
        '''
        results = []
        with connection.cursor() as cursor:
            try:
                # Wrap in double quotes for phrase search to prevent syntax errors on raw strings
                escaped_query = '"' + query.replace('"', '""') + '"'
                cursor.execute(sql, [escaped_query])
                columns = [col[0] for col in cursor.description]
                for row in cursor.fetchall():
                    results.append(dict(zip(columns, row)))
            except Exception as e:
                return Response({'error': 'Invalid search query.'}, status=400)
                
        return Response(results)
