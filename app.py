import logging
import os
import threading
from typing import Any

from flask import Flask, jsonify, request, send_from_directory
from gradio_client import Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

SPACE_ID = os.getenv("HF_SPACE_ID", "Shrivatsanaik7/llmlingua-v4-api")
SPACE_API_NAME = os.getenv("HF_SPACE_API_NAME", "/compress")
SPACE_APP_API_KEY = os.getenv("SPACE_APP_API_KEY", "").strip()
HF_TOKEN = os.getenv("HF_TOKEN", "").strip()  # Only needed if the Space is private.
MAX_PROMPT_CHARS = int(os.getenv("MAX_PROMPT_CHARS", "20000"))

app = Flask(__name__, static_folder=STATIC_DIR)

_client = None
_client_lock = threading.Lock()


def get_space_client() -> Client:
    """Create the Gradio client once, on the first request."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                kwargs = {"verbose": False}
                if HF_TOKEN:
                    kwargs["token"] = HF_TOKEN
                logger.info("Connecting to Hugging Face Space: %s", SPACE_ID)
                _client = Client(SPACE_ID, **kwargs)
    return _client


def make_json_safe(value: Any) -> Any:
    """Convert common Gradio return values into JSON-safe values."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): make_json_safe(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [make_json_safe(v) for v in value]
    return str(value)


@app.get("/")
def home():
    return send_from_directory(STATIC_DIR, "index.html")


@app.get("/api/health")
def health():
    return jsonify({
        "ok": True,
        "service": "LLMLingua-2 V4 web backend",
        "space": SPACE_ID,
        "endpoint": SPACE_API_NAME,
    })


@app.post("/api/compress")
def compress():
    body = request.get_json(silent=True) or {}
    prompt = body.get("prompt", "")

    if not isinstance(prompt, str) or not prompt.strip():
        return jsonify({"success": False, "error": "Please enter a prompt."}), 400

    prompt = prompt.strip()
    if len(prompt) > MAX_PROMPT_CHARS:
        return jsonify({
            "success": False,
            "error": f"Prompt is too long. Maximum length is {MAX_PROMPT_CHARS:,} characters."
        }), 413

    if not SPACE_APP_API_KEY:
        logger.error("SPACE_APP_API_KEY is not configured")
        return jsonify({
            "success": False,
            "error": "The server is not configured yet. Please set SPACE_APP_API_KEY in the hosting environment."
        }), 503

    try:
        client = get_space_client()
        # These argument names match the /compress endpoint shown in the Space API docs.
        result = client.predict(
            api_key=SPACE_APP_API_KEY,
            prompt=prompt,
            api_name=SPACE_API_NAME,
        )
        safe_result = make_json_safe(result)
        return jsonify({"success": True, "result": safe_result})

    except Exception as exc:
        logger.exception("Hugging Face Space request failed")
        return jsonify({
            "success": False,
            "error": "The V4 compression service could not complete the request. The Hugging Face Space may be waking up or temporarily unavailable.",
            "detail": str(exc)[:500],
        }), 502


if __name__ == "__main__":
    # Local development only. Render runs the app with Gunicorn.
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
