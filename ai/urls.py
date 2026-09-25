from django.urls import path

from .views import (
    AIConversationDetailView,
    AIConversationListCreateView,
    AIMessageDetailView,
    AIMessageListCreateView,
)


urlpatterns = [
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
