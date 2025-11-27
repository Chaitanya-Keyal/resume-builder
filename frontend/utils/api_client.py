from typing import Any, Dict, List, Optional

import httpx

from config import API_URL


def get_client() -> httpx.Client:
    return httpx.Client(base_url=API_URL, timeout=60.0)


def list_profiles() -> List[Dict[str, Any]]:
    with get_client() as client:
        response = client.get("/profiles/")
        response.raise_for_status()
        return response.json()


def get_profile(profile_id: str) -> Dict[str, Any]:
    with get_client() as client:
        response = client.get(f"/profiles/{profile_id}")
        response.raise_for_status()
        return response.json()


def create_profile(name: str, description: str = "") -> Dict[str, Any]:
    with get_client() as client:
        response = client.post(
            "/profiles/", json={"name": name, "description": description}
        )
        response.raise_for_status()
        return response.json()


def delete_profile(profile_id: str) -> None:
    with get_client() as client:
        response = client.delete(f"/profiles/{profile_id}")
        response.raise_for_status()


def list_resumes(profile_id: Optional[str] = None) -> List[Dict[str, Any]]:
    params = {}
    if profile_id:
        params["profile_id"] = profile_id

    with get_client() as client:
        response = client.get("/resumes/", params=params)
        response.raise_for_status()
        return response.json()


def get_resume(resume_id: str) -> Dict[str, Any]:
    with get_client() as client:
        response = client.get(f"/resumes/{resume_id}")
        response.raise_for_status()
        return response.json()


def create_resume(
    title: str, profile_id: str, data: Optional[Dict] = None
) -> Dict[str, Any]:
    payload = {"title": title, "profile_id": profile_id}
    if data:
        payload["data"] = data

    with get_client() as client:
        response = client.post("/resumes/", json=payload)
        response.raise_for_status()
        return response.json()


def update_resume(
    resume_id: str, title: Optional[str] = None, data: Optional[Dict] = None
) -> Dict[str, Any]:
    payload = {}
    if title is not None:
        payload["title"] = title
    if data is not None:
        payload["data"] = data

    with get_client() as client:
        response = client.put(f"/resumes/{resume_id}", json=payload)
        response.raise_for_status()
        return response.json()


def delete_resume(resume_id: str) -> None:
    with get_client() as client:
        response = client.delete(f"/resumes/{resume_id}")
        response.raise_for_status()


def compile_resume_data(data: Dict[str, Any]) -> Dict[str, Any]:
    with get_client() as client:
        response = client.post("/compile-data", json=data, timeout=120.0)
        response.raise_for_status()
        return response.json()


def generate_latex(data: Dict[str, Any]) -> str:
    with get_client() as client:
        response = client.post("/generate-latex", json=data)
        response.raise_for_status()
        return response.json()["latex"]


def compile_latex_to_pdf(latex: str) -> bytes:
    with get_client() as client:
        files = {"latex": ("resume.tex", latex.encode(), "text/plain")}
        response = client.post("/generate", files=files, timeout=120.0)
        response.raise_for_status()
        return response.content


def health_check() -> bool:
    try:
        with get_client() as client:
            response = client.get("/health")
            return response.status_code == 200
    except Exception:
        return False
