from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import close_database_connection, connect_to_database
from .routers import compile_router, profiles_router, resumes_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_database()
    yield
    await close_database_connection()


app = FastAPI(
    title="Resume Builder API",
    description="API for creating and managing resumes with LaTeX compilation",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profiles_router, prefix="/profiles", tags=["profiles"])
app.include_router(resumes_router, prefix="/resumes", tags=["resumes"])
app.include_router(compile_router, prefix="", tags=["compile"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "name": "Resume Builder API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }
