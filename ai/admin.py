from django.contrib import admin

from .models import AIConversation, AIMessage


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "title",
        "car",
        "car_part",
        "created_at",
        "updated_at",
    )
    list_filter = ("created_at", "updated_at")
    search_fields = ("title", "user__username", "user__email")
    list_select_related = ("user", "car", "car_part")


@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = ("conversation", "role", "content", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("conversation__title", "content")
    list_select_related = ("conversation",)
