from typing import Any

from pydantic import BaseModel

from app.core.config import Settings

from .prompts import SYSTEM_PROMPT


def gemini_response_schema(schema: type[BaseModel]) -> dict:
    """Normalize single-value literals to enum, explicitly supported by Gemini."""
    definition = schema.model_json_schema()
    for name, field in definition.get("properties", {}).items():
        if "const" in field:
            field["enum"] = [field.pop("const")]
            if name not in definition["required"]:
                definition["required"].append(name)
    return definition


class GeminiClient:
    """One lazily initialized SDK client per FastAPI application, never per endpoint."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._client: Any = None

    async def generate(
        self, payload: str, schema: type[BaseModel]
    ) -> tuple[str, int | None, int | None]:
        if not self.settings.gemini_api_key or not self.settings.gemini_api_key.get_secret_value():
            raise RuntimeError("ai_not_configured")
        from google import genai
        from google.genai import types

        if self._client is None:
            self._client = genai.Client(
                api_key=self.settings.gemini_api_key.get_secret_value(),
                http_options=types.HttpOptions(
                    timeout=int(self.settings.gemini_timeout_seconds * 1000),
                    retry_options=types.HttpRetryOptions(attempts=1),
                ),
            )
        response = await self._client.aio.models.generate_content(
            model=self.settings.gemini_model,
            contents=payload,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                # Keep JSON Schema keywords intact instead of converting them to
                # the legacy responseSchema protobuf (which rejects additional_properties).
                response_json_schema=gemini_response_schema(schema),
                max_output_tokens=2048,
            ),
        )
        usage = response.usage_metadata
        return (
            response.text or "",
            usage.prompt_token_count if usage else None,
            usage.candidates_token_count if usage else None,
        )

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aio.aclose()
            self._client.close()
            self._client = None
