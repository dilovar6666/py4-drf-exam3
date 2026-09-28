"""Small JWT/staff-only API for the custom Auto Anatomy admin.

Public read endpoints retain their existing contract. These viewsets use the
existing serializers and relations; no duplicated product/compatibility model.
"""
from rest_framework import filters, status, viewsets
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.views import APIView
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError

from cars.models import Car, CarBrand, CarModel, CarPart, PartCategory, PartSpecification, CarImportJob
from cars.serializers import (
    CarSerializer, CarBrandSerializer, CarModelSerializer, CarPartSerializer,
    PartCategorySerializer, PartSpecificationSerializer,
    CarImportJobCreateSerializer, CarImportJobSerializer,
)
from shop.models import SparePart, PartBrand, ProductCategory, PartCompatibility, SparePartImage
from shop.serializers import (
    SparePartSerializer, PartBrandSerializer, ProductCategorySerializer,
    PartCompatibilitySerializer, SparePartImageSerializer,
)
from accounts.models import CustomUser, GarageCar, RecentlyViewed
from ai.models import AIMessage


class StaffViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter]

    def get_queryset(self):
        queryset = super().get_queryset()
        for field in self.filter_fields:
            value = self.request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset


# Each resource uses exactly the fields of its existing ModelSerializer.
resources = {
    "cars": (Car, CarSerializer, ["description", "car_model__name", "car_model__brand__name"], ["car_model", "year"]),
    "brands": (CarBrand, CarBrandSerializer, ["name"], []),
    "models": (CarModel, CarModelSerializer, ["name"], ["brand"]),
    "components": (CarPart, CarPartSerializer, ["name", "component_id", "description"], ["car", "category"]),
    "component-categories": (PartCategory, PartCategorySerializer, ["name"], []),
    "specifications": (PartSpecification, PartSpecificationSerializer, ["name", "value"], ["car_part"]),
    "products": (SparePart, SparePartSerializer, ["name", "sku", "oem_number", "description"], ["brand", "category", "car_part"]),
    "product-brands": (PartBrand, PartBrandSerializer, ["name"], []),
    "product-categories": (ProductCategory, ProductCategorySerializer, ["name"], []),
    "images": (SparePartImage, SparePartImageSerializer, [], ["spare_part"]),
    "compatibility": (PartCompatibility, PartCompatibilitySerializer, ["spare_part__name", "car__car_model__name"], ["car", "spare_part"]),
}

router = DefaultRouter()
for name, (model, serializer, search_fields, filter_fields) in resources.items():
    viewset = type(f"{model.__name__}ManagementViewSet", (StaffViewSet,), {
        "queryset": model.objects.all().order_by("id"),
        "serializer_class": serializer,
        "search_fields": search_fields,
        "filter_fields": filter_fields,
        "__module__": __name__,
    })
    router.register(name, viewset, basename=f"manage-{name}")


class ManagementOverview(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(self._overview_data())

    @staticmethod
    def _overview_data():
        return {
            "counts": {
                "users": CustomUser.objects.count(),
                "cars": Car.objects.filter(is_active=True).count(),
                "three_d_cars": Car.objects.filter(is_active=True).exclude(model_url="").count(),
                "components": CarPart.objects.count(),
                "products": SparePart.objects.filter(is_draft=False).count(),
                "draft_products": SparePart.objects.filter(is_draft=True).count(),
                "compatibility": PartCompatibility.objects.filter(spare_part__is_draft=False).count(),
                "garage_cars": GarageCar.objects.count(),
                "ai_messages": AIMessage.objects.filter(role=AIMessage.Role.USER).count(),
            },
            "recent_users": list(CustomUser.objects.order_by("-date_joined").values("id", "username", "email", "date_joined")[:6]),
            "recent_products": list(SparePart.objects.order_by("-id").values("id", "name", "is_draft")[:6]),
            "recent_cars": list(Car.objects.select_related("car_model__brand").order_by("-id").values("id", "year", "car_model__name", "car_model__brand__name")[:6]),
            "popular": ManagementOverview._popular(),
        }

    @staticmethod
    def _popular():
        from django.db.models import Count
        values = RecentlyViewed.objects.values("kind", "object_id").annotate(views=Count("id")).order_by("-views")[:30]
        result = {"cars": [], "components": [], "products": []}
        for row in values:
            kind = row["kind"]
            model = {"car": Car, "component": CarPart, "product": SparePart}.get(kind)
            target = {"car": "cars", "component": "components", "product": "products"}.get(kind)
            item = model.objects.filter(pk=row["object_id"]).first() if model else None
            if item and target and (not getattr(item, "is_draft", False)):
                result[target].append({"id": item.pk, "name": str(item), "views": row["views"]})
        return result


class GenerateProductsFromCarParts(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        car_id = request.data.get("car")
        if car_id and not str(car_id).isdigit():
            raise ValidationError({"car": "Enter a valid car id."})
        parts = CarPart.objects.select_related("car", "category")
        if car_id:
            parts = parts.filter(car_id=car_id)
        created, skipped = [], 0
        for part in parts.order_by("id"):
            product = SparePart.objects.filter(car_part=part).first()
            if not product:
                category, _ = ProductCategory.objects.get_or_create(
                    name=part.category.name,
                    defaults={"description": part.category.description},
                )
                product = SparePart.objects.create(
                    brand=None,
                    category=category,
                    car_part=part,
                    name=part.name,
                    sku="",
                    oem_number="",
                    description=part.description,
                    is_draft=True,
                )
                created.append(product.pk)
            else:
                skipped += 1
            PartCompatibility.objects.get_or_create(spare_part=product, car=part.car)
        return Response({"created": len(created), "skipped_existing": skipped, "product_ids": created}, status=status.HTTP_200_OK)


class CarImportJobListCreateView(ListCreateAPIView):
    permission_classes = [IsAdminUser]
    queryset = CarImportJob.objects.select_related("uploaded_by", "car").all()
    serializer_class = CarImportJobSerializer

    def get_serializer_class(self):
        return CarImportJobCreateSerializer if self.request.method == "POST" else CarImportJobSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            CarImportJobSerializer(self.created_job, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def perform_create(self, serializer):
        job = serializer.save(uploaded_by=self.request.user)
        self.created_job = job
        try:
            from cars.services import enqueue_analysis
            enqueue_analysis(job)
        except Exception:
            job.status = CarImportJob.Status.FAILED
            job.error_message = "The Celery worker is not installed or could not be reached. Configure Redis and start the worker."
            job.current_stage = "Queue unavailable"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])


class CarImportJobDetailView(RetrieveAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = CarImportJobSerializer
    queryset = CarImportJob.objects.select_related("uploaded_by", "car").all()


class CarImportJobReviewView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        job = CarImportJob.objects.get(pk=pk)
        if job.status != CarImportJob.Status.READY_FOR_REVIEW:
            raise ValidationError({"detail": "Only analyzed imports can be reviewed."})
        submitted = request.data.get("components")
        if not isinstance(submitted, list) or len(submitted) != len(job.component_manifest):
            raise ValidationError({"components": "Submit one review row for each analyzed geometry island."})
        by_key = {}
        for row in submitted:
            if not isinstance(row, dict):
                raise ValidationError({"components": "Review rows must be objects."})
            keys = row.get("source_keys")
            if not isinstance(keys, list) or not keys:
                raise ValidationError({"components": "Every row must retain its source geometry keys."})
            for key in keys:
                if key in by_key:
                    raise ValidationError({"components": "A source geometry island cannot be assigned twice."})
                by_key[key] = row
        expected = {key for row in job.component_manifest for key in row.get("source_keys", [])}
        if set(by_key) != expected:
            raise ValidationError({"components": "Review must preserve every original geometry island."})
        reviewed = []
        import re
        for original in job.component_manifest:
            row = by_key[original["source_keys"][0]]
            component_id = str(row.get("component_id", ""))
            if not re.fullmatch(r"[a-z][a-z0-9_]{0,99}", component_id):
                raise ValidationError({"component_id": "Use lowercase snake_case component IDs."})
            category = row.get("category", "UNKNOWN")
            if category not in {"BODY", "GLASS", "LIGHTING", "WHEELS", "BRAKES", "ENGINE", "DRIVETRAIN", "SUSPENSION", "INTERIOR", "CHASSIS", "EXHAUST", "UNKNOWN"}:
                raise ValidationError({"category": "Choose a supported semantic category."})
            confidence = row.get("confidence", "UNKNOWN")
            if confidence not in {"HIGH", "MEDIUM", "UNKNOWN"}:
                raise ValidationError({"confidence": "Choose HIGH, MEDIUM, or UNKNOWN."})
            reviewed.append({
                **original,
                "component_id": component_id,
                "name": str(row.get("name", original.get("name", ""))).strip()[:150],
                "category": category,
                "confidence": confidence,
                "disabled": bool(row.get("disabled", False)),
            })
        job.review_manifest = reviewed
        job.save(update_fields=["review_manifest"])
        return Response(CarImportJobSerializer(job, context={"request": request}).data)


class CarImportJobPublishView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        job = CarImportJob.objects.get(pk=pk)
        if job.status != CarImportJob.Status.READY_FOR_REVIEW:
            raise ValidationError({"detail": "The import must be ready for review before publishing."})
        job.status = CarImportJob.Status.QUEUED
        job.progress = 88
        job.current_stage = "Queued for reviewed export"
        job.error_message = ""
        job.save(update_fields=["status", "progress", "current_stage", "error_message"])
        try:
            from cars.services import enqueue_publish
            enqueue_publish(job)
        except Exception:
            job.status = CarImportJob.Status.FAILED
            job.error_message = "The Celery worker is not installed or could not be reached. Configure Redis and start the worker."
            job.current_stage = "Queue unavailable"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])
        return Response(CarImportJobSerializer(job, context={"request": request}).data, status=status.HTTP_202_ACCEPTED)


class CarImportJobRetryView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        job = CarImportJob.objects.get(pk=pk)
        if job.status != CarImportJob.Status.FAILED:
            raise ValidationError({"detail": "Only failed imports can be retried."})
        job.status = CarImportJob.Status.QUEUED
        job.progress = 0
        job.error_message = ""
        job.current_stage = "Queued for retry"
        job.finished_at = None
        job.save(update_fields=["status", "progress", "error_message", "current_stage", "finished_at"])
        try:
            from cars.services import enqueue_analysis
            enqueue_analysis(job)
        except Exception:
            job.status = CarImportJob.Status.FAILED
            job.error_message = "The Celery worker is not installed or could not be reached. Configure Redis and start the worker."
            job.current_stage = "Queue unavailable"
            job.finished_at = timezone.now()
            job.save(update_fields=["status", "error_message", "current_stage", "finished_at"])
        return Response(CarImportJobSerializer(job, context={"request": request}).data, status=status.HTTP_202_ACCEPTED)


class StaffPlatformSection(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, section):
        from ai.models import AIConversation
        from accounts.models import GarageCar
        if section == "users":
            return Response({"title": "Users", "rows": list(CustomUser.objects.order_by("-date_joined").values("id", "username", "email", "is_active", "is_staff", "date_joined")[:500])})
        if section == "garage":
            return Response({"title": "User Garage", "rows": list(GarageCar.objects.select_related("user").values("id", "user__email", "brand", "model", "year", "generation_trim", "created_at")[:500])})
        if section == "ai":
            return Response({"title": "AI", "rows": list(AIConversation.objects.select_related("user").order_by("-updated_at").values("id", "user__email", "title", "created_at", "updated_at")[:500])})
        if section == "3d-models":
            return Response({"title": "3D Models", "rows": list(Car.objects.select_related("car_model__brand").exclude(model_url="").order_by("id").values("id", "car_model__brand__name", "car_model__name", "year", "model_url", "is_active")[:500])})
        if section == "analytics":
            return Response({"title": "Analytics", **ManagementOverview._overview_data()})
        if section == "tasks":
            return Response({"title": "Background Tasks", "rows": list(CarImportJob.objects.order_by("-created_at").values("id", "status", "progress", "current_stage", "celery_task_id", "error_message", "created_at")[:500])})
        if section == "settings":
            import os
            try:
                from redis import Redis
                redis_ready = bool(Redis.from_url(os.environ.get("CELERY_BROKER_URL", "redis://127.0.0.1:6379/0"), socket_connect_timeout=1, socket_timeout=1).ping())
            except Exception:
                redis_ready = False
            try:
                from .celery import app as celery_app
                celery_installed = celery_app is not None
            except Exception:
                celery_installed = False
            from cars.import_pipeline import _blender_executable
            return Response({"title": "Settings", "providers": {"ai_configured": bool(os.environ.get("GEMINI_API_KEY", "").strip()), "ai_provider": "Google Gemini", "external_search_configured": bool(os.environ.get("EXA_API_KEY", "").strip()), "external_search_provider": "Exa Search", "celery_installed": celery_installed, "redis_connected": redis_ready, "blender_available": bool(_blender_executable())}})
        raise ValidationError({"detail": "Unknown admin section."})
