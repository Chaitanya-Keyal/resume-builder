from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "resume_builder"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    debug: bool = False
    latex_timeout: int = 60
    temp_dir: str = "/tmp/latex_compile"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
