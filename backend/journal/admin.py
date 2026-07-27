from django.contrib import admin
from .models import Entry, Reflection

@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'status', 'created_at', 'duration_sec')
    list_filter = ('status', 'created_at')

@admin.register(Reflection)
class ReflectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'entry', 'mood', 'model_version', 'created_at')
    list_filter = ('mood', 'model_version', 'created_at')
