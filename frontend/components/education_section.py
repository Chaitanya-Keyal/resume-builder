from typing import Any, Dict

import streamlit as st
from utils.state_manager import generate_id, mark_dirty


def render_education_section(education: Dict[str, Any]) -> Dict[str, Any]:
    section_title = st.text_input(
        "Section Title",
        value=education.get("section_title", "Education"),
        key="edu_section_title",
    )

    st.markdown("### Education Entries")

    entries = education.get("entries", [])
    updated_entries = []

    for i, entry in enumerate(entries):
        with st.expander(f"📚 {entry.get('institution', 'New Entry')}", expanded=False):
            col1, col2 = st.columns([3, 1])

            with col1:
                institution = st.text_input(
                    "Institution",
                    value=entry.get("institution", ""),
                    key=f"edu_institution_{i}",
                    placeholder="Massachusetts Institute of Technology",
                )
            with col2:
                location = st.text_input(
                    "Location",
                    value=entry.get("location", ""),
                    key=f"edu_location_{i}",
                    placeholder="Cambridge, MA",
                )

            degree = st.text_input(
                "Degree",
                value=entry.get("degree", ""),
                key=f"edu_degree_{i}",
                placeholder="Bachelor of Science in Computer Science",
            )

            col1, col2, col3 = st.columns(3)
            with col1:
                start_date = st.text_input(
                    "Start Date",
                    value=entry.get("start_date", ""),
                    key=f"edu_start_{i}",
                    placeholder="Sep 2018",
                )
            with col2:
                end_date = st.text_input(
                    "End Date",
                    value=entry.get("end_date", ""),
                    key=f"edu_end_{i}",
                    placeholder="June 2022",
                )
            with col3:
                marks = st.text_input(
                    "GPA/Marks",
                    value=entry.get("marks", ""),
                    key=f"edu_marks_{i}",
                    placeholder="GPA: 3.9/4.0",
                )

            col1, col2 = st.columns([1, 1])
            with col2:
                if st.button("🗑️ Delete", key=f"del_edu_{i}"):
                    mark_dirty()
                    continue

            updated_entries.append(
                {
                    "id": entry.get("id", generate_id()),
                    "institution": institution,
                    "location": location,
                    "degree": degree,
                    "start_date": start_date,
                    "end_date": end_date,
                    "marks": marks,
                }
            )

    if st.button("➕ Add Education Entry", key="add_edu"):
        updated_entries.append(
            {
                "id": generate_id(),
                "institution": "",
                "location": "",
                "degree": "",
                "start_date": "",
                "end_date": "",
                "marks": "",
            }
        )
        mark_dirty()

    result = {"section_title": section_title, "entries": updated_entries}

    if result != education:
        mark_dirty()

    return result
