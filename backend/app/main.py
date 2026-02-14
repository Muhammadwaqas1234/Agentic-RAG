import os
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.rag_engine import AdaptiveRAGEngine
from app.schemas import AnswerResponse
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

engine: AdaptiveRAGEngine | None = None


# -----------------------------------
# Upload PDF + OpenAI + Tavily Key
# -----------------------------------

@app.post("/upload")
async def upload_pdf(
    openai_key: str = Form(...),
    tavily_key: str = Form(...),
    file: UploadFile = File(...)
):
    global engine

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    engine = AdaptiveRAGEngine(
        openai_key=openai_key,
        tavily_key=tavily_key
    )

    engine.load_pdf(file_path)

    return {"message": "Document indexed successfully."}


# -----------------------------------
# Ask Question
# -----------------------------------

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: dict):

    global engine

    if engine is None:
        raise HTTPException(status_code=400, detail="Upload a document first.")

    question = request.get("question")

    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    result = engine.run(question)

    return AnswerResponse(
        verdict=result["verdict"],
        answer=result["answer"]
    )
