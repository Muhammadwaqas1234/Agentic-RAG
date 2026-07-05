const API_BASE = "http://localhost:8000";

/* ---------- helpers ---------- */

function esc(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

function hideEmptyState() {
    const empty = document.getElementById("emptyState");
    if (empty) empty.remove();
}

function setStatus(kind, text) {
    const status = document.getElementById("uploadStatus");
    status.hidden = false;
    status.className = `status ${kind}`;
    status.innerText = text;
}

const VERDICT_STYLES = {
    "CORRECT": { cls: "pill-correct", label: "CORRECT · document" },
    "Augmented": { cls: "pill-augmented", label: "AUGMENTED · web" },
    "AMBIGUOUS": { cls: "pill-ambiguous", label: "AMBIGUOUS · hybrid" },
};

/* ---------- upload ---------- */

const fileInput = document.getElementById("pdfFile");
const dropzone = document.getElementById("dropzone");

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) showChosenFile(fileInput.files[0].name);
});

["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    })
);
["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
    })
);
dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length > 0) {
        fileInput.files = e.dataTransfer.files;
        showChosenFile(e.dataTransfer.files[0].name);
    }
});

function showChosenFile(name) {
    dropzone.classList.add("has-file");
    document.getElementById("dzTitle").innerText = name;
    document.getElementById("dzSub").innerText = "Ready to index";
}

async function uploadPDF() {
    const openaiKey = document.getElementById("openaiKey").value.trim();
    const tavilyKey = document.getElementById("tavilyKey").value.trim();
    const btn = document.getElementById("uploadBtn");
    const btnText = document.getElementById("uploadBtnText");

    if (!openaiKey || !tavilyKey || fileInput.files.length === 0) {
        setStatus("err", "Add both API keys and choose a PDF first.");
        return;
    }

    const formData = new FormData();
    formData.append("openai_key", openaiKey);
    formData.append("tavily_key", tavilyKey);
    formData.append("file", fileInput.files[0]);

    btn.disabled = true;
    btnText.innerText = "Indexing…";
    setStatus("busy", "Uploading and indexing document…");

    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: "POST",
            body: formData,
        });
        const data = await response.json();

        if (response.ok) {
            setStatus("ok", "Document indexed successfully. Ask away!");
        } else {
            setStatus("err", data.detail || "Upload failed.");
        }
    } catch {
        setStatus("err", "Could not reach the backend. Is it running on port 8000?");
    } finally {
        btn.disabled = false;
        btnText.innerText = "Index document";
    }
}

/* ---------- chat ---------- */

const questionInput = document.getElementById("question");
const sendBtn = document.getElementById("sendBtn");

questionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        askQuestion();
    }
});

function useSuggestion(chip) {
    questionInput.value = chip.innerText;
    questionInput.focus();
}

async function askQuestion() {
    const question = questionInput.value.trim();
    if (!question || sendBtn.disabled) return;

    hideEmptyState();
    addUserMessage(question);
    questionInput.value = "";
    sendBtn.disabled = true;

    const typing = addTypingIndicator();

    try {
        const response = await fetch(`${API_BASE}/ask`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
        });
        const data = await response.json();

        typing.remove();
        if (response.ok) {
            addAssistantMessage(data.verdict, data.answer);
        } else {
            addAssistantMessage("ERROR", data.detail || "Something went wrong.");
        }
    } catch {
        typing.remove();
        addAssistantMessage("ERROR", "Could not reach the backend. Is it running on port 8000?");
    } finally {
        sendBtn.disabled = false;
        questionInput.focus();
    }
}

function addUserMessage(text) {
    const chatBox = document.getElementById("chatBox");
    const message = document.createElement("div");
    message.className = "message user";
    message.innerHTML = `<div class="bubble">${esc(text)}</div>`;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAssistantMessage(verdict, answer) {
    const chatBox = document.getElementById("chatBox");
    const style = VERDICT_STYLES[verdict] || { cls: "pill-error", label: verdict };

    const message = document.createElement("div");
    message.className = "message assistant";
    message.innerHTML = `
        <div class="bubble">
            <span class="verdict-pill ${style.cls}">${esc(style.label)}</span>
            <div class="answer-text">${esc(answer)}</div>
        </div>
    `;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addTypingIndicator() {
    const chatBox = document.getElementById("chatBox");
    const message = document.createElement("div");
    message.className = "message assistant";
    message.innerHTML = `
        <div class="bubble">
            <div class="typing"><span></span><span></span><span></span></div>
        </div>
    `;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return message;
}
