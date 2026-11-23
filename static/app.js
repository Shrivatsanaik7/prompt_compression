const promptInput = document.getElementById("promptInput");
const compressButton = document.getElementById("compressButton");
const clearButton = document.getElementById("clearButton");
const charCount = document.getElementById("charCount");
const statusMessage = document.getElementById("statusMessage");
const emptyState = document.getElementById("emptyState");
const resultContent = document.getElementById("resultContent");
const compressedText = document.getElementById("compressedText");
const rawResponse = document.getElementById("rawResponse");
const resultBadge = document.getElementById("resultBadge");
const copyButton = document.getElementById("copyButton");
const copyStatus = document.getElementById("copyStatus");

// Compression percentage dropdown
const targetReductionInput = document.getElementById("targetReduction");

const ALLOWED_REDUCTIONS = [20, 30, 40, 50, 60];


// --------------------------------------------------
// CHARACTER COUNT
// --------------------------------------------------

function updateCharacterCount() {
    charCount.textContent =
        `${promptInput.value.length.toLocaleString()} characters`;
}


// --------------------------------------------------
// STATUS MESSAGE
// --------------------------------------------------

function setStatus(message, kind = "") {
    statusMessage.textContent = message;
    statusMessage.className =
        `status-message ${kind}`.trim();
}


// --------------------------------------------------
// FORMAT RESPONSE
// --------------------------------------------------

function pretty(value) {

    if (typeof value === "string") {

        try {
            return JSON.stringify(
                JSON.parse(value),
                null,
                2
            );
        } catch {
            return value;
        }
    }

    return JSON.stringify(value, null, 2);
}


// --------------------------------------------------
// FIND COMPRESSED TEXT
// --------------------------------------------------

function findCompressedText(value) {

    if (typeof value === "string") {

        try {
            return findCompressedText(JSON.parse(value));
        } catch {
            return value;
        }
    }

    if (Array.isArray(value)) {

        for (const item of value) {

            const found = findCompressedText(item);

            if (found) return found;
        }

        return "";
    }

    if (value && typeof value === "object") {

        const preferredKeys = [
            "compressed_prompt",
            "compressedPrompt",
            "compressed_text",
            "compressed",
            "compressed_output",
            "compressedOutput"
        ];

        for (const key of preferredKeys) {

            if (
                typeof value[key] === "string" &&
                value[key].trim()
            ) {
                return value[key];
            }
        }

        for (const key of [
            "result",
            "data",
            "output",
            "response"
        ]) {

            if (key in value) {

                const found = findCompressedText(value[key]);

                if (found) return found;
            }
        }

        for (const [key, item] of Object.entries(value)) {

            if (
                typeof item === "string" &&
                /compressed|output|result/i.test(key)
            ) {
                return item;
            }
        }
    }

    return "";
}


// --------------------------------------------------
// RUN PROMPT COMPRESSION
// --------------------------------------------------

async function runCompression() {

    const prompt = promptInput.value.trim();

    // Validate prompt
    if (!prompt) {

        setStatus(
            "Enter a prompt before compressing.",
            "error"
        );

        promptInput.focus();
        return;
    }

    // Get selected compression percentage
    const targetReduction = targetReductionInput
        ? Number(targetReductionInput.value)
        : 30;

    // Validate compression percentage
    if (!ALLOWED_REDUCTIONS.includes(targetReduction)) {

        setStatus(
            "Please select a valid compression percentage.",
            "error"
        );

        return;
    }

    // Disable button while processing
    compressButton.disabled = true;

    compressButton.querySelector(".button-label").textContent =
        "Compressing with V4…";

    resultBadge.textContent = "Processing";

    setStatus(
        `Sending your prompt to V4 with ${targetReduction}% target reduction. The first request may take longer if the Space is waking up.`
    );

    copyStatus.textContent = "";


    try {

        // Send prompt and compression percentage
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


        // Handle errors
        if (!response.ok || payload.success === false) {

            throw new Error(
                payload.error ||
                `Request failed (${response.status})`
            );
        }


        // Get API result
        const apiResult = payload.result;

        const compressed = findCompressedText(apiResult);


        // Display result
        emptyState.classList.add("hidden");

        resultContent.classList.remove("hidden");

        compressedText.textContent =
            compressed || pretty(apiResult);

        rawResponse.textContent =
            pretty(apiResult);


        // Update status
        resultBadge.textContent = "Completed";

        setStatus(
            `V4 compression completed successfully using ${targetReduction}% target reduction.`,
            "success"
        );


    } catch (error) {

        resultBadge.textContent = "Request failed";

        setStatus(
            error.message ||
            "Something went wrong while calling the V4 API.",
            "error"
        );

    } finally {

        compressButton.disabled = false;

        compressButton.querySelector(".button-label").textContent =
            "Compress with V4";
    }
}


// --------------------------------------------------
// INPUT EVENTS
// --------------------------------------------------

promptInput.addEventListener(
    "input",
    updateCharacterCount
);


// --------------------------------------------------
// COMPRESSION BUTTON
// --------------------------------------------------

compressButton.addEventListener(
    "click",
    runCompression
);


// --------------------------------------------------
// CLEAR BUTTON
// --------------------------------------------------

clearButton.addEventListener("click", () => {

    promptInput.value = "";

    updateCharacterCount();

    compressedText.textContent = "";

    rawResponse.textContent = "";

    resultContent.classList.add("hidden");

    emptyState.classList.remove("hidden");

    resultBadge.textContent = "Waiting for input";

    copyStatus.textContent = "";

    setStatus("");

    promptInput.focus();
});


// --------------------------------------------------
// COPY BUTTON
// --------------------------------------------------

copyButton.addEventListener("click", async () => {

    const text = compressedText.textContent;

    if (!text) return;

    try {

        await navigator.clipboard.writeText(text);

        copyStatus.textContent = "Copied!";

    } catch {

        copyStatus.textContent =
            "Copy unavailable in this browser.";
    }
});


// --------------------------------------------------
// INITIALIZE
// --------------------------------------------------

updateCharacterCount();
