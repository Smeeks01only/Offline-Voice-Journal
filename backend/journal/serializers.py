from rest_framework import serializers
from .models import Entry, Reflection

class ReflectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reflection
        fields = '__all__'

class EntrySerializer(serializers.ModelSerializer):
    reflection = ReflectionSerializer(read_only=True)

    class Meta:
        model = Entry
        fields = '__all__'
