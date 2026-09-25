from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomUser, UserCar


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    pass


@admin.register(UserCar)
class UserCarAdmin(admin.ModelAdmin):
    list_display = ("user", "car", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "user__username",
        "user__email",
        "car__car_model__name",
        "car__car_model__brand__name",
    )
    list_select_related = ("user", "car__car_model__brand")
