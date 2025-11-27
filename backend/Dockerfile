FROM python:3.13 AS texlive-base

RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-xetex \
    texlive-latex-recommended \
    latexmk \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

FROM python:3.13

COPY --from=texlive-base /usr/share/texlive /usr/share/texlive
COPY --from=texlive-base /usr/bin/latexmk /usr/bin/latexmk
COPY --from=texlive-base /usr/bin/pdflatex /usr/bin/pdflatex
COPY --from=texlive-base /usr/local/bin /usr/local/bin
COPY --from=texlive-base /usr/lib /usr/lib

WORKDIR /app

COPY requirements-api.txt .

RUN pip install --no-cache-dir -r requirements-api.txt

COPY backend/ ./backend/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
