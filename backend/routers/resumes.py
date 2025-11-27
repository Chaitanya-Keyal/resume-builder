from datetime import UTC, datetime
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from ..database import get_profiles_collection, get_resumes_collection
from ..models.resume import (
    Resume,
    ResumeCreate,
    ResumeUpdate,
    get_default_resume_data,
)

router = APIRouter()


@router.get("/", response_model=List[Resume])
async def list_resumes(
    profile_id: Optional[str] = Query(None, description="Filter by profile ID"),
):
    collection = get_resumes_collection()

    query = {}
    if profile_id:
        query["profile_id"] = profile_id

    resumes = []
    async for doc in collection.find(query):
        doc["id"] = str(doc.pop("_id"))
        resumes.append(Resume(**doc))
    return resumes


@router.get("/{resume_id}", response_model=Resume)
async def get_resume(resume_id: str):
    collection = get_resumes_collection()
    doc = await collection.find_one({"_id": resume_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")
    doc["id"] = str(doc.pop("_id"))
    return Resume(**doc)


@router.post("/", response_model=Resume, status_code=201)
async def create_resume(resume: ResumeCreate):
    collection = get_resumes_collection()
    profiles_collection = get_profiles_collection()

    profile = await profiles_collection.find_one({"_id": resume.profile_id})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    now = datetime.now(UTC)
    resume_id = str(uuid4())

    resume_data = resume.data if resume.data else get_default_resume_data()

    doc = {
        "_id": resume_id,
        "title": resume.title,
        "profile_id": resume.profile_id,
        "data": resume_data.model_dump(),
        "preview_image": None,
        "created_at": now,
        "updated_at": now,
    }

    await collection.insert_one(doc)

    return Resume(
        id=resume_id,
        title=resume.title,
        profile_id=resume.profile_id,
        data=resume_data,
        preview_image=None,
        created_at=now,
        updated_at=now,
    )


@router.put("/{resume_id}", response_model=Resume)
async def update_resume(resume_id: str, resume: ResumeUpdate):
    collection = get_resumes_collection()

    existing = await collection.find_one({"_id": resume_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Resume not found")

    update_data = {"updated_at": datetime.now(UTC)}
    if resume.title is not None:
        update_data["title"] = resume.title
    if resume.data is not None:
        update_data["data"] = resume.data.model_dump()

    await collection.update_one({"_id": resume_id}, {"$set": update_data})

    doc = await collection.find_one({"_id": resume_id})
    doc["id"] = str(doc.pop("_id"))
    return Resume(**doc)


@router.patch("/{resume_id}/preview", response_model=Resume)
async def update_resume_preview(resume_id: str, preview_image: str):
    collection = get_resumes_collection()

    result = await collection.update_one(
        {"_id": resume_id},
        {"$set": {"preview_image": preview_image, "updated_at": datetime.now(UTC)}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")

    doc = await collection.find_one({"_id": resume_id})
    doc["id"] = str(doc.pop("_id"))
    return Resume(**doc)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume(resume_id: str):
    collection = get_resumes_collection()

    result = await collection.delete_one({"_id": resume_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resume not found")
