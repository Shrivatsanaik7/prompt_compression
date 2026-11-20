# LLMLingua-2 V4 Prompt Compression Website

A small Flask website that forwards prompt-compression requests to your existing Hugging Face Gradio Space:

- Space: `Shrivatsanaik7/llmlingua-v4-api`
- Gradio endpoint: `/compress`
- Endpoint inputs shown in the Space API panel: `api_key` and `prompt`

The V4 model remains hosted on Hugging Face. This project does **not** download or host the model weights again.

## Files

```text
llmlingua_v4_web/
├── app.py
├── requirements.txt
├── render.yaml
├── .gitignore
└── static/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Run locally

1. Create a virtual environment and install dependencies:

   ```bash
   python -m venv .venv
   # Windows PowerShell: .venv\\Scripts\\Activate.ps1
   # macOS/Linux: source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Set the application API key that your Space's `/compress` function expects. This is the value corresponding to the `api_key` input in the Gradio API example. Do not commit it to GitHub.

   PowerShell:

   ```powershell
   $env:SPACE_APP_API_KEY="YOUR_SPACE_APP_API_KEY"
   ```

   macOS/Linux:

   ```bash
   export SPACE_APP_API_KEY="YOUR_SPACE_APP_API_KEY"
   ```

3. Start the web app:

   ```bash
   python app.py
   ```

4. Open `http://localhost:5000`.

## Deploy the complete website on Render (simplest option)

This project serves both the website and its backend from one Flask service, so you do not need a separate Vercel frontend or CORS configuration.

1. Push this folder's contents to a GitHub repository.
2. In Render, choose **New → Web Service** and connect that repository.
3. Use these settings:
   - Runtime: Python 3
   - Build command: `pip install -r requirements.txt`
   - Start command: `gunicorn app:app`
4. In the service's **Environment** settings, add:
   - `SPACE_APP_API_KEY` = the application key expected by your Hugging Face Space's `/compress` endpoint.
   - `HF_SPACE_ID` = `Shrivatsanaik7/llmlingua-v4-api` (already set in `render.yaml` if you use the Blueprint).
   - `HF_SPACE_API_NAME` = `/compress` (already set in `render.yaml` if you use the Blueprint).
5. Deploy. Render provides a public `onrender.com` URL.

Optional: If your Hugging Face Space is private, set `HF_TOKEN` to a Hugging Face user access token in Render's environment variables. For a public Space, this is normally not needed.

## Security notes

- `SPACE_APP_API_KEY` is stored on the server and is never sent to the browser.
- Do not put the key in `static/app.js`, `index.html`, a public GitHub repository, or a Vercel client-side environment variable.
- The app currently limits prompt input to 20,000 characters. Adjust `MAX_PROMPT_CHARS` in the hosting environment if appropriate.
- Add authentication, rate limiting, monitoring, and abuse protection before sharing widely. This minimal starter does not implement user accounts or per-user quotas.

## Compression-rate control

The API documentation screenshot for this Space showed the `/compress` endpoint accepting only `api_key` and `prompt`. Therefore this starter intentionally does not display a compression-rate slider. To add one, first modify the Hugging Face Space's Gradio function and API endpoint to accept a `compression_rate` parameter, then pass that parameter through in `app.py` and the frontend.

## API response

The backend returns the Space's original response under `result`, wrapped in:

```json
{
  "success": true,
  "result": { "...": "the Space's returned data" }
}
```

The browser looks for common compressed-output keys and also provides a **View full API response** panel. If your Space uses a different key for the compressed prompt, update `findCompressedText()` in `static/app.js` to match the exact response from `client.view_api()` / a real API call.
