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
    RetrieveUpdateDestroyAPIView,
)
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import CustomUser, EmailVerification, GarageCar, Profile, RecentlyViewed, UserCar
from .serializers import (
    CustomUserSerializer,
    EmailTokenObtainPairSerializer,
    RegisterSerializer,
    UserCarSerializer,
    GarageCarSerializer,
    ProfileSerializer,
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


class ProfileView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class GarageCarListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GarageCarSerializer

    def get_queryset(self):
        return GarageCar.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GarageCarDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GarageCarSerializer

    def get_queryset(self):
        return GarageCar.objects.filter(user=self.request.user)


class RecentlyViewedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from shop.models import SparePart
        from cars.models import Car, CarPart
        rows = []
        for item in RecentlyViewed.objects.filter(user=request.user)[:50]:
            model = {"car": Car, "component": CarPart, "product": SparePart}.get(item.kind)
            instance = model.objects.filter(pk=item.object_id).first() if model else None
            if instance:
                url = f"/cars/{instance.pk}" if item.kind == "car" else (
                    f"/cars/{instance.car_id}/components/{instance.component_id}" if item.kind == "component" else f"/store/products/{instance.pk}"
                )
                rows.append({"kind": item.kind, "id": item.object_id, "label": item.label or str(instance), "url": url, "viewed_at": item.viewed_at})
        return Response(rows)

    def post(self, request):
        from shop.models import SparePart
        from cars.models import Car, CarPart
        kind = request.data.get("kind")
        object_id = request.data.get("id")
        model = {"car": Car, "component": CarPart, "product": SparePart}.get(kind)
        if not model or not str(object_id or "").isdigit():
            raise ValidationError({"detail": "A valid kind and id are required."})
        instance = model.objects.filter(pk=object_id).first()
        if not instance:
            raise ValidationError({"detail": "The requested catalog item does not exist."})
        RecentlyViewed.objects.update_or_create(
            user=request.user, kind=kind, object_id=instance.pk,
            defaults={"label": str(instance)},
        )
        stale_ids = list(RecentlyViewed.objects.filter(user=request.user).order_by("-viewed_at").values_list("id", flat=True)[50:])
        RecentlyViewed.objects.filter(id__in=stale_ids).delete()
        return Response({"ok": True}, status=status.HTTP_201_CREATED)


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
