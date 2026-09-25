from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from shop.views import (
    CartItemDetailView,
    CartItemListCreateView,
    CartListCreateView,
    FavoriteDetailView,
    FavoriteListCreateView,
)

from .views import (
    EmailTokenObtainPairView,
    ProfileView,
    RegisterView,
    UserCarDetailView,
    UserCarListCreateView,
    VerifyEmailView,
)


urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("auth/login/", EmailTokenObtainPairView.as_view(), name="login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/profile/", ProfileView.as_view(), name="profile"),
    path("account/cars/", UserCarListCreateView.as_view(), name="user-car-list"),
    path(
        "account/cars/<int:pk>/",
        UserCarDetailView.as_view(),
        name="user-car-detail",
    ),
    path(
        "account/favorites/",
        FavoriteListCreateView.as_view(),
        name="favorite-list",
    ),
    path(
        "account/favorites/<int:pk>/",
        FavoriteDetailView.as_view(),
        name="favorite-detail",
    ),
    path("account/cart/", CartListCreateView.as_view(), name="cart-list"),
    path(
        "account/cart/items/",
        CartItemListCreateView.as_view(),
        name="cart-item-list",
    ),
    path(
        "account/cart/items/<int:pk>/",
        CartItemDetailView.as_view(),
        name="cart-item-detail",
    ),
]
