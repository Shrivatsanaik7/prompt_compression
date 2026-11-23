document.addEventListener("DOMContentLoaded", () => {

    const promptInput = document.getElementById("promptInput");
    const compressionRange = document.getElementById("compressionRange");
    const compressButton = document.getElementById("compressBtn");
    const output = document.getElementById("output");

    const charCount = document.getElementById("charCount");
    const rangeValue = document.getElementById("rangeValue");

    const originalTokens = document.getElementById("originalTokens");
    const compressedTokens = document.getElementById("compressedTokens");
    const compressionRatio = document.getElementById("compressionRatio");

    if (!promptInput || !compressionRange || !compressButton || !output) {
        console.error("LLMLingua: One or more required HTML elements are missing.");
        return;
    }

    // Character counter
    promptInput.addEventListener("input", () => {
        if (charCount) {
            charCount.textContent = promptInput.value.length + " characters";
        }
    });

    // Compression percentage display
    compressionRange.addEventListener("change", () => {
        if (rangeValue) {
            rangeValue.textContent = compressionRange.value + "%";
        }
    });

    // Compression button
    compressButton.addEventListener("click", async () => {

        const prompt = promptInput.value.trim();
        const targetReduction = Number(compressionRange.value);

        if (!prompt) {
            output.textContent = "Please enter a prompt.";
            return;
        }

        compressButton.disabled = true;
        compressButton.textContent = "Compressing...";

        output.textContent = "Connecting to LLMLingua V4...";

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

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Compression failed.");
            }

            output.textContent =
                data.compressed_prompt || "No compressed output returned.";

            if (originalTokens) {
                originalTokens.textContent = data.original_tokens ?? "-";
            }

            if (compressedTokens) {
                compressedTokens.textContent = data.compressed_tokens ?? "-";
            }

            if (compressionRatio) {
                compressionRatio.textContent = data.compression_ratio ?? "-";
            }

        } catch (error) {

            console.error("Compression error:", error);
            output.textContent = error.message;

        } finally {

            compressButton.disabled = false;
            compressButton.textContent = "Compress with V4";

        }
    });

});
