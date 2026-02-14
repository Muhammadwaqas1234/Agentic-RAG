from pydantic import BaseModel


class QuestionRequest(BaseModel):
    question: str


class UploadResponse(BaseModel):
    message: str


class AnswerResponse(BaseModel):
    verdict: str
    answer: str
