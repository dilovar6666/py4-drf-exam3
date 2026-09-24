from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    def __str__(self):
        return self.username


class UserCar(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_cars",
    )
    car = models.ForeignKey(
        "cars.Car",
        on_delete=models.CASCADE,
        related_name="saved_by_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.car}"
