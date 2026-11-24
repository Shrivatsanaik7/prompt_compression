import os
import traceback

from flask import Flask, request, jsonify, render_template
from google import genai
from google.genai import types
from gradio_client import Client

app = Flask(__name__)


# ==========================================
# CONFIGURATION
# ==========================================

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

GEMINI_MODEL = "gemini-3.8-flash"


# ==========================================
# HOME PAGE
# ==========================================

@app.route("/")
def home():
    return render_template("index.html")


# ==========================================
# GEMINI PROMPT COMPLETION
# ==========================================

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
                "error": "Gemini API key is not configured in Render."
            }), 500


        # Gemini client using v1beta API

        client = genai.Client(
            api_key=GEMINI_API_KEY,
            http_options=types.HttpOptions(
                api_version="v1beta"
            )
        )


        # Prompt engineering instructions

        instruction = f"""
You are an expert AI prompt engineer specializing in
software development, machine learning, deep learning,
robotics, computer vision and artificial intelligence.

Your task is to transform the user's short project idea
into a detailed, professional and implementation-ready prompt.

Expand the original idea while preserving its intention.

STRUCTURE THE COMPLETED PROMPT USING:

1. PROJECT OVERVIEW
   Explain the project and its purpose.

2. PROJECT OBJECTIVES
   Specify what the project must achieve.

3. FUNCTIONAL REQUIREMENTS
   Explain the features and expected behavior.

4. TECHNICAL REQUIREMENTS
   Specify algorithms, architecture and technical details.

5. TECHNOLOGIES AND LIBRARIES
   Recommend relevant programming languages,
   frameworks, libraries and tools.

6. IMPLEMENTATION STEPS
   Provide a logical step-by-step development plan.

7. EXPECTED OUTPUT
   Describe the expected final result.

8. CONSTRAINTS AND EDGE CASES
   Include important limitations and possible failure cases.

IMPORTANT INSTRUCTIONS:

- Preserve the user's original project intention.
- Make the prompt detailed and technically accurate.
- Include practical implementation details.
- Specify relevant algorithms and technologies.
- Avoid unnecessary explanations.
- Do not invent unsupported requirements.
- Make the result suitable for an AI coding assistant.
- Return only the completed prompt.

USER'S ORIGINAL PROJECT IDEA:

{prompt}
"""


        # Generate completed prompt

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=instruction
        )


        completed_prompt = response.text


        if not completed_prompt:

            raise Exception(
                "Gemini returned an empty response."
            )


        return jsonify({

            "success": True,

            "completed_prompt": completed_prompt,

            "model": GEMINI_MODEL

        })


    except Exception as e:

        print("GEMINI ERROR:")
        print(traceback.format_exc())

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ==========================================
# EXISTING LLMLINGUA V4 COMPRESSION
# ==========================================

@app.route("/api/compress", methods=["POST"])
def compress_prompt():

    try:

        data = request.get_json(silent=True) or {}

        prompt = data.get("prompt", "").strip()

        target_reduction = data.get(
            "target_reduction",
            30
        )


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


        # Connect to existing Hugging Face Space

        client = Client(
            HF_SPACE_ID,
            hf_token=HF_TOKEN
        )


        # Call existing LLMLingua V4 model

        result = client.predict(

            SPACE_APP_API_KEY,

            prompt,

            target_reduction,

            api_name=HF_SPACE_API_NAME

        )


        # Normalize Gradio response

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

        print("COMPRESSION ERROR:")
        print(traceback.format_exc())

        return jsonify({

            "success": False,

            "error": str(e)

        }), 500


# ==========================================
# HEALTH CHECK
# ==========================================

@app.route("/health")
def health():

    return jsonify({

        "status": "running",

        "gemini": bool(GEMINI_API_KEY),

        "compressor": bool(SPACE_APP_API_KEY)

    })


# ==========================================
# RUN APPLICATION
# ==========================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=int(os.environ.get("PORT", 5000)),

        debug=False

    )
