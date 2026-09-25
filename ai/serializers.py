from rest_framework import serializers

from .models import AIConversation, AIMessage


class AIConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConversation
        fields = "__all__"
        extra_kwargs = {"user": {"read_only": True}}


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = "__all__"
        extra_kwargs = {"conversation": {"read_only": True}}
