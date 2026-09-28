from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import CustomUser, GarageCar, Profile, UserCar


class SafePhotoSerializerMixin:
    def validate_photo_file(self, uploaded):
        if uploaded.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Photo must be 5 MB or smaller.")
        header = uploaded.read(12)
        uploaded.seek(0)
        valid = (
            header.startswith(b"\xff\xd8\xff")
            or header.startswith(b"\x89PNG\r\n\x1a\n")
            or (header[:4] == b"RIFF" and header[8:12] == b"WEBP")
        )
        if not valid:
            raise serializers.ValidationError("Upload a valid JPEG, PNG, or WebP image.")
        return uploaded


class ProfileSerializer(SafePhotoSerializerMixin, serializers.ModelSerializer):
    avatar = serializers.FileField(required=False, allow_empty_file=False)
    email = serializers.EmailField(source="user.email", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = Profile
        fields = ("display_name", "preferred_language", "avatar", "created_at", "updated_at", "email", "username", "is_staff")
        read_only_fields = ("created_at", "updated_at", "email", "username", "is_staff")

    def validate_avatar(self, uploaded):
        return self.validate_photo_file(uploaded)


class GarageCarSerializer(SafePhotoSerializerMixin, serializers.ModelSerializer):
    photo = serializers.FileField(required=True, allow_empty_file=False)
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = GarageCar
        fields = ("id", "photo", "brand", "model", "year", "generation_trim", "notes", "created_at", "user")
        read_only_fields = ("id", "created_at", "user")

    def validate_photo(self, uploaded):
        return self.validate_photo_file(uploaded)

    def validate_year(self, year):
        from datetime import date
        if year < 1886 or year > date.today().year + 1:
            raise serializers.ValidationError("Enter a plausible model year.")
        return year


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ("id", "username", "first_name", "last_name", "email", "is_staff")
        read_only_fields = ("is_staff",)


class UserCarSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCar
        fields = "__all__"
        extra_kwargs = {"user": {"read_only": True}}


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True)

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
