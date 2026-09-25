from django.shortcuts import get_object_or_404
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated

from .models import AIConversation, AIMessage
from .serializers import AIConversationSerializer, AIMessageSerializer


class AIConversationListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIConversationSerializer

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AIConversationDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIConversationSerializer

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user)


class AIMessageListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIMessageSerializer

    def get_conversation(self):
        return get_object_or_404(
            AIConversation,
            id=self.kwargs["conversation_id"],
            user=self.request.user,
        )

    def get_queryset(self):
        return AIMessage.objects.filter(conversation=self.get_conversation())

    def perform_create(self, serializer):
        serializer.save(conversation=self.get_conversation())


class AIMessageDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIMessageSerializer

    def get_queryset(self):
        return AIMessage.objects.filter(conversation__user=self.request.user)
