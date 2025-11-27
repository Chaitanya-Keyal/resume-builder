from typing import Any, Dict

import streamlit as st
from components.education_section import render_education_section
from components.experience_section import render_experience_section
from components.header_section import render_header_section
from components.preview_panel import render_preview_panel
from components.projects_section import render_projects_section
from components.skills_section import render_skills_section
from utils.api_client import (
    compile_latex_to_pdf,
    compile_resume_data,
    generate_latex,
    update_resume,
)
from utils.state_manager import (
    get_default_resume_data,
    get_state,
    mark_clean,
    set_state,
)


def render_editor_page():
    st.title("📝 Resume Editor")

    resume_id = get_state("current_resume_id")
    if not resume_id:
        st.warning("No resume selected. Go to Profiles to create or select a resume.")
        return

    resume_data = get_state("resume_data", get_default_resume_data())

    col_editor, col_preview = st.columns([1, 1])

    with col_editor:
        st.subheader("Edit Resume")

        btn_col1, btn_col2, btn_col3, btn_col4 = st.columns(4)

        with btn_col1:
            if st.button("💾 Save", type="primary"):
                save_resume(resume_id, resume_data)

        with btn_col2:
            if st.button("🔄 Preview"):
                generate_preview(resume_data)

        with btn_col3:
            if st.button("📥 PDF"):
                download_pdf(resume_data)

        with btn_col4:
            if st.button("📄 LaTeX"):
                download_latex(resume_data)

        if get_state("is_dirty", False):
            st.caption("⚠️ Unsaved changes")

        st.markdown("---")

        tab_header, tab_edu, tab_skills, tab_exp, tab_proj = st.tabs(
            ["👤 Header", "🎓 Education", "🛠️ Skills", "💼 Experience", "📁 Projects"]
        )

        with tab_header:
            resume_data["heading"] = render_header_section(
                resume_data.get("heading", {})
            )

        with tab_edu:
            resume_data["education"] = render_education_section(
                resume_data.get("education", {})
            )

        with tab_skills:
            resume_data["skills"] = render_skills_section(resume_data.get("skills", {}))

        with tab_exp:
            resume_data["experience"] = render_experience_section(
                resume_data.get("experience", {})
            )

        with tab_proj:
            resume_data["projects"] = render_projects_section(
                resume_data.get("projects", {})
            )

        set_state("resume_data", resume_data)

    with col_preview:
        render_preview_panel()


def save_resume(resume_id: str, resume_data: Dict[str, Any]):
    try:
        update_resume(resume_id, data=resume_data)
        mark_clean()
        st.success("Resume saved!")
    except Exception as e:
        st.error(f"Error saving: {e}")


def generate_preview(resume_data: Dict[str, Any]):
    try:
        with st.spinner("Generating preview..."):
            result = compile_resume_data(resume_data)
            set_state("preview_image", result["image"])
            set_state("latex_content", result["latex"])
            st.success("Preview updated!")
            st.rerun()
    except Exception as e:
        st.error(f"Error generating preview: {e}")


def download_pdf(resume_data: Dict[str, Any]):
    try:
        with st.spinner("Generating PDF..."):
            latex = generate_latex(resume_data)
            pdf_bytes = compile_latex_to_pdf(latex)

            st.download_button(
                label="⬇️ Download PDF",
                data=pdf_bytes,
                file_name="resume.pdf",
                mime="application/pdf",
            )
    except Exception as e:
        st.error(f"Error generating PDF: {e}")


def download_latex(resume_data: Dict[str, Any]):
    try:
        latex = generate_latex(resume_data)
        set_state("latex_content", latex)

        st.download_button(
            label="⬇️ Download LaTeX",
            data=latex,
            file_name="resume.tex",
            mime="text/plain",
        )
    except Exception as e:
        st.error(f"Error generating LaTeX: {e}")
