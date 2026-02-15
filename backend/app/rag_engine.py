import os
import re
from typing import List
from pydantic import BaseModel
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.tools.tavily_search import TavilySearchResults

UPPER_TH = 0.7
LOWER_TH = 0.3


class DocEvalScore(BaseModel):
    score: float


class KeepOrDrop(BaseModel):
    keep: bool


class WebQuery(BaseModel):
    query: str


class AdaptiveRAGEngine:

    def __init__(self, openai_key: str, tavily_key: str):

        # Dynamically set keys
        os.environ["OPENAI_API_KEY"] = openai_key
        os.environ["TAVILY_API_KEY"] = tavily_key

        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        self.embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

        self.vector_store = None
        self.retriever = None

        # Tavily now works because key exists
        self.tavily = TavilySearchResults(
            max_results=5,
            tavily_api_key=tavily_key
        )

        self._build_prompts()

    # ---------------------------------

    def _build_prompts(self):

        self.eval_prompt = ChatPromptTemplate.from_messages([
            ("system", "Score relevance 0.0–1.0. JSON only."),
            ("human", "Question: {question}\n\nChunk:\n{chunk}")
        ])

        self.filter_prompt = ChatPromptTemplate.from_messages([
            ("system", "Return keep=true only if sentence directly helps answer. JSON only."),
            ("human", "Question: {question}\nSentence:\n{sentence}")
        ])

        self.rewrite_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Rewrite question into short keyword-based web query (6–14 words). "
             "If recency implied add (last 30 days). JSON with key 'query'."),
            ("human", "Question: {question}")
        ])

        self.answer_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Answer ONLY using provided context. "
             "If context insufficient say: I don't know."),
            ("human", "Question: {question}\n\nContext:\n{context}")
        ])

        self.eval_chain = self.eval_prompt | self.llm.with_structured_output(DocEvalScore)
        self.filter_chain = self.filter_prompt | self.llm.with_structured_output(KeepOrDrop)
        self.rewrite_chain = self.rewrite_prompt | self.llm.with_structured_output(WebQuery)

    # ---------------------------------

    def load_pdf(self, path: str):

        docs = PyPDFLoader(path).load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=900,
            chunk_overlap=150
        )

        chunks = splitter.split_documents(docs)

        self.vector_store = FAISS.from_documents(chunks, self.embeddings)
        self.retriever = self.vector_store.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 4}
        )

    # ---------------------------------

    def _evaluate(self, question: str, docs: List[Document]):

        scores = []
        good_docs = []

        for d in docs:
            result = self.eval_chain.invoke({
                "question": question,
                "chunk": d.page_content
            })

            scores.append(result.score)

            if result.score > LOWER_TH:
                good_docs.append(d)

        if any(s > UPPER_TH for s in scores):
            return "CORRECT", good_docs

        if len(scores) > 0 and all(s < LOWER_TH for s in scores):
            return "Augmented", []

        return "AMBIGUOUS", good_docs

    # ---------------------------------

    def _web_search(self, question: str):

        rewrite = self.rewrite_chain.invoke({"question": question})
        query = rewrite.query

        results = self.tavily.invoke({"query": query})

        web_docs = []

        for r in results or []:
            title = r.get("title", "")
            url = r.get("url", "")
            content = r.get("content", "") or r.get("snippet", "")

            text = f"TITLE: {title}\nURL: {url}\nCONTENT:\n{content}"

            web_docs.append(Document(
                page_content=text,
                metadata={"url": url, "title": title}
            ))

        return web_docs

    # ---------------------------------

    def _refine(self, question: str, docs: List[Document]):

        if not docs:
            return ""

        context = "\n\n".join(d.page_content for d in docs)
        sentences = re.split(r'(?<=[.!?])\s+', context)

        kept = []

        for s in sentences:
            if len(s.strip()) < 20:
                continue

            result = self.filter_chain.invoke({
                "question": question,
                "sentence": s
            })

            if result.keep:
                kept.append(s)

        return "\n".join(kept)

    # ---------------------------------

    def run(self, question: str):

        if not self.retriever:
            return {
                "verdict": "ERROR",
                "answer": "No document uploaded."
            }

        internal_docs = self.retriever.invoke(question)

        verdict, good_docs = self._evaluate(question, internal_docs)

        if verdict == "CORRECT":
            final_docs = good_docs

        elif verdict == "Augmented":
            web_docs = self._web_search(question)
            final_docs = web_docs

        else:
            web_docs = self._web_search(question)
            final_docs = good_docs + web_docs

        refined_context = self._refine(question, final_docs)

        answer = (self.answer_prompt | self.llm).invoke({
            "question": question,
            "context": refined_context
        })

        return {
            "verdict": verdict,
            "answer": answer.content
        }

