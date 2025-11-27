import streamlit as st
from utils.api_client import (
    create_profile,
    create_resume,
    delete_profile,
    delete_resume,
    list_profiles,
    list_resumes,
)
from utils.state_manager import get_state, set_state


def render_profiles_page():
    st.title("👤 Profiles")

    with st.expander("➕ Create New Profile", expanded=False):
        col1, col2 = st.columns([2, 1])
        with col1:
            new_profile_name = st.text_input(
                "Profile Name", placeholder="e.g., Software Engineer"
            )
            new_profile_desc = st.text_input(
                "Description (optional)", placeholder="e.g., For tech job applications"
            )
        with col2:
            st.write("")
            st.write("")
            if st.button("Create Profile", type="primary"):
                if new_profile_name:
                    try:
                        profile = create_profile(new_profile_name, new_profile_desc)
                        st.success(f"Created profile: {profile['name']}")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error creating profile: {e}")
                else:
                    st.warning("Please enter a profile name")

    st.markdown("---")

    try:
        profiles = list_profiles()
    except Exception as e:
        st.error(f"Error loading profiles: {e}")
        st.info("Make sure the API backend is running.")
        return

    if not profiles:
        st.info("No profiles yet. Create one above to get started!")
        return

    st.subheader("Your Profiles")

    for profile in profiles:
        with st.container():
            col1, col2, col3 = st.columns([3, 1, 1])

            with col1:
                st.markdown(f"### {profile['name']}")
                if profile.get("description"):
                    st.caption(profile["description"])

            with col2:
                if st.button("✏️ Edit Resumes", key=f"edit_{profile['id']}"):
                    set_state("current_profile_id", profile["id"])
                    set_state("current_profile_name", profile["name"])
                    st.rerun()

            with col3:
                if st.button("🗑️ Delete", key=f"delete_{profile['id']}"):
                    try:
                        delete_profile(profile["id"])
                        st.success("Profile deleted")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Error: {e}")

            try:
                resumes = list_resumes(profile["id"])
                if resumes:
                    st.caption(f"📄 {len(resumes)} resume(s)")
                    for resume in resumes:
                        resume_col1, resume_col2, resume_col3 = st.columns([3, 1, 1])
                        with resume_col1:
                            st.write(f"  • {resume['title']}")
                        with resume_col2:
                            if st.button("Edit", key=f"edit_resume_{resume['id']}"):
                                set_state("current_profile_id", profile["id"])
                                set_state("current_resume_id", resume["id"])
                                set_state("resume_data", resume["data"])
                                st.info(
                                    "Click 'Editor' in the sidebar to edit this resume"
                                )
                        with resume_col3:
                            if st.button("🗑️", key=f"del_resume_{resume['id']}"):
                                try:
                                    delete_resume(resume["id"])
                                    st.rerun()
                                except Exception as e:
                                    st.error(f"Error: {e}")
            except Exception as e:
                st.caption(f"Error loading resumes: {e}")

            st.markdown("---")

    current_profile_id = get_state("current_profile_id")
    if current_profile_id:
        st.markdown("---")
        st.subheader(
            f"Create Resume for: {get_state('current_profile_name', 'Selected Profile')}"
        )

        new_resume_title = st.text_input(
            "Resume Title", placeholder="e.g., Software Engineer Resume 2024"
        )

        if st.button("Create Resume", key="create_resume_btn"):
            if new_resume_title:
                try:
                    resume = create_resume(new_resume_title, current_profile_id)
                    set_state("current_resume_id", resume["id"])
                    set_state("resume_data", resume["data"])
                    st.success(f"Created resume: {resume['title']}")
                    st.info("Click 'Editor' in the sidebar to start editing")
                except Exception as e:
                    st.error(f"Error: {e}")
            else:
                st.warning("Please enter a resume title")
