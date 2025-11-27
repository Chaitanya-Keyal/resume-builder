from datetime import UTC, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    name: str = Field(
        ..., description="Profile name (e.g., 'Software Engineer', 'Data Scientist')"
    )
    description: Optional[str] = Field(
        None, description="Brief description of this profile"
    )


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(
        None, description="Profile name (e.g., 'Software Engineer', 'Data Scientist')"
    )
    description: Optional[str] = Field(
        None, description="Brief description of this profile"
    )


class Profile(ProfileBase):
    id: str = Field(..., description="Unique profile ID")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(UTC), description="Last update timestamp"
    )
