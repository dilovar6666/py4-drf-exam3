from django.db import models

from accounts.models import CustomUser


class AIConversation(models.Model):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="ai_conversations",
    )
    car = models.ForeignKey(
        "cars.Car",
        on_delete=models.SET_NULL,
        related_name="ai_conversations",
        null=True,
        blank=True,
    )
    car_part = models.ForeignKey(
        "cars.CarPart",
        on_delete=models.SET_NULL,
        related_name="ai_conversations",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class AIMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    conversation = models.ForeignKey(
        AIConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_role_display()}: {self.conversation}"
