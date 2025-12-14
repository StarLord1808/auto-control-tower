# Autonomous Control Tower - Feature: Intelligence Layer

## Overview
The **Autonomous Control Tower** is an AI-powered logistics platform designed to monitor, analyze, and mitigate supply chain risks in real-time. This branch, `feature/intelligence_layer`, introduces a sophisticated **AI Agentic Layer** that proactively scans for risk events (like port congestion or route delays), analyzes their impact using Large Language Models (LLMs), and autonomously proposes mitigation strategies.

## System Architecture

The system is composed of three main layers:
1.  **Database Layer (PostgreSQL/SQLAlchemy)**: Stores the "Digital Twin" of the supply chain (Shipments, Orders, Inventory, Risks).
2.  **API Layer (Flask)**: Provides RESTful endpoints for the frontend and external integrations to access data.
3.  **Intelligence Layer (Background Worker)**: A Python-based loop that polls for risks and uses LangChain to interact with AI Models (Mistral AI / OpenAI).

---

## 1. Database Schema (`backend/flask-api/db/models.py`)

The database is designed to represent a complete supply chain ecosystem. 

### Core Entities
*   **`Shipment`**: The central entity. Tracks goods moving from Origin to Destination.
    *   *Key Fields*: `status` (in_transit, delayed), `current_location`, `cargo_value_usd`.
    *   *Relationships*: Links to `Customer`, `Carrier`, `RiskEvent`.
*   **`RiskEvent`**: Represents a disruption.
    *   *Key Fields*: `risk_type` (weather, congestion), `severity`, `status` (detected, mitigating).
    *   *Purpose*: The AI Agent listens for these events in the `detected` state.
*   **`Carrier` / `Vessel` / `Port`**: Master data tables defining the physical infrastructure and partners.
*   **`ERPOrder`**: Represents the commercial demand. Linked to shipments to understand business priority.

### AI & Execution Entities
*   **`AgentDecision`**: A log of the AI's "thought process".
    *   *Purpose*: Auditability. Records *why* the AI made a decision, the `confidence_score`, and `reasoning`.
*   **`MitigationAction`**: Concrete steps proposed by the AI to fix a risk.
    *   *Example*: "Reroute via Rail", "Expedite Air Freight".
    *   *Key Fields*: `estimated_cost_usd`, `time_saved_hours`, `probability_success`.

---

## 2. Intelligence Layer (`backend/server/`)

This is the "Brain" of the Control Tower. It operates independently of the user UI, constantly monitoring the database.

### `server.py` - The Agent Loop
This file runs the persistent background process.
*   **`run_agent_loop()`**: The main infinite loop.
*   **Step 1: Poll for Risks**: Queries the DB for `RiskEvent` where `status == 'detected'`.
*   **Step 2: Build Context**: detailed context is gathered for the AI. It's not enough to know "Port Congestion"; the AI needs to know "High Value Cargo for a Platinum Customer is stuck in Port Congestion".
*   **Step 3: Analyze**: Calls `IntelligenceLayer.analyze_risk()`.
*   **Step 4: Decide**: Records the analysis in `AgentDecision`.
*   **Step 5: Mitigate**: Calls `IntelligenceLayer.propose_mitigation()` to generate options and saves them as `MitigationAction`.
*   **Step 6: Update**: Marks the `RiskEvent` as `mitigating` so it isn't processed again.

### `intelligence_layer.py` - The AI Logic
This class handles the interface with LLMs.
*   **`__init__`**:
    *   Tries to load `MISTRAL_API_KEY`. If present, initializes `ChatMistralAI` (cheaper/faster for this task).
    *   Fallbacks to `OPENAI_API_KEY` (`ChatOpenAI`) if Mistral fails or is missing.
    *   This "Waterfall" approach ensures high availability.
*   **`_invoke_llm`**: Wraps API calls in try/catch blocks to ensure the agent doesn't crash on API networking errors.
*   **`_parse_json_response`**: LLMs often output "Chatty" JSON (e.g., wrapped in markdown blocks). This method robustly cleans the string to extract valid JSON data for our database.
*   **`analyze_risk`**:
    *   Uses `RISK_ANALYSIS_SYSTEM_PROMPT` to ask the AI specifically for: Impact Summary, Severity Score, and Confidence.
*   **`propose_mitigation`**:
    *   Uses `MITIGATION_SYSTEM_PROMPT` to ask for structured actions: "Action Type", "Cost", "Time Saved".

### `prompts_constants.py`
Separates the "Prompt Engineering" from the code.
*   **`RISK_ANALYSIS_SYSTEM_PROMPT`**: Instructions telling the AI to act as a "Logistics Control Tower Agent".
*   **`MITIGATION_SYSTEM_PROMPT`**: Instructions telling the AI to act as a "Logistics Planner" and output a JSON list of options.

---

## How to Run

1.  **Environment Setup**:
    Ensure your `.env` file in `backend/flask-api/` has valid API keys:
    ```env
    MISTRAL_API_KEY=...
    OPENAI_API_KEY=...
    DATABASE_URL=...
    ```

2.  **Start the Server**:
    The agent runs as a standalone Python process:
    ```bash
    python3 backend/server/server.py
    ```
    *Output will be logged to `ai_agent_run.txt` or stdout.*

3.  **Verify**:
    Check the `agent_decisions` and `mitigation_actions` tables in the database to see the AI's output.
