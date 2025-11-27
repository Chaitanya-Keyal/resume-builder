from typing import Any, Dict

import streamlit as st
from utils.state_manager import mark_dirty


def render_header_section(heading: Dict[str, Any]) -> Dict[str, Any]:
    st.markdown("### Personal Information")

    name = st.text_input(
        "Full Name",
        value=heading.get("name", ""),
        placeholder="John Doe",
        key="header_name",
    )

    col1, col2 = st.columns(2)
    with col1:
        email = st.text_input(
            "Email",
            value=heading.get("email", ""),
            placeholder="john@example.com",
            key="header_email",
        )
    with col2:
        phone = st.text_input(
            "Phone",
            value=heading.get("phone", ""),
            placeholder="+1 (123) 456-7890",
            key="header_phone",
        )

    location = st.text_input(
        "Location",
        value=heading.get("location", ""),
        placeholder="San Francisco, CA",
        key="header_location",
    )

    st.markdown("#### Social Links")
    socials = heading.get("socials", [])

    updated_socials = []
    for i, social in enumerate(socials):
        col1, col2, col3 = st.columns([2, 3, 1])
        with col1:
            social_name = st.text_input(
                "Platform",
                value=social.get("name", ""),
                key=f"social_name_{i}",
                label_visibility="collapsed",
                placeholder="GitHub",
            )
        with col2:
            social_url = st.text_input(
                "URL",
                value=social.get("url", ""),
                key=f"social_url_{i}",
                label_visibility="collapsed",
                placeholder="github.com/username",
            )
        with col3:
            if st.button("🗑️", key=f"del_social_{i}"):
                mark_dirty()
                continue

        if social_name or social_url:
            updated_socials.append({"name": social_name, "url": social_url})

    col1, col2, col3 = st.columns([2, 3, 1])
    with col1:
        new_social_name = st.text_input(
            "New Platform",
            value="",
            key="new_social_name",
            placeholder="LinkedIn",
            label_visibility="collapsed",
        )
    with col2:
        new_social_url = st.text_input(
            "New URL",
            value="",
            key="new_social_url",
            placeholder="linkedin.com/in/username",
            label_visibility="collapsed",
        )
    with col3:
        if st.button("➕", key="add_social"):
            if new_social_name and new_social_url:
                updated_socials.append({"name": new_social_name, "url": new_social_url})
                mark_dirty()

    new_heading = {
        "name": name,
        "email": email,
        "phone": phone,
        "location": location,
        "socials": updated_socials,
    }

    if new_heading != heading:
        mark_dirty()

    return new_heading
