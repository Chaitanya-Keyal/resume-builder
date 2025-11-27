from typing import Any, Dict

import streamlit as st
from utils.state_manager import generate_id, mark_dirty


def render_experience_section(experience: Dict[str, Any]) -> Dict[str, Any]:
    section_title = st.text_input(
        "Section Title",
        value=experience.get("section_title", "Experience"),
        key="exp_section_title",
    )

    st.markdown("### Work Experience")

    entries = experience.get("entries", [])
    updated_entries = []

    for i, entry in enumerate(entries):
        with st.expander(f"💼 {entry.get('title', 'New Experience')}", expanded=False):
            title = st.text_input(
                "Title (Company - Position)",
                value=entry.get("title", ""),
                key=f"exp_title_{i}",
                placeholder="Google - Software Engineer",
            )

            date = st.text_input(
                "Duration",
                value=entry.get("date", ""),
                key=f"exp_date_{i}",
                placeholder="Jan 2022 - Present",
            )

            st.markdown("**Accomplishments** (one per line)")
            accomplishments = entry.get("accomplishments", [])
            accomplishments_str = "\n".join(accomplishments) if accomplishments else ""

            accomplishments_input = st.text_area(
                "Accomplishments",
                value=accomplishments_str,
                key=f"exp_accomplishments_{i}",
                placeholder="Developed a feature that increased user engagement by 25%\nLed a team of 3 engineers to deliver project on time",
                height=150,
                label_visibility="collapsed",
            )

            parsed_accomplishments = [
                line.strip()
                for line in accomplishments_input.split("\n")
                if line.strip()
            ]

            col1, col2 = st.columns([1, 1])
            with col2:
                if st.button("🗑️ Delete", key=f"del_exp_{i}"):
                    mark_dirty()
                    continue

            updated_entries.append(
                {
                    "id": entry.get("id", generate_id()),
                    "title": title,
                    "date": date,
                    "accomplishments": parsed_accomplishments,
                }
            )

    if st.button("➕ Add Experience", key="add_exp"):
        updated_entries.append(
            {"id": generate_id(), "title": "", "date": "", "accomplishments": []}
        )
        mark_dirty()

    result = {"section_title": section_title, "entries": updated_entries}

    if result != experience:
        mark_dirty()

    return result
