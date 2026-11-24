import os
import traceback

from flask import Flask, request, jsonify, render_template
from google import genai
from gradio_client import Client

app = Flask(__name__)

# Hugging Face configuration
HF_SPACE_ID = os.getenv(
    "HF_SPACE_ID",
    "Shrivatsanaik7/llmlingua-v4-api"
)

HF_SPACE_API_NAME = os.getenv(
    "HF_SPACE_API_NAME",
    "/compress"
)

HF_TOKEN = os.getenv("HF_TOKEN")
SPACE_APP_API_KEY = os.getenv("SPACE_APP_API_KEY")

# Gemini configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


@app.route("/")
def home():
    return render_template("index.html")


# -----------------------------------------
# GEMINI PROMPT COMPLETION
# -----------------------------------------

@app.route("/api/complete", methods=["POST"])
def complete_prompt():

    try:
        data = request.get_json(silent=True) or {}

        prompt = data.get("prompt", "").strip()

        if not prompt:
            return jsonify({
                "success": False,
                "error": "Please enter a project idea."
            }), 400

        if not GEMINI_API_KEY:
            return jsonify({
                "success": False,
                "error": "Gemini API key is not configured."
            }), 500

        client = genai.Client(api_key=GEMINI_API_KEY)

        instruction = f"""
You are an expert AI prompt engineer.

Your task is to transform a short project idea into
a detailed, professional, technically accurate,
implementation-ready prompt.

Expand the user's idea while preserving its original intention.

Organize the completed prompt into these sections:

1. Project Overview
2. Project Objectives
3. Functional Requirements
4. Technical Requirements
5. Technologies and Libraries
6. Implementation Steps
7. Expected Output
8. Constraints and Edge Cases

Important:
- Specify technical details wherever appropriate.
- Include relevant algorithms, tools and libraries.
- Make requirements clear and actionable.
- Preserve important user constraints.
- Do not invent unsupported requirements.
- Do not include unnecessary introductory explanations.
- Return only the completed prompt.

USER PROJECT IDEA:

{prompt}
"""

        response = client.models.generate_content(
            model="gemini-3-flash",
            contents=instruction
        )

        completed_prompt = response.text

        if not completed_prompt:
            raise Exception("Gemini returned an empty response.")

        return jsonify({
            "success": True,
            "completed_prompt": completed_prompt
        })

    except Exception as e:

        print(traceback.format_exc())

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# -----------------------------------------
# EXISTING LLMLINGUA V4 COMPRESSION
# -----------------------------------------

@app.route("/api/compress", methods=["POST"])
def compress_prompt():

    try:
        data = request.get_json(silent=True) or {}

        prompt = data.get("prompt", "").strip()

        target_reduction = data.get("target_reduction", 30)

        if not prompt:
            return jsonify({
                "success": False,
                "error": "Please enter a prompt."
            }), 400

        if not SPACE_APP_API_KEY:
            return jsonify({
                "success": False,
                "error": "Hugging Face Space API key is missing."
            }), 500

        if not HF_SPACE_ID:
            return jsonify({
                "success": False,
                "error": "Hugging Face Space ID is missing."
            }), 500

        target_reduction = int(target_reduction)

        if target_reduction not in [20, 30, 40, 50, 60]:
            return jsonify({
                "success": False,
                "error": "Invalid compression percentage."
            }), 400

        client = Client(
            HF_SPACE_ID,
            hf_token=HF_TOKEN
        )

        result = client.predict(
            SPACE_APP_API_KEY,
            prompt,
            target_reduction,
            api_name=HF_SPACE_API_NAME
        )

        # Normalize Gradio results
        if isinstance(result, dict):
            output = result

        elif isinstance(result, (list, tuple)):
            output = {
                "result": result
            }

        else:
            output = {
                "result": result
            }

        return jsonify({
            "success": True,
            "data": output
        })

    except Exception as e:

        print(traceback.format_exc())

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# -----------------------------------------
# HEALTH CHECK
# -----------------------------------------

@app.route("/health")
def health():

    return jsonify({
        "status": "running",
        "gemini": bool(GEMINI_API_KEY),
        "compressor": bool(SPACE_APP_API_KEY)
    })


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=False
    )
