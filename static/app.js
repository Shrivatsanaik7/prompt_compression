const compressButton = document.getElementById("compressBtn");

compressButton.addEventListener("click", async () => {

    const prompt = document.getElementById("promptInput").value.trim();

    const targetReduction = Number(
        document.getElementById("compressionRange").value
    );

    const output = document.getElementById("output");

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

        output.textContent = data.compressed_prompt || "No compressed output returned.";

        const originalTokens = document.getElementById("originalTokens");
        const compressedTokens = document.getElementById("compressedTokens");
        const compressionRatio = document.getElementById("compressionRatio");

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

        output.textContent = error.message;

    } finally {

        compressButton.disabled = false;
        compressButton.textContent = "Compress Prompt";

    }
});
