# 🍳 AI Recipe Generator (DeepSeek Edition)

A Node.js application that leverages the DeepSeek API to generate 3 customized gourmet recipes based on available fridge ingredients and user constraints (cuisine, dietary restrictions, max cooking time, servings).

The application features both a **CLI tool** and a **Web UI** with automatic ingredient availability tracking and retry logic for API calls.

---

## 📋 Requirements Checklist Coverage

- [x] **Inputs**: Ingredients list + optional constraints (dietary, cuisine, max cook time, servings).
- [x] **Outputs**: Recipe title, full ingredient list with `[AVAILABLE]` / `[MISSING FROM FRIDGE]` tags, step-by-step instructions, estimated cook time.
- [x] **Resilience**: Transient API error handling with automatic retry logic via `async-retry`.
- [x] **Security**: API keys stored in `.env` and excluded from Git (`.gitignore`).
- [x] **Interfaces**: Command Line Interface (CLI) + Full Web UI.

---

## 🛠 Setup & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher.
- **DeepSeek API Key**: Obtain a key from [platform.deepseek.com](https://platform.deepseek.com).

### Step-by-Step Setup

1. **Clone/Extract the project folder** and open terminal in the root directory.
2. **Install dependencies**:
   ```bash
   npm install