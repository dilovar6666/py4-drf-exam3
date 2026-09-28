"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from .management_api import (
    ManagementOverview, GenerateProductsFromCarParts, CarImportJobListCreateView,
    CarImportJobDetailView, CarImportJobReviewView, CarImportJobPublishView,
    CarImportJobRetryView, router as management_router,
    StaffPlatformSection,
)

urlpatterns = [
    path("api/manage/overview/", ManagementOverview.as_view(), name="manage-overview"),
    path("api/manage/generate-products/", GenerateProductsFromCarParts.as_view(), name="manage-generate-products"),
    path("api/manage/import-jobs/", CarImportJobListCreateView.as_view(), name="manage-import-job-list"),
    path("api/manage/import-jobs/<int:pk>/", CarImportJobDetailView.as_view(), name="manage-import-job-detail"),
    path("api/manage/import-jobs/<int:pk>/review/", CarImportJobReviewView.as_view(), name="manage-import-job-review"),
    path("api/manage/import-jobs/<int:pk>/publish/", CarImportJobPublishView.as_view(), name="manage-import-job-publish"),
    path("api/manage/import-jobs/<int:pk>/retry/", CarImportJobRetryView.as_view(), name="manage-import-job-retry"),
    path("api/manage/platform/<slug:section>/", StaffPlatformSection.as_view(), name="manage-platform-section"),
    path("api/manage/", include(management_router.urls)),
    path('admin/', admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/ai/", include("ai.urls")),
    path("api/cars/", include("cars.urls")),
    path("api/shop/", include("shop.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
