from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, UserCar


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "first_name", "last_name", "email")


class UserCarSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCar
        fields = "__all__"
        extra_kwargs = {"user": {"read_only": True}}


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_email(self, value):
        email = value.strip().lower()

        if CustomUser.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with this email already exists.")

        return email


class VerifyEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.RegexField(r"^\d{6}$")


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields.pop(self.username_field)

    def validate(self, attrs):
        email = attrs.pop("email")
        user = CustomUser.objects.filter(email__iexact=email).first()

        if user is None:
            raise AuthenticationFailed(
                "No active account found with the given credentials"
            )

        attrs[self.username_field] = user.username
        return super().validate(attrs)
