from django.urls import path

from .views import (
    AIConversationDetailView,
    AIConversationListCreateView,
    AIMessageDetailView,
    AIMessageListCreateView,
    AskView,
    VoiceView,
)


urlpatterns = [
    path("ask/", AskView.as_view(), name="ai-ask"),
    path("voice/", VoiceView.as_view(), name="ai-voice"),
    path(
        "conversations/",
        AIConversationListCreateView.as_view(),
        name="ai-conversation-list",
    ),
    path(
        "conversations/<int:pk>/",
        AIConversationDetailView.as_view(),
        name="ai-conversation-detail",
    ),
    path(
        "conversations/<int:conversation_id>/messages/",
        AIMessageListCreateView.as_view(),
        name="ai-message-list",
    ),
    path(
        "messages/<int:pk>/",
        AIMessageDetailView.as_view(),
        name="ai-message-detail",
    ),
]
