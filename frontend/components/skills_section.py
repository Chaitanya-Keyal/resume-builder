from typing import Any, Dict

import streamlit as st
from utils.state_manager import mark_dirty


def render_skills_section(skills: Dict[str, Any]) -> Dict[str, Any]:
    section_title = st.text_input(
        "Section Title",
        value=skills.get("section_title", "Skills"),
        key="skills_section_title",
    )

    st.markdown("### Skill Categories")
    st.caption(
        "Add categories like 'Programming Languages', 'Frameworks', 'Tools', etc."
    )

    entries = skills.get("entries", [])
    updated_entries = []

    for i, entry in enumerate(entries):
        with st.expander(f"🛠️ {entry.get('category', 'New Category')}", expanded=False):
            category = st.text_input(
                "Category Name",
                value=entry.get("category", ""),
                key=f"skill_cat_{i}",
                placeholder="Programming Languages",
            )

            items = entry.get("items", [])
            items_str = ", ".join(items) if items else ""

            items_input = st.text_area(
                "Skills (comma-separated)",
                value=items_str,
                key=f"skill_items_{i}",
                placeholder="Python, JavaScript, TypeScript, Go",
                height=80,
            )

            parsed_items = [
                item.strip() for item in items_input.split(",") if item.strip()
            ]

            col1, col2 = st.columns([1, 1])
            with col2:
                if st.button("🗑️ Delete", key=f"del_skill_{i}"):
                    mark_dirty()
                    continue

            updated_entries.append({"category": category, "items": parsed_items})

    if st.button("➕ Add Skill Category", key="add_skill"):
        updated_entries.append({"category": "", "items": []})
        mark_dirty()

    result = {"section_title": section_title, "entries": updated_entries}

    if result != skills:
        mark_dirty()

    return result
