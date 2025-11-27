from datetime import UTC, datetime
from typing import List
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from ..database import get_profiles_collection
from ..models.profile import Profile, ProfileCreate, ProfileUpdate

router = APIRouter()


@router.get("/", response_model=List[Profile])
async def list_profiles():
    collection = get_profiles_collection()
    profiles = []
    async for doc in collection.find():
        doc["id"] = str(doc.pop("_id"))
        profiles.append(Profile(**doc))
    return profiles


@router.get("/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str):
    collection = get_profiles_collection()
    doc = await collection.find_one({"_id": profile_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    doc["id"] = str(doc.pop("_id"))
    return Profile(**doc)


@router.post("/", response_model=Profile, status_code=201)
async def create_profile(profile: ProfileCreate):
    collection = get_profiles_collection()

    now = datetime.now(UTC)
    profile_id = str(uuid4())

    doc = {
        "_id": profile_id,
        "name": profile.name,
        "description": profile.description,
        "created_at": now,
        "updated_at": now,
    }

    await collection.insert_one(doc)

    return Profile(
        id=profile_id,
        name=profile.name,
        description=profile.description,
        created_at=now,
        updated_at=now,
    )


@router.put("/{profile_id}", response_model=Profile)
async def update_profile(profile_id: str, profile: ProfileUpdate):
    collection = get_profiles_collection()

    existing = await collection.find_one({"_id": profile_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = {"updated_at": datetime.now(UTC)}
    if profile.name is not None:
        update_data["name"] = profile.name
    if profile.description is not None:
        update_data["description"] = profile.description

    await collection.update_one({"_id": profile_id}, {"$set": update_data})

    doc = await collection.find_one({"_id": profile_id})
    doc["id"] = str(doc.pop("_id"))
    return Profile(**doc)


@router.delete("/{profile_id}", status_code=204)
async def delete_profile(profile_id: str):
    collection = get_profiles_collection()

    result = await collection.delete_one({"_id": profile_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Profile not found")

    from ..database import get_resumes_collection

    resumes_collection = get_resumes_collection()
    await resumes_collection.delete_many({"profile_id": profile_id})
