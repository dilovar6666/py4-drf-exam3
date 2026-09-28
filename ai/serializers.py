from rest_framework import serializers

from .models import AIConversation, AIMessage


class AskSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)
    car_id = serializers.IntegerField(required=False, min_value=1)
    component_id = serializers.CharField(required=False, max_length=100)
    garage_car_id = serializers.IntegerField(required=False, min_value=1)
    conversation_id = serializers.IntegerField(required=False, min_value=1)
    language = serializers.ChoiceField(choices=["en", "ru", "tg"], required=False)
    route = serializers.CharField(max_length=256, required=False, allow_blank=True)
    explode_percentage = serializers.IntegerField(required=False, min_value=0, max_value=100)
    available_component_ids = serializers.ListField(
        child=serializers.CharField(max_length=100), required=False, max_length=200,
    )


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
