from datetime import UTC, datetime
from typing import Optional

from pydantic import BaseModel, Field

from .sections import PersonalInfo, ResumeData


class ResumeBase(BaseModel):
    title: str = Field(..., description="Resume title/filename")
    profile_id: str = Field(..., description="ID of the profile this resume belongs to")


class ResumeCreate(ResumeBase):
    data: Optional[ResumeData] = Field(
        None, description="Initial resume data (optional)"
    )


class ResumeUpdate(BaseModel):
    title: Optional[str] = Field(None, description="Resume title/filename")
    data: Optional[ResumeData] = Field(None, description="Updated resume data")


class Resume(ResumeBase):
    id: str = Field(..., description="Unique resume ID")
    data: ResumeData = Field(..., description="Complete resume content")
    preview_image: Optional[str] = Field(
        None, description="Base64-encoded preview image"
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Last update timestamp"
    )


def get_default_resume_data() -> ResumeData:
    return ResumeData(
        heading=PersonalInfo(
            name="Your Name",
            email="email@example.com",
            phone="+1 (123) 456-7890",
            location="City, State",
            socials=[],
        ),
        section_order=["education", "skills", "experience", "projects"],
    )
