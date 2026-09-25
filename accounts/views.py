import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveAPIView,
    RetrieveDestroyAPIView,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser, EmailVerification, UserCar
from .serializers import (
    CustomUserSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserCarSerializer,
    VerifyEmailSerializer,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]
        code = f"{secrets.randbelow(1_000_000):06d}"

        EmailVerification.objects.update_or_create(
            email=email,
            defaults={
                "code": code,
                "password": make_password(password),
                "created_at": timezone.now(),
            },
        )

        send_mail(
            subject="Auto Anatomy email verification",
            message=(
                "Auto Anatomy\n\n"
                f"Your verification code: {code}\n\n"
                "The code is valid for 10 minutes."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
        )

        return Response({"message": "Verification code sent"})


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].strip().lower()
        code = serializer.validated_data["code"]
        verification = EmailVerification.objects.filter(email__iexact=email).first()

        if verification is None:
            raise ValidationError({"code": "Invalid verification code."})

        if verification.created_at < timezone.now() - timedelta(minutes=10):
            verification.delete()
            raise ValidationError({"code": "Verification code has expired."})

        if not secrets.compare_digest(verification.code, code):
            raise ValidationError({"code": "Invalid verification code."})

        user = CustomUser(
            username=verification.email,
            email=verification.email,
        )
        user.password = verification.password
        user.save()
        verification.delete()

        return Response(
            {"message": "Registration completed"},
            status=status.HTTP_201_CREATED,
        )


class EmailTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class ProfileView(RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user


class UserCarListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserCarSerializer

    def get_queryset(self):
        return UserCar.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class UserCarDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserCarSerializer

    def get_queryset(self):
        return UserCar.objects.filter(user=self.request.user)
