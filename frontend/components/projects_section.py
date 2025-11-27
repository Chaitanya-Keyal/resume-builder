from typing import Any, Dict

import streamlit as st
from utils.state_manager import generate_id, mark_dirty


def render_projects_section(projects: Dict[str, Any]) -> Dict[str, Any]:
    section_title = st.text_input(
        "Section Title",
        value=projects.get("section_title", "Projects"),
        key="proj_section_title",
    )

    st.markdown("### Projects")

    entries = projects.get("entries", [])
    updated_entries = []

    for i, entry in enumerate(entries):
        with st.expander(f"📁 {entry.get('title', 'New Project')}", expanded=False):
            title = st.text_input(
                "Project Title",
                value=entry.get("title", ""),
                key=f"proj_title_{i}",
                placeholder="Personal Portfolio Website",
            )

            col1, col2 = st.columns(2)
            with col1:
                url = st.text_input(
                    "URL",
                    value=entry.get("url", ""),
                    key=f"proj_url_{i}",
                    placeholder="https://github.com/username/project",
                )
            with col2:
                url_label = st.text_input(
                    "URL Label",
                    value=entry.get("url_label", "Link"),
                    key=f"proj_url_label_{i}",
                    placeholder="GitHub",
                )

            st.markdown("**Accomplishments** (one per line)")
            accomplishments = entry.get("accomplishments", [])
            accomplishments_str = "\n".join(accomplishments) if accomplishments else ""

            accomplishments_input = st.text_area(
                "Accomplishments",
                value=accomplishments_str,
                key=f"proj_accomplishments_{i}",
                placeholder="Built with React and TypeScript\nImplemented real-time notifications using WebSockets",
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
                if st.button("🗑️ Delete", key=f"del_proj_{i}"):
                    mark_dirty()
                    continue

            updated_entries.append(
                {
                    "id": entry.get("id", generate_id()),
                    "title": title,
                    "url": url,
                    "url_label": url_label,
                    "accomplishments": parsed_accomplishments,
                }
            )

    if st.button("➕ Add Project", key="add_proj"):
        updated_entries.append(
            {
                "id": generate_id(),
                "title": "",
                "url": "",
                "url_label": "Link",
                "accomplishments": [],
            }
        )
        mark_dirty()

    result = {"section_title": section_title, "entries": updated_entries}

    if result != projects:
        mark_dirty()

    return result
