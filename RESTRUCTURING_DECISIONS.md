# Architectural Decision Record: Codebase Restructuring

## 1. Context and Problem Statement
The codebase had organically grown into a fragmented state with inconsistent naming and scattered dependencies.
- **Problem 1 (Naming):** `backend/flask-api` and `backend/flask_api` were two separate directories. This uses both hyphen and underscore naming conventions for essentially the same conceptual component (the API layer). `flask_api` actually contained the *database listener*, which is not an API at all.
- **Problem 2 (Coupling):** The database models (`models.py`) and connection logic (`database.py`) were duplicated or cross-imported in a fragile way between the API and the Listener.
- **Problem 3 (Agent Isolation):** The AI Agent logic was sitting in `backend/server`, generic naming that doesn't describe its specific role as the intelligence layer.
- **Problem 4 (Frontend Naming):** The frontend directory was named `front-end`, which is inconsistent with the common one-word standard `frontend`.

## 2. Restructuring Decisions

### Decision 1: Rename `flask-api` to `backend/api`
- **Reasoning:** `flask-api` ties the directory name to the framework (Flask). If we ever migrate to FastAPI or Django, the name becomes legacy debt. `api` describes *what* the component exposes, not *how* it is built.
- **Benefit:** Framework-agnostic, cleaner URL-style paths.

### Decision 2: Rename `flask_api` to `backend/listener`
- **Reasoning:** The file inside was `listener.py`. It is a background worker that listens for postgres notifications. Calling its parent directory `flask_api` was actively misleading/confusing.
- **Benefit:** `backend/listener` clearly communicates that this component acts as a background service/worker.

### Decision 3: Rename `server` to `backend/agent`
- **Reasoning:** "Server" usually implies an HTTP server. However, this component runs the `IntelligenceLayer` loop. It acts as an **Agent**.
- **Benefit:** Clear semantic distinction. `api` handles HTTP requests; `agent` handles autonomous reasoning.

### Decision 4: Create `backend/shared`
- **Reasoning:** Both the API and the Agent need access to the Database Models (`models.py`) and Configuration (`constants.py`). Previously, these were either duplicated or imported via messy path hacks.
- **Benefit:** A dedicated place for shared code prevents cyclic dependencies and clarifies ownership. `backend/shared/db` becomes the single source of truth for the schema.

### Decision 5: Standardize Frontend to `frontend`
- **Reasoning:** Consistency. `backend` is one word; `frontend` should be one word.
- **Benefit:** Standard industry convention.

## 3. Implementation Details
- **Imports:** All Python files will use absolute imports from the repository root (e.g., `from backend.shared.db.models import Shipment`). This requires running python from the root directory, which is a robust standard practice (Monorepo style).
- **Scripts:** `start_demo.sh` will be updated to act as the single entry point, setting up `PYTHONPATH` correctly.
