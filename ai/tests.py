import json
from unittest.mock import patch

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import CustomUser, Profile
from cars.models import Car, CarBrand, CarModel, CarPart, PartCategory
from .models import AIConversation, AIMessage
from .voice import synthesize_answer
from .services import GeminiProviderError, _language_hint, ask_provider, build_context, validate_actions


class AIAssistantApiTests(APITestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(username="ai-user", email="ai@example.com", password="test-pass-123")
        self.profile = Profile.objects.create(user=self.user, preferred_language="en")
        brand = CarBrand.objects.create(name="Example", logo_url="https://example.com/brand.png")
        model = CarModel.objects.create(brand=brand, name="Roadster", generation="Gen 2")
        self.car = Car.objects.create(car_model=model, year=2020, description="Documented exhibit", model_url="https://example.com/car.glb", image_url="https://example.com/car.png")
        category = PartCategory.objects.create(name="WHEELS", description="Wheel system")
        self.part = CarPart.objects.create(car=self.car, category=category, name="Front left wheel", component_id="front_left_wheel", description="Front left wheel assembly", function="Supports the car")
        self.client.force_authenticate(self.user)

    def test_voice_requires_auth_and_owns_answer(self):
        conversation = AIConversation.objects.create(user=self.user, title="Voice")
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.ASSISTANT, content="Hello")
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post("/api/ai/voice/", {"conversation_id": conversation.id, "language": "en"}, format="json").status_code, 401)
        other = CustomUser.objects.create_user(username="other-voice", email="other-voice@example.com", password="test")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.post("/api/ai/voice/", {"conversation_id": conversation.id, "language": "en"}, format="json").status_code, 404)
        self.client.force_authenticate(self.user)
        with patch("ai.views.synthesize_answer", return_value=b"RIFFxxxxWAVEaudio") as synthesize:
            response = self.client.post("/api/ai/voice/", {"conversation_id": conversation.id, "language": "en"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "audio/wav")
        self.assertEqual(response["Cache-Control"], "no-store")
        synthesize.assert_called_once_with("Hello", "en")

    def test_voice_rejects_invalid_language_and_missing_key(self):
        conversation = AIConversation.objects.create(user=self.user, title="Voice")
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.ASSISTANT, content="Hello")
        self.assertEqual(self.client.post("/api/ai/voice/", {"conversation_id": conversation.id, "language": "fr"}, format="json").status_code, 400)
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}), override_settings(GEMINI_API_KEY=""):
            response = self.client.post("/api/ai/voice/", {"conversation_id": conversation.id, "language": "tg"}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "AI_NOT_CONFIGURED")

    def test_voice_sdk_reads_plain_text_and_supports_three_languages(self):
        from google import genai
        import base64
        for language in ("ru", "tg", "en"):
            with self.subTest(language=language), patch.dict("os.environ", {"GEMINI_API_KEY": "mock-key"}), patch.object(genai, "Client") as client:
                client.return_value.interactions.create.return_value.output_audio.data = base64.b64encode(b"RIFFxxxxWAVEaudio").decode()
                audio = synthesize_answer("<b>Hello</b>", language)
                self.assertEqual(audio, b"RIFFxxxxWAVEaudio")
                kwargs = client.return_value.interactions.create.call_args.kwargs
                self.assertEqual(kwargs["response_format"], {"type": "audio"})
                self.assertEqual(kwargs["input"][0]["content"][0]["text"], "Hello")

    def test_gemini_sdk_request_uses_model_key_and_json_schema(self):
        from google import genai

        response_payload = {"answer": "Колесо поддерживает автомобиль.", "actions": [{"type": "focus_component", "componentId": self.part.component_id}], "external_search": False}
        with patch.dict("os.environ", {"GEMINI_API_KEY": "mock-gemini-key", "GEMINI_MODEL": "gemini-test-model"}):
            with patch.object(genai, "Client") as client_class:
                client_class.return_value.models.generate_content.return_value.text = json.dumps(response_payload, ensure_ascii=False)
                result = ask_provider("show двигатель", {
                    "language": "ru", "car": {"id": self.car.id},
                    "component": None,
                    "components": [{"id": self.part.component_id, "name": self.part.name, "category": "WHEELS"}],
                    "conversation_history": [],
                })
        client_class.assert_called_once()
        client_kwargs = client_class.call_args.kwargs
        self.assertEqual(client_kwargs["api_key"], "mock-gemini-key")
        self.assertGreaterEqual(client_kwargs["http_options"].timeout, 1000)
        kwargs = client_class.return_value.models.generate_content.call_args.kwargs
        self.assertEqual(kwargs["model"], "gemini-test-model")
        self.assertEqual(kwargs["config"].response_mime_type, "application/json")
        self.assertTrue(kwargs["config"].response_schema)
        request = json.loads(kwargs["contents"])
        self.assertEqual(request["selected_language"], "ru")
        self.assertEqual(request["context"]["message_language_hint"], "ru")
        self.assertEqual(result["actions"], [{"type": "focus_component", "componentId": self.part.component_id}])

    def test_mixed_message_language_hints_recognize_ru_tg_and_en(self):
        self.assertEqual(_language_hint("show двигатель"), "ru")
        self.assertEqual(_language_hint("двигательро нишон деҳ"), "tg")
        self.assertEqual(_language_hint("show engine"), "en")

    def test_gemini_response_languages_ru_tg_en_are_preserved(self):
        responses = {"ru": "Ответ по-русски", "tg": "Ҷавоб ба тоҷикӣ", "en": "Answer in English"}
        for language, answer in responses.items():
            with self.subTest(language=language), patch.dict("os.environ", {"GEMINI_API_KEY": "mock-key"}):
                with patch("ai.services._gemini_generate", return_value=json.dumps({"answer": answer, "actions": [], "external_search": False}, ensure_ascii=False)):
                    result = ask_provider("mixed show двигатель", {"language": language, "components": [], "conversation_history": []})
                self.assertEqual(result["answer"], answer)

    def test_invalid_gemini_actions_are_rejected(self):
        context = {"car": {"id": self.car.id}, "components": [{"id": self.part.component_id}]}
        actions = validate_actions([
            {"type": "focus_component", "componentId": self.part.component_id},
            {"type": "focus_component", "componentId": "not-in-this-car"},
            {"type": "run_javascript", "code": "alert(1)"},
            {"type": "set_explode_percentage", "value": 400},
        ], context)
        self.assertEqual(actions, [
            {"type": "focus_component", "componentId": self.part.component_id},
            {"type": "set_explode_percentage", "value": 100},
        ])

    def test_gemini_provider_errors_are_classified_without_exposing_upstream_details(self):
        class FakeApiError(Exception):
            def __init__(self, code, message):
                self.code = code
                self.message = message
                super().__init__(message)

        cases = [
            (FakeApiError(503, "model is temporarily overloaded"), "AI_PROVIDER_UNAVAILABLE", 503),
            (FakeApiError(504, "Deadline expired before operation could complete"), "AI_TIMEOUT", 504),
            (FakeApiError(429, "Quota exceeded for this project"), "AI_QUOTA_EXCEEDED", 429),
            (FakeApiError(401, "API key not valid"), "AI_INVALID_API_KEY", 503),
            (FakeApiError(404, "Model not found"), "AI_MODEL_UNAVAILABLE", 503),
            (TimeoutError("socket timed out"), "AI_TIMEOUT", 504),
        ]
        with patch.dict("os.environ", {"GEMINI_API_KEY": "mock-key"}):
            for error, code, http_status in cases:
                with self.subTest(code=code), patch("ai.services._gemini_generate", side_effect=error):
                    with self.assertRaises(GeminiProviderError) as raised:
                        ask_provider("hello", {"language": "en", "components": []})
                    self.assertEqual(raised.exception.code, code)
                    self.assertEqual(raised.exception.http_status, http_status)
                    self.assertNotIn(str(error), raised.exception.detail)

    def test_invalid_structured_gemini_response_is_not_reported_as_success(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": "mock-key"}):
            with patch("ai.services._gemini_generate", return_value="not-json"):
                with self.assertRaises(GeminiProviderError) as raised:
                    ask_provider("hello", {"language": "en", "components": []})
        self.assertEqual(raised.exception.code, "AI_INVALID_RESPONSE")
        self.assertEqual(raised.exception.http_status, 502)

    def test_safe_action_contract_covers_component_search_and_assemble_scenarios(self):
        context = {
            "car": {"id": self.car.id},
            "component": {"id": self.part.component_id},
            "components": [{"id": self.part.component_id}, {"id": "engine"}],
        }
        scenarios = [
            ([{"type": "focus_component", "componentId": "engine"}, {"type": "select_component", "componentId": "engine"}], False),
            ([{"type": "set_explode_percentage", "value": 100}], False),
            ([{"type": "set_explode_percentage", "value": 0}], False),
            ([{"type": "focus_component", "componentId": self.part.component_id}], False),
            ([{"type": "search_products", "componentId": self.part.component_id}], False),
            ([{"type": "search_products", "componentId": self.part.component_id}], True),
        ]
        for actions, external_search in scenarios:
            with self.subTest(actions=actions, external_search=external_search), patch.dict("os.environ", {"GEMINI_API_KEY": "mock-key"}):
                payload = {"answer": "Checked against the current car.", "actions": actions, "external_search": external_search}
                with patch("ai.services._gemini_generate", return_value=json.dumps(payload)):
                    result = ask_provider("show or find the selected item", context)
                self.assertEqual(result["actions"], actions)
                self.assertEqual(result["external_search_requested"], external_search)

    def test_context_can_be_limited_to_the_runtime_component_hierarchy(self):
        CarPart.objects.create(
            car=self.car, category=self.part.category, name="Legacy component",
            component_id="legacy_component", description="Not in the runtime viewer", function="Legacy",
        )
        context = build_context(
            self.user, car_id=self.car.id,
            available_component_ids=[self.part.component_id],
        )
        self.assertEqual([row["id"] for row in context["components"]], [self.part.component_id])

    @override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"ai": "30/hour"}})
    def test_missing_gemini_key_has_machine_readable_error(self):
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}, clear=False):
            response = self.client.post("/api/ai/ask/", {"message": "What is this?", "car_id": self.car.id, "component_id": self.part.component_id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "AI_NOT_CONFIGURED")
        self.assertEqual(AIConversation.objects.count(), 0)

    @override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"ai": "30/hour"}})
    def test_gemini_upstream_failure_returns_machine_readable_error(self):
        self.client.force_authenticate(self.user)
        with patch("ai.views.ask_provider", side_effect=GeminiProviderError(
            "AI_PROVIDER_UNAVAILABLE", "Google Gemini is temporarily unavailable (HTTP 503). Please try again shortly.", 503
        )):
            response = self.client.post("/api/ai/ask/", {
                "message": "What is this?", "car_id": self.car.id,
                "component_id": self.part.component_id,
            }, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["code"], "AI_PROVIDER_UNAVAILABLE")

    @override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"ai": "30/hour"}})
    def test_gemini_actions_history_and_exa_results_flow_through_backend(self):
        result = {
            "answer": "The front left wheel is selected.",
            "actions": [{"type": "focus_component", "componentId": self.part.component_id}],
            "external_search_requested": True,
        }
        exa_result = {"available": True, "provider": "Exa Search", "results": [{"title": "Wheel listing", "url": "https://parts.example/wheel", "snippet": "Listing", "source": "parts.example"}]}
        with patch("ai.views.ask_provider", return_value=result) as provider, patch("ai.views.external_search_for_vehicle", return_value=exa_result) as exa:
            response = self.client.post("/api/ai/ask/", {
                "message": "find this part on the web", "language": "en", "car_id": self.car.id,
                "component_id": self.part.component_id, "route": f"/cars/{self.car.id}/components/{self.part.component_id}",
                "available_component_ids": [self.part.component_id],
                "explode_percentage": 25,
            }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["external_search"], exa_result)
        self.assertEqual(response.data["actions"][0]["componentId"], self.part.component_id)
        context = provider.call_args.args[1]
        self.assertEqual(context["route"], f"/cars/{self.car.id}/components/{self.part.component_id}")
        self.assertEqual(context["explode_percentage"], 25)
        self.assertEqual([row["id"] for row in context["components"]], [self.part.component_id])
        self.assertEqual(context["car"]["generation"], "Gen 2")
        exa.assert_called_once_with("find this part on the web", car=self.car, component=self.part)
        conversation = AIConversation.objects.get(pk=response.data["conversation_id"])
        self.assertEqual(conversation.user, self.user)

    @override_settings(REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"ai": "30/hour"}})
    def test_provider_receives_previous_conversation_history(self):
        conversation = AIConversation.objects.create(user=self.user, car=self.car, title="History")
        from .models import AIMessage
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.USER, content="Explain the wheel")
        AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.ASSISTANT, content="It supports the car.")
        with patch("ai.views.ask_provider", return_value={"answer": "More detail", "actions": [], "external_search_requested": False}) as provider:
            response = self.client.post("/api/ai/ask/", {"message": "Tell me more", "car_id": self.car.id, "conversation_id": conversation.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(provider.call_args.args[1]["conversation_history"], [
            {"role": "user", "content": "Explain the wheel"},
            {"role": "assistant", "content": "It supports the car."},
        ])
