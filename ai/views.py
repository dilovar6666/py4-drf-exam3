from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from rest_framework import status
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveDestroyAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from cars.models import Car, CarPart
from .models import AIConversation, AIMessage
from .serializers import AIConversationSerializer, AIMessageSerializer, AskSerializer
from .services import GeminiProviderError, ask_provider, build_context, validate_actions
from .voice import LANGUAGES, synthesize_answer
from shop.services import external_search_for_vehicle


class AIConversationListCreateView(ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIConversationSerializer

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AIConversationDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIConversationSerializer

    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user)


class AIMessageListCreateView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIMessageSerializer

    def get_conversation(self):
        return get_object_or_404(
            AIConversation,
            id=self.kwargs["conversation_id"],
            user=self.request.user,
        )

    def get_queryset(self):
        return AIMessage.objects.filter(
            conversation=self.get_conversation()
        ).order_by("id")

class AIMessageDetailView(RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AIMessageSerializer

    def get_queryset(self):
        return AIMessage.objects.filter(conversation__user=self.request.user)


class AskView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai"

    def post(self, request):
        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        car = Car.objects.filter(pk=data.get("car_id"), is_active=True).first() if data.get("car_id") else None
        if data.get("car_id") and not car:
            return Response({"detail": "Selected car is not available."}, status=status.HTTP_400_BAD_REQUEST)
        part = CarPart.objects.filter(car=car, component_id=data.get("component_id")).first() if car and data.get("component_id") else None
        if data.get("component_id") and car and not part:
            return Response({"detail": "Selected component is not available for this car."}, status=status.HTTP_400_BAD_REQUEST)
        conversation = None
        history = []
        if data.get("conversation_id"):
            conversation = get_object_or_404(AIConversation, pk=data["conversation_id"], user=request.user)
            history = list(conversation.messages.order_by("-id").values("role", "content")[:10])[::-1]
        context = build_context(
            request.user, data.get("car_id"), data.get("component_id"), data.get("garage_car_id"),
            route=data.get("route", ""), explode_percentage=data.get("explode_percentage"),
            conversation_history=history,
            available_component_ids=data.get("available_component_ids"),
        )
        context["language"] = data.get("language") or context["language"]
        context["current_user"]["preferred_language"] = context["language"]
        try:
            result = ask_provider(data["message"], context)
        except GeminiProviderError as exc:
            return Response({"code": exc.code, "detail": exc.detail}, status=exc.http_status)
        if result is None:
            return Response({"code": "AI_NOT_CONFIGURED", "detail": "Gemini assistant is unavailable because GEMINI_API_KEY is not configured on the server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        result["actions"] = validate_actions(result.get("actions", []), context)
        external_search = None
        if result.pop("external_search_requested", False):
            action_component = next((
                action.get("componentId") for action in result["actions"]
                if action.get("componentId")
            ), None)
            search_part = CarPart.objects.filter(car=car, component_id=action_component).first() if car and action_component else part
            external_search = external_search_for_vehicle(data["message"], car=car, component=search_part)

        if not conversation:
            conversation = AIConversation.objects.create(
                user=request.user, car=car, car_part=part,
                title=data["message"][:200],
            )
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.USER, content=data["message"])
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.ASSISTANT, content=result["answer"])
        conversation.save(update_fields=["updated_at"])
        return Response({**result, "external_search": external_search, "conversation_id": conversation.pk, "language": context["language"]})


class VoiceView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai"

    def post(self, request):
        conversation_id = request.data.get("conversation_id")
        language = request.data.get("language")
        if not isinstance(conversation_id, int) or language not in LANGUAGES:
            return Response({"code": "VOICE_INVALID_REQUEST", "detail": "Select a conversation and a supported language."}, status=400)
        conversation = get_object_or_404(AIConversation, pk=conversation_id, user=request.user)
        answer = conversation.messages.filter(role=AIMessage.Role.ASSISTANT).order_by("-id").first()
        if not answer:
            return Response({"code": "VOICE_NO_ANSWER", "detail": "This conversation has no assistant answer."}, status=400)
        try:
            audio = synthesize_answer(answer.content, language)
        except ValueError:
            return Response({"code": "VOICE_TEXT_INVALID", "detail": "This answer cannot be read aloud."}, status=400)
        except GeminiProviderError as exc:
            return Response({"code": exc.code, "detail": exc.detail}, status=exc.http_status)
        response = HttpResponse(audio, content_type="audio/wav")
        response["Cache-Control"] = "no-store"
        return response
