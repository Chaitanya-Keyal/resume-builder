from typing import Any, Dict
from uuid import uuid4

import streamlit as st


def init_state(key: str, default: Any) -> Any:
    if key not in st.session_state:
        st.session_state[key] = default
    return st.session_state[key]


def get_state(key: str, default: Any = None) -> Any:
    return st.session_state.get(key, default)


def set_state(key: str, value: Any) -> None:
    st.session_state[key] = value


def init_resume_state():
    if "resume_data" not in st.session_state:
        st.session_state.resume_data = get_default_resume_data()

    if "current_profile_id" not in st.session_state:
        st.session_state.current_profile_id = None

    if "current_resume_id" not in st.session_state:
        st.session_state.current_resume_id = None

    if "preview_image" not in st.session_state:
        st.session_state.preview_image = None

    if "latex_content" not in st.session_state:
        st.session_state.latex_content = None

    if "is_dirty" not in st.session_state:
        st.session_state.is_dirty = False


def get_default_resume_data() -> Dict[str, Any]:
    return {
        "heading": {
            "name": "",
            "phone": "",
            "email": "",
            "location": "",
            "socials": [],
        },
        "education": {"section_title": "Education", "entries": []},
        "skills": {"section_title": "Skills", "entries": []},
        "experience": {"section_title": "Experience", "entries": []},
        "projects": {"section_title": "Projects", "entries": []},
        "honors_and_awards": {"section_title": "Honors & Awards", "entries": []},
        "custom_sections": [],
        "section_order": [
            "education",
            "skills",
            "experience",
            "projects",
            "honors_and_awards",
        ],
    }


def generate_id() -> str:
    return str(uuid4())


def mark_dirty():
    st.session_state.is_dirty = True


def mark_clean():
    st.session_state.is_dirty = False
