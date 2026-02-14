const API_BASE = "http://localhost:8000";

async function uploadPDF() {

    const openaiKey = document.getElementById("openaiKey").value;
    const tavilyKey = document.getElementById("tavilyKey").value;
    const fileInput = document.getElementById("pdfFile");
    const status = document.getElementById("uploadStatus");

    if (!openaiKey || !tavilyKey || fileInput.files.length === 0) {
        alert("Provide OpenAI key, Tavily key, and PDF file.");
        return;
    }

    const formData = new FormData();
    formData.append("openai_key", openaiKey);
    formData.append("tavily_key", tavilyKey);
    formData.append("file", fileInput.files[0]);

    status.innerText = "Uploading and indexing document...";

    const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (response.ok) {
        status.innerText = "✅ Document indexed successfully.";
    } else {
        status.innerText = data.detail || "Upload failed.";
    }
}

async function askQuestion() {

    const questionInput = document.getElementById("question");
    const question = questionInput.value.trim();

    if (!question) return;

    addUserMessage(question);
    questionInput.value = "";

    const response = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            question: question
        })
    });

    const data = await response.json();

    if (response.ok) {
        addAssistantMessage(data.verdict, data.answer);
    } else {
        addAssistantMessage("ERROR", data.detail || "Something went wrong.");
    }
}

function addUserMessage(text) {
    const chatBox = document.getElementById("chatBox");

    const message = document.createElement("div");
    message.className = "message user";

    message.innerHTML = `<div class="bubble">${text}</div>`;

    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAssistantMessage(verdict, answer) {
    const chatBox = document.getElementById("chatBox");

    const message = document.createElement("div");
    message.className = "message assistant";

    message.innerHTML = `
        <div class="bubble">
            <strong>Verdict:</strong> ${verdict}<br><br>
            ${answer}
        </div>
    `;

    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}
