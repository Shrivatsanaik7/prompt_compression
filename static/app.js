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

function updateCharacterCount() {
  charCount.textContent = `${promptInput.value.length.toLocaleString()} characters`;
}

function setStatus(message, kind = "") {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${kind}`.trim();
}

function pretty(value) {
  if (typeof value === "string") {
    // If the Space returns JSON as text, display it in a readable form.
    try { return JSON.stringify(JSON.parse(value), null, 2); }
    catch { return value; }
  }
  return JSON.stringify(value, null, 2);
}

function findCompressedText(value) {
  if (typeof value === "string") {
    try { return findCompressedText(JSON.parse(value)); }
    catch { return value; }
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
      "compressed_prompt", "compressedPrompt", "compressed_text",
      "compressed", "compressed_output", "compressedOutput"
    ];
    for (const key of preferredKeys) {
      if (typeof value[key] === "string" && value[key].trim()) return value[key];
    }
    // Check nested response/result/data fields before falling back to other strings.
    for (const key of ["result", "data", "output", "response"] ) {
      if (key in value) {
        const found = findCompressedText(value[key]);
        if (found) return found;
      }
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "string" && /compressed|output|result/i.test(key)) return item;
    }
  }
  return "";
}

async function runCompression() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    setStatus("Enter a prompt before compressing.", "error");
    promptInput.focus();
    return;
  }

  compressButton.disabled = true;
  compressButton.querySelector(".button-label").textContent = "Compressing with V4…";
  resultBadge.textContent = "Processing";
  setStatus("Sending your prompt to the V4 model. The first request may take longer if the Space is waking up.");
  copyStatus.textContent = "";

  try {
    const response = await fetch("/api/compress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });

    const payload = await response.json();
    if (!response.ok || payload.success === false) {
      throw new Error(payload.error || `Request failed (${response.status})`);
    }

    const apiResult = payload.result;
    const compressed = findCompressedText(apiResult);

    emptyState.classList.add("hidden");
    resultContent.classList.remove("hidden");
    compressedText.textContent = compressed || pretty(apiResult);
    rawResponse.textContent = pretty(apiResult);
    resultBadge.textContent = "Completed";
    setStatus("V4 returned a response successfully.", "success");
  } catch (error) {
    resultBadge.textContent = "Request failed";
    setStatus(error.message || "Something went wrong while calling the V4 API.", "error");
  } finally {
    compressButton.disabled = false;
    compressButton.querySelector(".button-label").textContent = "Compress with V4";
  }
}

promptInput.addEventListener("input", updateCharacterCount);
compressButton.addEventListener("click", runCompression);
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
copyButton.addEventListener("click", async () => {
  const text = compressedText.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyStatus.textContent = "Copied!";
  } catch {
    copyStatus.textContent = "Copy unavailable in this browser.";
  }
});

updateCharacterCount();
