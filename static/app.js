document.addEventListener("DOMContentLoaded", () => {

    const promptInput = document.getElementById("promptInput");
    const compressionRange = document.getElementById("compressionRange");
    const compressButton = document.getElementById("compressBtn");
    const clearButton = document.getElementById("clearButton");

    const charCount = document.getElementById("charCount");
    const rangeValue = document.getElementById("rangeValue");

    const statusMessage = document.getElementById("statusMessage");
    const resultBadge = document.getElementById("resultBadge");

    const emptyState = document.getElementById("emptyState");
    const resultContent = document.getElementById("resultContent");

    const compressedText = document.getElementById("compressedText");

    const copyButton = document.getElementById("copyButton");
    const copyStatus = document.getElementById("copyStatus");

    const originalTokens = document.getElementById("originalTokens");
    const compressedTokens = document.getElementById("compressedTokens");
    const compressionRatio = document.getElementById("compressionRatio");


    // STATUS MESSAGE

    function setStatus(message, kind = "") {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${kind}`.trim();
    }


    // CHARACTER COUNTER

    function updateCount() {
        charCount.textContent =
            `${promptInput.value.length.toLocaleString()} / 20,000 characters`;
    }


    // COMPRESSION REDUCTION

    function updateReduction() {
        rangeValue.textContent = `${compressionRange.value}%`;
    }


    // EXTRACT COMPRESSED TEXT FROM API RESPONSE

    function findCompressedText(data) {

        if (typeof data === "string") {
            try {
                return findCompressedText(JSON.parse(data));
            } catch {
                return data;
            }
        }

        if (Array.isArray(data)) {
            for (const item of data) {
                const found = findCompressedText(item);
                if (found) return found;
            }
            return "";
        }

        if (data && typeof data === "object") {

            const possibleKeys = [
                "compressed_prompt",
                "compressedPrompt",
                "compressed_text",
                "compressed",
                "output"
            ];

            for (const key of possibleKeys) {
                if (typeof data[key] === "string" && data[key].trim()) {
                    return data[key];
                }
            }

            for (const key of ["result", "data", "response"]) {
                if (key in data) {
                    const found = findCompressedText(data[key]);
                    if (found) return found;
                }
            }
        }

        return "";
    }


    // COMPRESS PROMPT

    async function runCompression() {

        const prompt = promptInput.value.trim();

        const targetReduction = Number(compressionRange.value);

        if (!prompt) {
            setStatus("Enter a prompt before compressing.", "error");
            promptInput.focus();
            return;
        }

        compressButton.disabled = true;

        compressButton.querySelector(".button-label").textContent =
            "Compressing with V4...";

        resultBadge.textContent = "Processing";

        setStatus(
            "Sending your prompt to LLMLingua V4. The first request may take longer while the Space wakes up."
        );

        copyStatus.textContent = "";

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

            const payload = await response.json();

            if (!response.ok || payload.success === false) {
                throw new Error(
                    payload.error || `Request failed (${response.status}).`
                );
            }

            const compressed = findCompressedText(payload);

            if (!compressed) {
                throw new Error(
                    "API responded, but no compressed prompt was found. Check the Hugging Face Space output format."
                );
            }

            compressedText.textContent = compressed;

            emptyState.classList.add("hidden");
            resultContent.classList.remove("hidden");

            originalTokens.textContent =
                payload.original_tokens ??
                payload.input_tokens ??
                "—";

            compressedTokens.textContent =
                payload.compressed_tokens ??
                payload.output_tokens ??
                "—";

            compressionRatio.textContent =
                payload.compression_ratio ??
                payload.reduction ??
                "—";

            resultBadge.textContent = "Completed";

            setStatus(
                "Your prompt was compressed successfully.",
                "success"
            );

        } catch (error) {

            console.error("Compression error:", error);

            resultBadge.textContent = "Request failed";

            setStatus(
                error.message || "Something went wrong.",
                "error"
            );

        } finally {

            compressButton.disabled = false;

            compressButton.querySelector(".button-label").textContent =
                "Compress with V4";

        }

    }


    // CLEAR BUTTON

    clearButton.addEventListener("click", () => {

        promptInput.value = "";

        updateCount();

        compressedText.textContent = "";

        resultContent.classList.add("hidden");

        emptyState.classList.remove("hidden");

        resultBadge.textContent = "Waiting for input";

        originalTokens.textContent = "—";
        compressedTokens.textContent = "—";
        compressionRatio.textContent = "—";

        copyStatus.textContent = "";

        setStatus("");

        promptInput.focus();

    });


    // COPY BUTTON

    copyButton.addEventListener("click", async () => {

        const text = compressedText.textContent;

        if (!text) return;

        try {

            await navigator.clipboard.writeText(text);

            copyStatus.textContent = "Copied to clipboard.";

        } catch {

            copyStatus.textContent =
                "Clipboard access unavailable in this browser.";

        }

    });


    // MOBILE NAVIGATION

    const mobileMenu = document.getElementById("mobileMenu");

    const navLinks = document.querySelector(".nav-links");

    mobileMenu.addEventListener("click", () => {

        const isOpen = navLinks.classList.toggle("open");

        mobileMenu.setAttribute(
            "aria-expanded",
            String(isOpen)
        );

    });


    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("open");

            mobileMenu.setAttribute("aria-expanded", "false");

        });

    });


    // EVENT LISTENERS

    promptInput.addEventListener("input", updateCount);

    compressionRange.addEventListener("change", updateReduction);

    compressButton.addEventListener("click", runCompression);


    // INITIALIZE

    updateCount();

    updateReduction();

});
