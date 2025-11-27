from typing import Optional

from pydantic import BaseModel, Field


class Social(BaseModel):
    name: str = Field(..., description="Display name (e.g., 'GitHub', 'LinkedIn')")
    url: str = Field(..., description="Full URL or username")


class PersonalInfo(BaseModel):
    name: str = Field(..., description="Full name")
    phone: Optional[str] = Field(None, description="Phone number")
    email: Optional[str] = Field(None, description="Email address")
    location: Optional[str] = Field(None, description="City, State/Country")
    socials: list[Social] = Field(
        default_factory=list, description="Social media links"
    )


class EducationEntry(BaseModel):
    id: str = Field(..., description="Unique identifier")
    institution: str = Field(..., description="School/University name")
    location: str = Field("", description="City, State/Country")
    degree: str = Field(..., description="Degree or certification")
    start_date: str = Field(..., description="Start date (e.g., 'Sep. 2018')")
    end_date: str = Field(..., description="End date (e.g., 'June 2022' or 'Present')")
    marks: str = Field("", description="CGPA, GPA, or percentage")


class EducationSection(BaseModel):
    section_title: str = Field("Education", description="Section heading")
    entries: list[EducationEntry] = Field(default_factory=list)


class ExperienceEntry(BaseModel):
    id: str = Field(..., description="Unique identifier")
    title: str = Field(
        ..., description="Job title and company (e.g., 'Google - Software Engineer')"
    )
    date: str = Field("", description="Duration (e.g., 'Jan 2020 - Present')")
    accomplishments: list[str] = Field(
        default_factory=list, description="Bullet points"
    )


class ExperienceSection(BaseModel):
    section_title: str = Field("Experience", description="Section heading")
    entries: list[ExperienceEntry] = Field(default_factory=list)


class ProjectEntry(BaseModel):
    id: str = Field(..., description="Unique identifier")
    title: str = Field(..., description="Project name")
    url: str = Field("", description="Project URL")
    url_label: str = Field("Link", description="URL display text")
    accomplishments: list[str] = Field(
        default_factory=list, description="Bullet points"
    )


class ProjectsSection(BaseModel):
    section_title: str = Field("Projects", description="Section heading")
    entries: list[ProjectEntry] = Field(default_factory=list)


class SkillCategory(BaseModel):
    category: str = Field(
        ..., description="Category name (e.g., 'Programming Languages')"
    )
    items: list[str] = Field(default_factory=list, description="List of skills")


class SkillsSection(BaseModel):
    section_title: str = Field("Skills", description="Section heading")
    entries: list[SkillCategory] = Field(default_factory=list)


class AwardEntry(BaseModel):
    id: str = Field(..., description="Unique identifier")
    description: str = Field(..., description="Award description")
    url: Optional[str] = Field(None, description="Optional URL")
    url_label: Optional[str] = Field(None, description="URL display text")


class AwardsSection(BaseModel):
    section_title: str = Field("Honors & Awards", description="Section heading")
    entries: list[AwardEntry] = Field(default_factory=list)


class CustomEntry(BaseModel):
    id: str = Field(..., description="Unique identifier")
    title: str = Field("", description="Entry title/heading")
    subtitle: str = Field("", description="Secondary line (e.g., organization)")
    date: str = Field("", description="Date or duration")
    url: str = Field("", description="Optional URL")
    url_label: str = Field("", description="URL display text")
    bullets: list[str] = Field(default_factory=list, description="Bullet points")


class CustomSection(BaseModel):
    section_title: str = Field(..., description="Section heading")
    section_type: str = Field("custom", description="Section type identifier")
    entries: list[CustomEntry] = Field(default_factory=list)


SectionKey = str


class ResumeData(BaseModel):
    heading: PersonalInfo
    education: EducationSection = Field(default_factory=lambda: EducationSection())
    skills: SkillsSection = Field(default_factory=lambda: SkillsSection())
    experience: ExperienceSection = Field(default_factory=lambda: ExperienceSection())
    projects: ProjectsSection = Field(default_factory=lambda: ProjectsSection())
    honors_and_awards: AwardsSection = Field(default_factory=lambda: AwardsSection())
    custom_sections: list[CustomSection] = Field(
        default_factory=list, description="User-defined sections"
    )
    section_order: list[SectionKey] = Field(
        default_factory=lambda: [
            "education",
            "skills",
            "experience",
            "projects",
            "honors_and_awards",
        ],
        description="Order of sections in the rendered resume",
    )
