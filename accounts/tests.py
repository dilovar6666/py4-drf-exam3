from django.contrib.auth.hashers import check_password
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from ai.models import AIConversation, AIMessage
from cars.models import Car, CarBrand, CarModel
from shop.models import Cart, CartItem, Favorite, PartBrand, ProductCategory, SparePart

from .models import CustomUser, EmailVerification, UserCar


TEST_JWT_SETTINGS = {
    "SIGNING_KEY": "test-secret-key-that-is-longer-than-thirty-two-bytes",
}


def create_car(name="Test Car"):
    brand = CarBrand.objects.create(
        name=f"{name} Brand",
        logo_url="https://example.com/brand.png",
    )
    car_model = CarModel.objects.create(brand=brand, name=name)
    return Car.objects.create(
        car_model=car_model,
        year=2024,
        description="Test car",
        model_url="https://example.com/car.glb",
        image_url="https://example.com/car.png",
    )


def create_spare_part(name="Test Part"):
    brand = PartBrand.objects.create(
        name=f"{name} Brand",
        logo_url="https://example.com/part-brand.png",
        website_url="https://example.com/",
    )
    category = ProductCategory.objects.create(
        name=f"{name} Category",
        description="Test category",
    )
    return SparePart.objects.create(
        brand=brand,
        category=category,
        name=name,
        sku=f"SKU-{name}",
        oem_number=f"OEM-{name}",
        description="Test spare part",
    )


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SECRET_KEY="test-secret-key-that-is-longer-than-thirty-two-bytes",
    SIMPLE_JWT=TEST_JWT_SETTINGS,
)
class AuthenticationTests(APITestCase):
    def test_registration_verification_jwt_refresh_and_profile(self):
        email = "new-user@example.com"
        password = "StrongPassword123!"

        register_response = self.client.post(
            reverse("register"),
            {"email": email, "password": password},
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_200_OK)
        self.assertEqual(register_response.data, {"message": "Verification code sent"})
        self.assertNotIn("code", register_response.data)
        self.assertEqual(len(mail.outbox), 1)

        repeat_response = self.client.post(
            reverse("register"),
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(repeat_response.status_code, status.HTTP_200_OK)
        self.assertEqual(EmailVerification.objects.filter(email=email).count(), 1)
        self.assertEqual(len(mail.outbox), 2)

        verification = EmailVerification.objects.get(email=email)
        self.assertEqual(len(verification.code), 6)
        self.assertTrue(verification.code.isdigit())
        self.assertTrue(check_password(password, verification.password))

        verify_response = self.client.post(
            reverse("verify-email"),
            {"email": email, "code": verification.code},
            format="json",
        )

        self.assertEqual(verify_response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(EmailVerification.objects.filter(email=email).exists())
        user = CustomUser.objects.get(email=email)
        self.assertTrue(user.check_password(password))

        login_response = self.client.post(
            reverse("login"),
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)

        refresh_response = self.client.post(
            reverse("token-refresh"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        profile_response = self.client.get(reverse("profile"))
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)
        self.assertEqual(profile_response.data["email"], email)
        self.assertNotIn("password", profile_response.data)

    def test_private_endpoint_requires_jwt(self):
        response = self.client.get(reverse("user-car-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(
    SECRET_KEY="test-secret-key-that-is-longer-than-thirty-two-bytes",
    SIMPLE_JWT=TEST_JWT_SETTINGS,
)
class UserDataIsolationTests(APITestCase):
    def setUp(self):
        self.user_a = CustomUser.objects.create_user(
            username="user-a",
            email="user-a@example.com",
            password="StrongPassword123!",
        )
        self.user_b = CustomUser.objects.create_user(
            username="user-b",
            email="user-b@example.com",
            password="StrongPassword123!",
        )
        self.car = create_car()
        self.spare_part = create_spare_part()

        self.user_car_b = UserCar.objects.create(user=self.user_b, car=self.car)
        self.favorite_b = Favorite.objects.create(
            user=self.user_b,
            spare_part=self.spare_part,
        )
        self.cart_b = Cart.objects.create(user=self.user_b)
        self.cart_item_b = CartItem.objects.create(
            cart=self.cart_b,
            spare_part=self.spare_part,
            quantity=2,
        )
        self.conversation_b = AIConversation.objects.create(
            user=self.user_b,
            title="Private conversation",
        )
        self.message_b = AIMessage.objects.create(
            conversation=self.conversation_b,
            role=AIMessage.Role.USER,
            content="Private message",
        )

        token = RefreshToken.for_user(self.user_a)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_user_a_cannot_retrieve_user_b_records(self):
        private_urls = [
            reverse("user-car-detail", args=[self.user_car_b.id]),
            reverse("favorite-detail", args=[self.favorite_b.id]),
            reverse("cart-detail", args=[self.cart_b.id]),
            reverse("cart-item-detail", args=[self.cart_item_b.id]),
            reverse("ai-conversation-detail", args=[self.conversation_b.id]),
            reverse("ai-message-detail", args=[self.message_b.id]),
        ]

        for url in private_urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        cart_response = self.client.get(reverse("cart-list"))
        returned_ids = [item["id"] for item in cart_response.data["results"]]
        self.assertNotIn(self.cart_b.id, returned_ids)

    def test_user_crud_uses_request_user(self):
        user_car_response = self.client.post(
            reverse("user-car-list"),
            {"user": self.user_b.id, "car": self.car.id},
            format="json",
        )
        self.assertEqual(user_car_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(UserCar.objects.get(id=user_car_response.data["id"]).user, self.user_a)

        favorite_response = self.client.post(
            reverse("favorite-list"),
            {"user": self.user_b.id, "spare_part": self.spare_part.id},
            format="json",
        )
        self.assertEqual(favorite_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Favorite.objects.get(id=favorite_response.data["id"]).user, self.user_a)

        cart_response = self.client.post(
            reverse("cart-list"),
            {"user": self.user_b.id},
            format="json",
        )
        self.assertEqual(cart_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cart.objects.get(id=cart_response.data["id"]).user, self.user_a)

        item_response = self.client.post(
            reverse("cart-item-list"),
            {
                "cart": self.cart_b.id,
                "spare_part": self.spare_part.id,
                "quantity": 3,
            },
            format="json",
        )
        self.assertEqual(item_response.status_code, status.HTTP_201_CREATED)
        item = CartItem.objects.get(id=item_response.data["id"])
        self.assertEqual(item.cart.user, self.user_a)

        conversation_response = self.client.post(
            reverse("ai-conversation-list"),
            {"user": self.user_b.id, "title": "User A conversation"},
            format="json",
        )
        self.assertEqual(conversation_response.status_code, status.HTTP_201_CREATED)
        conversation = AIConversation.objects.get(id=conversation_response.data["id"])
        self.assertEqual(conversation.user, self.user_a)

        message_response = self.client.post(
            reverse("ai-message-list", args=[conversation.id]),
            {
                "conversation": self.conversation_b.id,
                "role": AIMessage.Role.USER,
                "content": "User A message",
            },
            format="json",
        )
        self.assertEqual(message_response.status_code, status.HTTP_201_CREATED)
        message = AIMessage.objects.get(id=message_response.data["id"])
        self.assertEqual(message.conversation, conversation)

        patch_response = self.client.patch(
            reverse("cart-item-detail", args=[item.id]),
            {"quantity": 4},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 4)

        delete_response = self.client.delete(
            reverse("user-car-detail", args=[user_car_response.data["id"]])
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        favorite_delete = self.client.delete(
            reverse("favorite-detail", args=[favorite_response.data["id"]])
        )
        item_delete = self.client.delete(reverse("cart-item-detail", args=[item.id]))
        message_delete = self.client.delete(
            reverse("ai-message-detail", args=[message.id])
        )
        conversation_delete = self.client.delete(
            reverse("ai-conversation-detail", args=[conversation.id])
        )
        cart_delete = self.client.delete(
            reverse("cart-detail", args=[cart_response.data["id"]])
        )

        self.assertEqual(favorite_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(item_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(message_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(conversation_delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(cart_delete.status_code, status.HTTP_204_NO_CONTENT)
