# Adaptive RAG System

**Adaptive RAG System** is a cutting-edge **Retrieval-Augmented Generation (RAG)** platform that intelligently combines **document retrieval** and **internet search** to deliver accurate and context-aware answers. The system dynamically determines whether answers are derived from the uploaded document, the internet, or a combination of both, providing precise verdicts for each query.

---

## Table of Contents

* [Features](#features)
* [Architecture](#architecture)
* [Verdict Definitions](#verdict-definitions)
* [Technology Stack](#technology-stack)
* [Project Structure](#project-structure)
* [Getting Started](#getting-started)
* [API Endpoints](#api-endpoints)
* [Usage Example](#usage-example)
* [Design Principles](#design-principles)
* [Future Improvements](#future-improvements)
* [Author](#author)

---

## Features

* **PDF Upload & Indexing:** Users can upload a PDF document for analysis and vector embedding.
* **Dynamic API Keys:** OpenAI and Tavily API keys can be provided via the frontend for flexible deployment.
* **Adaptive Question Answering:** The system automatically routes queries based on relevance scoring:

  * **CORRECT:** Answer from document only
  * **Augmented:** Answer from the internet only
  * **AMBIGUOUS:** Hybrid answer from document + internet
* **ChatGPT-like UI:** Clean, professional, white-themed interface for intuitive interaction.
* **No Session Handling:** Simplified architecture with a single global RAG engine instance.
* **Lightweight Backend:** FastAPI-based backend with FAISS vector search and LangChain pipelines.
* **Dockerized:** Ready for containerized deployment.

---

## Architecture

The system leverages a modular RAG pipeline:

```
+--------------------+
|   User Interface   |
|  (ChatGPT Style)   |
+---------+----------+
          |
          v
+--------------------+
| FastAPI Backend    |
|  (main.py, RAG)    |
+---------+----------+
          |
          v
+--------------------+        +--------------------+
| PDF Document Loader |<----->|  FAISS Vector DB   |
+--------------------+        +--------------------+
          |
          v
+--------------------+
| LLM Evaluation     |
| (GPT-4o-mini)      |
+--------------------+
          |
          v
+--------------------+
| Routing Engine     |
| CORRECT / INCORRECT|
| / AMBIGUOUS        |
+--------------------+
          |
          v
+--------------------+
| Tavily Web Search  |
| (if needed)        |
+--------------------+
```

---

## Verdict Definitions

| Verdict       | Description                                                            |
| ------------- | ---------------------------------------------------------------------- |
| **CORRECT**   | Fully sourced from the uploaded PDF document.                          |
| **Augmented** | Not present in document; sourced entirely from the internet.           |
| **AMBIGUOUS** | Partial information in document, additional context from the internet. |

---

## Technology Stack

* **Backend:** FastAPI, Python 3.11
* **RAG Pipeline:** LangChain, FAISS, OpenAI GPT-4o-mini
* **Document Loader:** PyPDFLoader
* **Web Search:** Tavily API
* **Frontend:** HTML, CSS, JavaScript
* **Containerization:** Docker, Docker Compose

---

## Project Structure

```
adaptive-rag-system/
│
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI server
│   │   ├── rag_engine.py    # Adaptive RAG engine
│   │   └── schemas.py       # Pydantic request/response models
│   ├── uploads/             # PDF file storage
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── index.html           # Chat interface
│   ├── style.css            # White-theme professional styling
│   ├── script.js            # Frontend API logic
│   └── Dockerfile
│
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

* Python 3.11+
* Docker & Docker Compose (optional for containerized deployment)
* OpenAI API key
* Tavily API key

---

### Local Deployment

**Backend**

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend**

Open `frontend/index.html` in a browser or serve via a local HTTP server.

---

### Docker Deployment

```bash
docker-compose up --build
```

---

## API Endpoints

### `POST /upload`

Upload a PDF document with OpenAI and Tavily API keys.

**Form Data:**

```text
api_key    # OpenAI API Key
tavily_key # Tavily API Key
file       # PDF file
```

**Response:**

```json
{
  "message": "Document indexed successfully."
}
```

---

### `POST /ask`

Ask a question based on uploaded document.

**JSON Request:**

```json
{
  "question": "Explain the methodology used in the document"
}
```

**JSON Response:**

```json
{
  "verdict": "CORRECT | Augmented | AMBIGUOUS",
  "answer": "Generated answer from document, internet, or hybrid."
}
```

---

## Usage Example

1. Upload your research paper PDF.
2. Provide OpenAI & Tavily API keys.
3. Ask a question:

```
"What methodology was used?"
```

* **CORRECT:** Answer is fully derived from document.
* **Augmented:** Answer is retrieved from the internet.
* **AMBIGUOUS:** Document + Internet combined answer.

---

## Design Principles

* **Single Global Engine:** Simplifies management of document embeddings.
* **Dynamic API Keys:** No need to store keys in environment variables.
* **Minimal Latency:** FAISS vector search ensures fast retrieval.
* **Context-Aware Answers:** Sentence-level refinement reduces hallucination.
* **Frontend Flexibility:** Clean, white ChatGPT-style interface for professional UX.

---

## Future Enhancements

* Multi-document support
* Persistent FAISS database
* Streaming answer generation
* Authentication & user management

---

## Author

**MUHAMMAD WAQAS** 


