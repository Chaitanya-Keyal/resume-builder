import streamlit as st
from config import APP_ICON, APP_TITLE
from utils.api_client import health_check
from utils.state_manager import init_resume_state

st.set_page_config(
    page_title=APP_TITLE,
    page_icon=APP_ICON,
    layout="wide",
    initial_sidebar_state="expanded",
)

init_resume_state()


def main():
    with st.sidebar:
        st.title(f"{APP_ICON} {APP_TITLE}")
        st.markdown("---")

        page = st.radio(
            "Navigation",
            ["🏠 Home", "👤 Profiles", "📝 Editor"],
            label_visibility="collapsed",
        )

        st.markdown("---")

        api_healthy = health_check()
        if api_healthy:
            st.success("✅ API Connected")
        else:
            st.error("❌ API Disconnected")
            st.caption("Make sure the FastAPI backend is running.")

    if page == "🏠 Home":
        show_home_page()
    elif page == "👤 Profiles":
        show_profiles_page()
    elif page == "📝 Editor":
        show_editor_page()


def show_home_page():
    st.title("Welcome to Resume Builder")

    st.markdown(
        """
    ### Build professional resumes with ease

    **Features:**
    - 📋 **Profile-based organization** - Create multiple profiles for different job applications
    - 📝 **Intuitive editor** - Easy-to-use form-based editing
    - 👀 **Live preview** - See your changes in real-time
    - 📄 **Export options** - Download as PDF or LaTeX

    ### Getting Started

    1. **Create a Profile** - Go to the Profiles page and create your first profile
    2. **Create a Resume** - Add a new resume under your profile
    3. **Edit & Preview** - Fill in your details and see the live preview
    4. **Download** - Export your finished resume as PDF

    ---

    Select **Profiles** from the sidebar to get started!
    """
    )


def show_profiles_page():
    from pages.profile_select import render_profiles_page

    render_profiles_page()


def show_editor_page():
    from pages.editor import render_editor_page

    render_editor_page()


if __name__ == "__main__":
    main()
