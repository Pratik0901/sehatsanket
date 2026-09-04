import os
import json
import httpx
from typing import Dict, Any, Optional, List
from app.config import settings

class LLMProvider:
    """
    Unified LLM provider powered by Groq (openai/gpt-oss-120b & qwen/qwen3.8-27b)
    for sub-second clinical triage and emergency reasoning,
    with an intelligent built-in fallback.
    """
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.sarvam_key = settings.SARVAM_API_KEY
        self.models_priority = [
            "groq/compound-mini",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.6-27b",
            "groq/compound"
        ]

    async def generate_response(self, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> Optional[str]:
        if not self.groq_key:
            return None

        for model in self.models_priority:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": user_prompt}
                            ],
                            "temperature": temperature
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return data["choices"][0]["message"]["content"]
            except Exception as e:
                print(f"[LLMProvider] Groq {model} error: {e}")

        return None

    async def generate_structured_json(self, system_prompt: str, user_prompt: str) -> Optional[Dict[str, Any]]:
        if not self.groq_key:
            return None

        prompt_with_instructions = (
            f"{user_prompt}\n\nIMPORTANT: Return ONLY valid JSON matching the requested schema. No markdown backticks, no preamble."
        )

        for model in self.models_priority:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": prompt_with_instructions}
                            ],
                            "temperature": 0.1,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if resp.status_code == 200:
                        content = resp.json()["choices"][0]["message"]["content"]
                        try:
                            return json.loads(content)
                        except Exception:
                            # Strip markdown if any
                            clean = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                            return json.loads(clean)
            except Exception as e:
                print(f"[LLMProvider] Groq structured JSON {model} error: {e}")

        return None

    async def generate_chat_structured_json(self, messages: List[Dict[str, str]], temperature: float = 0.2) -> Optional[Dict[str, Any]]:
        if not self.groq_key:
            return None

        for model in self.models_priority:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model,
                            "messages": messages,
                            "temperature": temperature,
                            "response_format": {"type": "json_object"}
                        }
                    )
                    if resp.status_code == 200:
                        content = resp.json()["choices"][0]["message"]["content"]
                        try:
                            return json.loads(content)
                        except Exception:
                            clean = content.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
                            return json.loads(clean)
            except Exception as e:
                print(f"[LLMProvider] Groq chat structured JSON {model} error: {e}")

        return None

llm_provider = LLMProvider()
