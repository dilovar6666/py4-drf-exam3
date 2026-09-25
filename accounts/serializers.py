from rest_framework import serializers

from .models import CustomUser, UserCar


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "first_name", "last_name", "email")


class UserCarSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCar
        fields = "__all__"
