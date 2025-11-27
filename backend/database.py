from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from .config import get_settings

_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_database() -> None:
    global _client, _database
    settings = get_settings()

    _client = AsyncIOMotorClient(settings.mongodb_url)
    _database = _client[settings.database_name]

    await _client.admin.command("ping")
    print(f"Connected to MongoDB: {settings.mongodb_url}/{settings.database_name}")


async def close_database_connection() -> None:
    global _client
    if _client:
        _client.close()
        print("Closed MongoDB connection")


def get_database() -> AsyncIOMotorDatabase:
    if _database is None:
        raise RuntimeError(
            "Database not initialized. Call connect_to_database() first."
        )
    return _database


def get_profiles_collection():
    return get_database()["profiles"]


def get_resumes_collection():
    return get_database()["resumes"]
