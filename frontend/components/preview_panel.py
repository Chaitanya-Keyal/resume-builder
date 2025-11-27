import base64

import streamlit as st
from utils.state_manager import get_state


def render_preview_panel():
    st.subheader("👀 Preview")

    preview_image = get_state("preview_image")
    latex_content = get_state("latex_content")

    if preview_image:
        try:
            image_data = base64.b64decode(preview_image)
            st.image(image_data, caption="Resume Preview", use_container_width=True)
        except Exception as e:
            st.error(f"Error displaying preview: {e}")
    else:
        st.info("Click 'Preview' to generate a preview of your resume")
        st.markdown(
            """
        **Tips:**
        - Fill in your information in the sections on the left
        - Click the 'Preview' button to see how your resume will look
        - Download as PDF when you're satisfied
        """
        )

    if latex_content:
        with st.expander("📄 View LaTeX Source"):
            st.code(latex_content, language="latex")
