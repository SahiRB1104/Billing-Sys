# Phase 02 — Backend Foundation

## Goal

Create the minimal FastAPI backend and Python virtual environment.

Do NOT implement:

* Database models
* Authentication
* Products
* Billing
* Stock
* Printing

Those belong to later phases.

---

# 1. Backend Folder

Create:

```text
backend/
```

Inside it:

```text
backend/
├── venv/
├── app/
│   └── main.py
├── requirements.txt
└── .env
```

The `venv/` directory must not be committed.

---

# 2. Create Python Virtual Environment

From the project root:

```bash
cd backend
python -m venv venv
```

Activate it on Linux:

```bash
source venv/bin/activate
```

Verify:

```bash
which python
```

It should point to the project's:

```text
backend/venv/bin/python
```

---

# 3. Install Dependencies

Upgrade pip:

```bash
python -m pip install --upgrade pip
```

Install only the dependencies required for the current and upcoming backend:

```bash
pip install fastapi uvicorn sqlalchemy pydantic-settings
```

Do NOT install database-specific packages yet unless required.

Save dependencies:

```bash
pip freeze > requirements.txt
```

---

# 4. FastAPI Application

Create:

```text
backend/app/main.py
```

Create a minimal FastAPI application.

Required endpoint:

```text
GET /
```

Response:

```json
{
  "message": "Store POS API running"
}
```

---

# 5. Run Backend

From the `backend` directory with the virtual environment activated:

```bash
uvicorn app.main:app --reload
```

The backend should run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation should be available at:

```text
http://127.0.0.1:8000/docs
```

---

# 6. Environment File

Create:

```text
backend/.env
```

Do not commit `.env`.

Add:

```text
.env
venv/
__pycache__/
```

to `.gitignore`.

No database configuration is required yet.

---

# 7. Code Requirements

Keep the backend extremely simple.

Do not create unnecessary:

* services
* repositories
* interfaces
* dependency containers
* utility classes
* configuration systems

Only create what is required.

---

# Definition of Done

Phase 2 is complete when:

* `backend/` exists.
* Python virtual environment exists.
* Virtual environment is activated correctly.
* FastAPI is installed.
* Uvicorn is installed.
* SQLAlchemy is installed.
* FastAPI starts successfully.
* `/` returns the expected response.
* `/docs` works.
* `requirements.txt` exists.
* `.env` is ignored.
* `venv/` is ignored.

STOP HERE.

Do not start Phase 3 automatically.
