import asyncio
import json

import httpx
import pytest
from google import genai
from google.genai import types

from app.core.config import Settings
from app.modules.ai.client import GeminiClient
from app.modules.ai.schemas import DifferenceResponse, QueryResponse, TraceabilityResponse


@pytest.mark.parametrize("schema", [DifferenceResponse, QueryResponse, TraceabilityResponse])
def test_official_sdk_serializes_structured_output_without_sampling_or_tools(schema):
    requests = []

    def transport(request):
        requests.append(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {"role": "model", "parts": [{"text": "{}"}]},
                        "finishReason": "STOP",
                    }
                ],
                "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20},
            },
        )

    async def run():
        client = GeminiClient(Settings(_env_file=None, GEMINI_API_KEY="mock-key"))
        client._client = genai.Client(
            api_key="mock-key",
            http_options=types.HttpOptions(
                async_client_args={"transport": httpx.MockTransport(transport)}
            ),
        )
        sdk = client._client
        try:
            assert await client.generate("{}", schema) == ("{}", 10, 20)
            await client.generate("{}", schema)
            assert client._client is sdk
        finally:
            await client.close()
        assert client._client is None

    asyncio.run(run())
    assert len(requests) == 2
    config = requests[0]["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    assert "responseSchema" not in config
    definition = config["responseJsonSchema"]
    assert definition["additionalProperties"] is False
    assert definition["properties"]["tipo"]["enum"] == [schema.model_fields["tipo"].default]
    assert "const" not in definition["properties"]["tipo"]
    assert "tipo" in definition["required"]
    # Adapting the wire schema must not weaken local Pydantic validation.
    assert "const" in schema.model_json_schema()["properties"]["tipo"]
    assert "additional_properties" not in json.dumps(config)
    assert not {"temperature", "topP", "topK"}.intersection(config)
    assert "tools" not in requests[0]
    assert "systemInstruction" in requests[0]
    assert "mock-key" not in json.dumps(requests[0])
