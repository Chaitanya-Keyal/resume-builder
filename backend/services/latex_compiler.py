import asyncio
import os
import shutil
import subprocess
import tempfile
from typing import Optional

from PIL import Image

from ..config import get_settings

settings = get_settings()
TEMP_DIR = settings.temp_dir
TIMEOUT = settings.latex_timeout

os.makedirs(TEMP_DIR, exist_ok=True)


async def compile_latex_to_webp(latex_text: str, dpi: int = 150) -> bytes:
    work_dir = tempfile.mkdtemp(dir=TEMP_DIR)

    try:
        pdf_path = await _compile_to_pdf(latex_text, work_dir)
        webp_path = os.path.join(work_dir, "resume.webp")
        await _pdf_to_webp(pdf_path, webp_path, dpi)

        with open(webp_path, "rb") as f:
            return f.read()
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


async def compile_latex_to_pdf(latex_text: str) -> bytes:
    work_dir = tempfile.mkdtemp(dir=TEMP_DIR)

    try:
        pdf_path = await _compile_to_pdf(latex_text, work_dir)

        with open(pdf_path, "rb") as f:
            return f.read()
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)


async def _compile_to_pdf(latex_text: str, work_dir: str) -> str:
    tex_path = os.path.join(work_dir, "resume.tex")
    pdf_path = os.path.join(work_dir, "resume.pdf")

    with open(tex_path, "w", encoding="utf-8") as f:
        f.write(latex_text)

    error_output = ""
    for compiler in ["pdflatex", "xelatex"]:
        # Run twice to resolve references
        for _ in range(2):
            try:
                process = await asyncio.create_subprocess_exec(
                    compiler,
                    "-interaction=nonstopmode",
                    "-output-directory",
                    work_dir,
                    tex_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=TIMEOUT
                )

                error_output = stderr.decode("utf-8", errors="ignore")

            except asyncio.TimeoutError:
                raise Exception(f"Compilation timed out after {TIMEOUT} seconds")
            except FileNotFoundError:
                break

        if os.path.exists(pdf_path):
            return pdf_path

    log_path = os.path.join(work_dir, "resume.log")
    log_content = ""
    if os.path.exists(log_path):
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
            log_content = "".join(lines[-50:])

    raise Exception(
        f"PDF compilation failed.\nError: {error_output}\nLog:\n{log_content}"
    )


async def _pdf_to_webp(pdf_path: str, output_path: str, dpi: int = 150) -> str:
    png_path = output_path.replace(".webp", ".png")

    try:
        process = await asyncio.create_subprocess_exec(
            "gs",
            "-dNOPAUSE",
            "-dBATCH",
            "-dSAFER",
            "-sDEVICE=png16m",
            f"-r{dpi}",
            "-dFirstPage=1",
            "-dLastPage=1",
            f"-sOutputFile={png_path}",
            pdf_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await asyncio.wait_for(process.communicate(), timeout=30)

    except asyncio.TimeoutError:
        raise Exception("PDF to PNG conversion timed out")
    except FileNotFoundError:
        raise Exception("Ghostscript (gs) not found. Please install ghostscript.")

    if not os.path.exists(png_path):
        raise Exception("Failed to convert PDF to PNG")

    try:
        with Image.open(png_path) as img:
            img.save(output_path, "WEBP", quality=85)
    finally:
        if os.path.exists(png_path):
            os.remove(png_path)

    return output_path


def get_latex_version() -> Optional[str]:
    try:
        result = subprocess.run(
            ["pdflatex", "--version"], capture_output=True, timeout=5
        )
        return result.stdout.decode("utf-8", errors="ignore").split("\n")[0]
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
