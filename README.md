# Resume Builder

A streamlined resume builder with Python/Streamlit frontend and FastAPI backend.

## Features

- 📋 **Profile-based organization** - Create multiple profiles for different job applications
- 📝 **Intuitive form editor** - Easy-to-use section-based editing
- 👀 **Live preview** - See your resume rendered in real-time
- 📄 **Export options** - Download as PDF or LaTeX
- 🐳 **Dockerized** - Easy deployment with Docker Compose

## Architecture

```
┌─────────────────────────────────────────┐
│           Streamlit Frontend            │
│              (Port 8501)                │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           FastAPI Backend               │
│              (Port 8000)                │
│   - Profile/Resume CRUD                 │
│   - LaTeX compilation (TeX Live)        │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│             MongoDB                      │
│              (Port 27017)               │
└─────────────────────────────────────────┘
```

## Quick Start with Docker

1. **Start all services:**

   ```bash
   cd python-builder
   docker-compose up --build
   ```

2. **Open the app:**
   - Frontend: <http://localhost:8501>
   - API Docs: <http://localhost:8000/docs>

## Development Setup

### Prerequisites

- Python 3.11+
- MongoDB (running locally or via Docker)
- TeX Live (for LaTeX compilation)
- Ghostscript (for PDF to image conversion)

### Install Dependencies

```bash
# API
pip install -r requirements-api.txt

# Streamlit
pip install -r requirements-streamlit.txt
```

### Run Services

```bash
# Terminal 1: Start MongoDB
docker run -d -p 27017:27017 mongo:7.0

# Terminal 2: Start API
cd python-builder
uvicorn api.main:app --reload --port 8000

# Terminal 3: Start Streamlit
cd python-builder
streamlit run streamlit_app/app.py
```

## Project Structure

```
python-builder/
├── docker-compose.yml      # Docker orchestration
├── Dockerfile.api          # FastAPI container
├── Dockerfile.streamlit    # Streamlit container
├── requirements-api.txt    # Backend dependencies
├── requirements-streamlit.txt # Frontend dependencies
│
├── api/                    # FastAPI Backend
│   ├── main.py             # App entry point
│   ├── config.py           # Settings
│   ├── database.py         # MongoDB connection
│   ├── models/             # Pydantic models
│   ├── routers/            # API endpoints
│   └── services/           # Business logic
│       ├── escape_latex.py # Security
│       ├── template_engine.py # LaTeX generation
│       └── latex_compiler.py  # Compilation
│
├── streamlit_app/          # Streamlit Frontend
│   ├── app.py              # Main entry point
│   ├── config.py           # Frontend config
│   ├── pages/              # Page components
│   ├── components/         # Reusable UI components
│   └── utils/              # Utilities
│
└── tests/                  # Test suite
```

## API Endpoints

### Profiles

- `GET /profiles/` - List all profiles
- `POST /profiles/` - Create profile
- `GET /profiles/{id}` - Get profile
- `PUT /profiles/{id}` - Update profile
- `DELETE /profiles/{id}` - Delete profile

### Resumes

- `GET /resumes/` - List resumes (optional `profile_id` filter)
- `POST /resumes/` - Create resume
- `GET /resumes/{id}` - Get resume
- `PUT /resumes/{id}` - Update resume
- `DELETE /resumes/{id}` - Delete resume

### Compilation

- `POST /compile` - Compile LaTeX file to WebP preview
- `POST /generate` - Compile LaTeX file to PDF
- `POST /compile-data` - Compile resume data to preview + LaTeX
- `POST /generate-latex` - Generate LaTeX from resume data

## Resume Data Structure

```json
{
  "heading": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1 123-456-7890",
    "location": "San Francisco, CA",
    "socials": [
      {"name": "GitHub", "url": "github.com/johndoe"},
      {"name": "LinkedIn", "url": "linkedin.com/in/johndoe"}
    ]
  },
  "education": {
    "section_title": "Education",
    "entries": [...]
  },
  "skills": {
    "section_title": "Skills",
    "entries": [...]
  },
  "experience": {
    "section_title": "Experience",
    "entries": [...]
  },
  "projects": {
    "section_title": "Projects",
    "entries": [...]
  },
  "section_order": ["education", "skills", "experience", "projects"]
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DATABASE_NAME` | `resume_builder` | Database name |
| `API_URL` | `http://localhost:8000` | API URL (for Streamlit) |

## License

MIT
