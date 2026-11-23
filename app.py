import logging
import os
import threading
from typing import Any

from flask import Flask, jsonify, request, send_from_directory
from gradio_client import Client

# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

SPACE_ID = os.getenv(
    "HF_SPACE_ID",
    "Shrivatsanaik7/llmlingua-v4-api"
)

SPACE_API_NAME = os.getenv(
    "HF_SPACE_API_NAME",
    "/compress"
)

SPACE_APP_API_KEY = os.getenv(
    "SPACE_APP_API_KEY",
    ""
).strip()

HF_TOKEN = os.getenv(
    "HF_TOKEN",
    ""
).strip()

MAX_PROMPT_CHARS = int(
    os.getenv("MAX_PROMPT_CHARS", "20000")
)

ALLOWED_REDUCTIONS = [20, 30, 40, 50, 60]

# --------------------------------------------------
# FLASK APP
# --------------------------------------------------

app = Flask(__name__, static_folder=STATIC_DIR)

_client = None
_client_lock = threading.Lock()


# --------------------------------------------------
# HUGGING FACE SPACE CONNECTION
# --------------------------------------------------

def get_space_client() -> Client:
    global _client

    if _client is None:
        with _client_lock:
            if _client is None:

                kwargs = {
                    "verbose": False
                }

                if HF_TOKEN:
                    kwargs["token"] = HF_TOKEN

                logger.info(
                    "Connecting to Hugging Face Space: %s",
                    SPACE_ID
                )

                _client = Client(
                    SPACE_ID,
                    **kwargs
                )

    return _client


# --------------------------------------------------
# JSON CONVERSION
# --------------------------------------------------

def make_json_safe(value: Any) -> Any:

    if value is None or isinstance(
        value,
        (str, int, float, bool)
    ):
        return value

    if isinstance(value, dict):
        return {
            str(key): make_json_safe(val)
            for key, val in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            make_json_safe(item)
            for item in value
        ]

    return str(value)


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.get("/")
def home():

    return send_from_directory(
        STATIC_DIR,
        "index.html"
    )


# --------------------------------------------------
# FRONTEND JAVASCRIPT
# --------------------------------------------------

@app.get("/app.js")
def javascript():

    return send_from_directory(
        STATIC_DIR,
        "app.js"
    )


# --------------------------------------------------
# FRONTEND CSS
# --------------------------------------------------

@app.get("/styles.css")
def stylesheet():

    return send_from_directory(
        STATIC_DIR,
        "styles.css"
    )


# --------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------

@app.get("/api/health")
def health():

    return jsonify({
        "ok": True,
        "service": "LLMLingua-2 V4 Web Backend",
        "space": SPACE_ID,
        "endpoint": SPACE_API_NAME
    })


# --------------------------------------------------
# PROMPT COMPRESSION API
# --------------------------------------------------

@app.post("/api/compress")
def compress():

    # Get JSON request
    body = request.get_json(silent=True) or {}

    prompt = body.get("prompt", "")

    target_reduction = body.get(
        "target_reduction",
        30
    )

    # ----------------------------------------------
    # VALIDATE PROMPT
    # ----------------------------------------------

    if not isinstance(prompt, str) or not prompt.strip():

        return jsonify({
            "success": False,
            "error": "Please enter a prompt."
        }), 400

    prompt = prompt.strip()

    if len(prompt) > MAX_PROMPT_CHARS:

        return jsonify({
            "success": False,
            "error": (
                f"Prompt is too long. "
                f"Maximum length is "
                f"{MAX_PROMPT_CHARS:,} characters."
            )
        }), 413

    # ----------------------------------------------
    # VALIDATE COMPRESSION REDUCTION
    # ----------------------------------------------

    try:

        target_reduction = int(target_reduction)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid compression reduction value."
        }), 400

    if target_reduction not in ALLOWED_REDUCTIONS:

        return jsonify({
            "success": False,
            "error": (
                "Choose a compression reduction "
                "of 20%, 30%, 40%, 50%, or 60%."
            )
        }), 400

    # ----------------------------------------------
    # CHECK API KEY CONFIGURATION
    # ----------------------------------------------

    if not SPACE_APP_API_KEY:

        logger.error(
            "SPACE_APP_API_KEY is not configured."
        )

        return jsonify({
            "success": False,
            "error": (
                "The server is not configured yet. "
                "Please configure SPACE_APP_API_KEY "
                "in the Render environment variables."
            )
        }), 503

    # ----------------------------------------------
    # CONNECT TO HUGGING FACE AND COMPRESS
    # ----------------------------------------------

    try:

        logger.info(
            "Starting compression. Target reduction: %s%%",
            target_reduction
        )

        client = get_space_client()

        result = client.predict(
            api_key=SPACE_APP_API_KEY,
            prompt=prompt,
            target_reduction=target_reduction,
            api_name=SPACE_API_NAME
        )

        safe_result = make_json_safe(result)

        # Unwrap a single-item result list if returned
        if isinstance(safe_result, list) and len(safe_result) == 1:
            safe_result = safe_result[0]

        logger.info(
            "Compression completed successfully."
        )

        return jsonify({
            "success": True,
            "result": safe_result,
            "target_reduction": target_reduction
        })

    # ----------------------------------------------
    # ERROR HANDLING
    # ----------------------------------------------

    except Exception as exc:

        logger.exception(
            "Hugging Face Space request failed."
        )

        return jsonify({
            "success": False,
            "error": (
                "The V4 compression service could not "
                "complete the request. The Hugging Face "
                "Space may be waking up or temporarily "
                "unavailable."
            ),
            "detail": str(exc)[:500]
        }), 502


# --------------------------------------------------
# LOCAL DEVELOPMENT
# --------------------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5000")),
        debug=False
    )
