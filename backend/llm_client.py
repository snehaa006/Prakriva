"""
Groq LLM client with multi-key rotation.

Groq exposes an OpenAI-compatible API, so the official `openai` SDK is used
with Groq's base URL. Multiple API keys (GROQ_API_KEY, GROQ_API_KEY2,
GROQ_API_KEY3) are supported: if one key is rate limited or fails, the next
one is tried automatically.
"""
from itertools import cycle
from typing import Any, Dict, List, Optional

from openai import OpenAI
from loguru import logger

from config import settings
from exceptions import LLMError


class GroqClient:
    """Thin wrapper around the OpenAI SDK pointed at Groq, with key rotation"""

    def __init__(self, api_keys: Optional[List[str]] = None, base_url: Optional[str] = None):
        self.api_keys = [k for k in (api_keys or settings.GROQ_API_KEYS) if k]
        self.base_url = base_url or settings.GROQ_BASE_URL

        if not self.api_keys:
            logger.warning("No Groq API key configured - LLM calls will fail")

        self._clients = [
            OpenAI(api_key=key, base_url=self.base_url) for key in self.api_keys
        ]
        self._rotation = cycle(range(len(self._clients))) if self._clients else None
        self._index = 0

    @property
    def client(self) -> OpenAI:
        """Current client (kept for callers that use the SDK directly)"""
        if not self._clients:
            raise LLMError("No Groq API key configured (set GROQ_API_KEY)")
        return self._clients[self._index]

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs: Any,
    ):
        """Create a chat completion, rotating through keys on failure"""
        if not self._clients:
            raise LLMError("No Groq API key configured (set GROQ_API_KEY)")

        model = model or settings.DEFAULT_MODEL
        max_tokens = max_tokens or settings.MAX_TOKENS
        last_error: Optional[Exception] = None

        for attempt in range(len(self._clients)):
            index = (self._index + attempt) % len(self._clients)
            try:
                response = self._clients[index].chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **kwargs,
                )
                # Stick with the key that worked
                self._index = index
                return response
            except Exception as e:
                last_error = e
                logger.warning(f"Groq call failed on key #{index + 1}: {e}")

        raise LLMError(f"All Groq API keys failed: {last_error}")


# Shared instance
groq_client = GroqClient()
