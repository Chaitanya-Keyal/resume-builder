import base64

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from ..models.sections import ResumeData
from ..services.latex_compiler import compile_latex_to_pdf, compile_latex_to_webp
from ..services.template_engine import generate_latex

router = APIRouter()


@router.post("/compile")
async def compile_latex(latex: UploadFile = File(...)):
    try:
        latex_content = await latex.read()
        latex_text = latex_content.decode("utf-8")

        webp_bytes = await compile_latex_to_webp(latex_text)

        return Response(
            content=webp_bytes,
            media_type="image/webp",
            headers={"Content-Disposition": "attachment; filename=preview.webp"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compilation failed: {str(e)}")


@router.post("/generate")
async def generate_pdf(latex: UploadFile = File(...)):
    try:
        latex_content = await latex.read()
        latex_text = latex_content.decode("utf-8")

        pdf_bytes = await compile_latex_to_pdf(latex_text)

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=resume.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


@router.post("/compile-data")
async def compile_from_data(data: ResumeData):
    try:
        latex_text = generate_latex(data)
        webp_bytes = await compile_latex_to_webp(latex_text)

        base64_image = base64.b64encode(webp_bytes).decode("utf-8")

        return {"image": base64_image, "latex": latex_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Compilation failed: {str(e)}")


@router.post("/generate-latex")
async def generate_latex_only(data: ResumeData):
    try:
        latex_text = generate_latex(data)
        return {"latex": latex_text}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"LaTeX generation failed: {str(e)}"
        )
