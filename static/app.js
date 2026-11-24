document.addEventListener("DOMContentLoaded", () => {

    // -----------------------------------
    // ELEMENTS
    // -----------------------------------

    const roughPrompt = document.getElementById("roughPrompt");
    const completedPrompt = document.getElementById("completedPrompt");

    const completePromptBtn = document.getElementById("completePromptBtn");
    const sendToCompressor = document.getElementById("sendToCompressor");

    const completionStatus = document.getElementById("completionStatus");

    const promptInput = document.getElementById("promptInput");
    const compressionRange = document.getElementById("compressionRange");

    const compressBtn = document.getElementById("compressBtn");
    const buttonLabel = compressBtn.querySelector(".button-label");

    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");

    const compressedText = document.getElementById("compressedText");

    const originalTokens = document.getElementById("originalTokens");
    const compressedTokens = document.getElementById("compressedTokens");
    const compressionRatio = document.getElementById("compressionRatio");

    const resultBadge = document.getElementById("resultBadge");
    const statusMessage = document.getElementById("statusMessage");

    const copyButton = document.getElementById("copyButton");
    const copyStatus = document.getElementById("copyStatus");

    const clearButton = document.getElementById("clearButton");

    const rangeValue = document.getElementById("rangeValue");


    // -----------------------------------
    // SAFE JSON RESPONSE HANDLER
    // -----------------------------------

    async function getJSONResponse(response) {

        const contentType = response.headers.get("content-type") || "";

        const responseText = await response.text();

        if (!contentType.includes("application/json")) {

            console.error("Non-JSON server response:", responseText);

            throw new Error(
                `Server returned HTML instead of JSON. HTTP ${response.status}. ` +
                `Check Render logs. Response: ${responseText.slice(0, 200)}`
            );

        }

        try {

            return JSON.parse(responseText);

        } catch (error) {

            console.error("Invalid JSON response:", responseText);

            throw new Error(
                "Server returned invalid JSON. Check Render logs."
            );

        }

    }


    // -----------------------------------
    // GEMINI PROMPT COMPLETION
    // -----------------------------------

    completePromptBtn.addEventListener("click", async () => {

        const prompt = roughPrompt.value.trim();

        if (!prompt) {

            completionStatus.textContent =
                "Please enter your project idea.";

            return;

        }

        completePromptBtn.disabled = true;

        completePromptBtn.textContent = "Generating...";

        completionStatus.textContent = "Connecting to Gemini...";

        try {

            const response = await fetch("/api/complete", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    prompt: prompt
                })

            });


            const data = await getJSONResponse(response);


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error || "Gemini completion failed."
                );

            }


            completedPrompt.value = data.completed_prompt;

            completionStatus.textContent =
                "Prompt completed successfully using Gemini.";

        }

        catch (error) {

            console.error("Gemini Error:", error);

            completionStatus.textContent = error.message;

        }

        finally {

            completePromptBtn.disabled = false;

            completePromptBtn.textContent = "✨ Complete Prompt";

        }

    });


    // -----------------------------------
    // SEND GEMINI OUTPUT TO V4
    // -----------------------------------

    sendToCompressor.addEventListener("click", () => {

        const prompt = completedPrompt.value.trim();

        if (!prompt) {

            completionStatus.textContent =
                "Generate a completed prompt first.";

            return;

        }

        promptInput.value = prompt;

        promptInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        statusMessage.textContent =
            "Gemini prompt transferred to V4.";

        promptInput.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

    });


    // -----------------------------------
    // V4 RESPONSE NORMALIZATION
    // -----------------------------------

    function findValue(obj, keys) {

        if (!obj || typeof obj !== "object") {

            return undefined;

        }

        for (const key of keys) {

            if (obj[key] !== undefined && obj[key] !== null) {

                return obj[key];

            }

        }

        return undefined;

    }


    function normalizeResult(result) {

        if (Array.isArray(result)) {

            return {

                compressed: result[0],

                original: result[1],

                compressedTokens: result[2],

                ratio: result[3]

            };

        }


        if (typeof result === "string") {

            return {

                compressed: result

            };

        }


        if (result && typeof result === "object") {

            const nested = result.data || result.result || result;


            if (Array.isArray(nested)) {

                return normalizeResult(nested);

            }


            return {

                compressed: findValue(nested, [

                    "compressed_prompt",

                    "compressed_text",

                    "compressed",

                    "output",

                    "text"

                ]),

                original: findValue(nested, [

                    "original_tokens",

                    "original_token_count"

                ]),

                compressedTokens: findValue(nested, [

                    "compressed_tokens",

                    "compressed_token_count"

                ]),

                ratio: findValue(nested, [

                    "compression_ratio",

                    "ratio"

                ])

            };

        }


        return {

            compressed: null

        };

    }


    // -----------------------------------
    // EXISTING V4 COMPRESSOR
    // -----------------------------------

    compressBtn.addEventListener("click", async () => {

        const prompt = promptInput.value.trim();

        const targetReduction = Number(compressionRange.value);


        if (!prompt) {

            statusMessage.textContent =
                "Please enter a prompt to compress.";

            return;

        }


        compressBtn.disabled = true;

        buttonLabel.textContent = "Compressing...";

        statusMessage.textContent =
            "Connecting to LLMLingua V4...";

        resultBadge.textContent = "PROCESSING";


        try {

            const response = await fetch("/api/compress", {

                method: "POST",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    prompt: prompt,

                    target_reduction: targetReduction

                })

            });


            const data = await getJSONResponse(response);


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error || "Compression failed."
                );

            }


            const result = normalizeResult(data.data);


            if (
                typeof result.compressed !== "string" ||
                !result.compressed.trim()
            ) {

                console.error(
                    "Unexpected V4 response:",
                    data
                );

                throw new Error(
                    "Could not identify compressed text in the model response."
                );

            }


            compressedText.textContent = result.compressed;

            originalTokens.textContent =
                result.original ?? "--";

            compressedTokens.textContent =
                result.compressedTokens ?? "--";

            compressionRatio.textContent =
                result.ratio ?? "--";


            emptyState.hidden = true;

            resultContent.hidden = false;

            resultBadge.textContent = "COMPLETED";

            statusMessage.textContent =
                "Prompt compressed successfully using LLMLingua V4.";

        }

        catch (error) {

            console.error("Compression Error:", error);

            statusMessage.textContent = error.message;

            resultBadge.textContent = "ERROR";

        }

        finally {

            compressBtn.disabled = false;

            buttonLabel.textContent = "⚡ Compress with V4";

        }

    });


    // -----------------------------------
    // COMPRESSION RANGE
    // -----------------------------------

    compressionRange.addEventListener("input", () => {

        rangeValue.textContent =
            compressionRange.value + "%";

    });


    // -----------------------------------
    // COPY COMPRESSED PROMPT
    // -----------------------------------

    copyButton.addEventListener("click", async () => {

        try {

            await navigator.clipboard.writeText(
                compressedText.textContent
            );

            copyStatus.textContent = "Copied!";

        }

        catch (error) {

            copyStatus.textContent =
                "Unable to copy.";

        }

    });


    // -----------------------------------
    // CLEAR COMPRESSOR
    // -----------------------------------

    clearButton.addEventListener("click", () => {

        promptInput.value = "";

        compressedText.textContent = "";

        originalTokens.textContent = "--";

        compressedTokens.textContent = "--";

        compressionRatio.textContent = "--";

        resultContent.hidden = true;

        emptyState.hidden = false;

        resultBadge.textContent = "WAITING";

        statusMessage.textContent = "";

        copyStatus.textContent = "";

    });

});
