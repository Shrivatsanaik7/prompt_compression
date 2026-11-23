import os
import logging

from flask import Flask, request, jsonify, send_from_directory
from gradio_client import Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder="static")

HF_SPACE_ID = os.getenv(
    "HF_SPACE_ID",
    "Shrivatsanaik7/llmlingua-v4-api"
)

HF_SPACE_API_NAME = os.getenv(
    "HF_SPACE_API_NAME",
    "/compress"
)

SPACE_APP_API_KEY = os.getenv("SPACE_APP_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")

if not SPACE_APP_API_KEY:
    logger.warning("SPACE_APP_API_KEY is not configured.")


@app.route("/")
def home():
    return send_from_directory("static", "index.html")


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "service": "LLMLingua V4 API"
    })


@app.route("/api/compress", methods=["POST"])
def compress():

    try:
        data = request.get_json(silent=True) or {}

        prompt = data.get("prompt", "").strip()
        target_reduction = data.get("target_reduction", 30)

        if not prompt:
            return jsonify({
                "error": "Please enter a prompt."
            }), 400

        if not SPACE_APP_API_KEY:
            return jsonify({
                "error": "Backend API key is not configured."
            }), 500

        try:
            target_reduction = int(target_reduction)
        except (ValueError, TypeError):
            return jsonify({
                "error": "Invalid compression setting."
            }), 400

        if not 20 <= target_reduction <= 60:
            return jsonify({
                "error": "Compression setting must be between 20 and 60."
            }), 400

        logger.info("Received compression request.")

        client_options = {}

        if HF_TOKEN:
            client_options["hf_token"] = HF_TOKEN

        client = Client(
            HF_SPACE_ID,
            **client_options
        )

        result = client.predict(
            SPACE_APP_API_KEY,
            prompt,
            target_reduction,
            api_name=HF_SPACE_API_NAME
        )

        # Support either a dictionary or multiple Gradio outputs.
        if isinstance(result, dict):
            response_data = result

        elif isinstance(result, (list, tuple)):
            response_data = {
                "compressed_prompt": result[0] if len(result) > 0 else "",
                "original_tokens": result[1] if len(result) > 1 else None,
                "compressed_tokens": result[2] if len(result) > 2 else None,
                "compression_ratio": result[3] if len(result) > 3 else None,
                "saving": result[4] if len(result) > 4 else None
            }

        else:
            response_data = {
                "compressed_prompt": str(result)
            }

        logger.info("Compression completed successfully.")

        return jsonify({
            "success": True,
            **response_data
        })

    except Exception:
        logger.exception("Compression request failed.")

        return jsonify({
            "success": False,
            "error": "Compression failed. Please try again."
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000))
    )
