# Tech AI — Student Workspace & Form Assistant

An intelligent, multi-module student productivity and learning assistance platform featuring dynamic AI form filling, study material analysis, interactive document processing, equation graphing, and auto quiz generation.

## 🚀 Key Features

- **Form Assistant (Dynamic Analysis)**: Upload forms (PDF, images, documents) or provide public form URLs. Tech AI scans fields, maps profile data, and generates a structured answer review sheet.
- **AI Teacher**: Learn from your uploaded notes, lecture slides, or study documents. Ask questions in text or voice and get grounded explanations in multiple languages.
- **Smart Doc Scanner**: Process documents or photos with perspective/contrast adjustments, preview side-by-side, and export cleanly formatted copies.
- **Equation Grapher & Math OCR**: Transcribe formulas from images/PDFs and plot functions interactively.
- **Auto Quiz & Exam Practice**: Extract quiz questions from documents or URLs, practice in timed tests or auto-solve mode with instant feedback.
- **Student Profile**: Maintain your student profile to automatically pre-fill scholarships, college forms, and admission applications.

---

## 🛠️ Tech Stack & Workspace Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, PDF.js, PDF-lib, Mathjs
- **API Server**: Express 5, Node.js, Pino logger, Multer file upload handler
- **AI Engine**: Google Gemini API (`@google/genai`)
- **Package Manager**: pnpm workspaces

### Directory Structure

```text
├── artifacts/
│   ├── api-server/         # Express backend server (Port 5000)
│   ├── tech-ai/            # Main React + Vite student application (Port 5173)
│   └── mockup-sandbox/     # Component design preview sandbox
├── lib/
│   ├── api-client-react/   # Generated React Query hooks & Custom Fetch
│   ├── api-spec/           # OpenAPI 3.0 specification & codegen
│   ├── api-zod/            # Zod validation schemas
│   └── db/                 # Database schema and client
├── scripts/                # Utility scripts
└── package.json            # Root workspace scripts
```

---

## 💻 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables (Optional)

Create a `.env` file in the root or set in your environment:

```env
# Server Port (defaults to 5000)
PORT=5000

# Session Secret (optional, dev fallback provided)
SESSION_SECRET=your-secret-session-key

# Gemini API Key (required for AI features)
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL connection string (optional; runs in guest mode without DB)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tech_ai
```

### 3. Run Development Servers

Run both Backend and Frontend simultaneously:

```bash
pnpm run dev
```

Or run them individually:

- **Backend API Server**:
  ```bash
  pnpm run dev:api
  ```
- **Frontend App**:
  ```bash
  pnpm run dev:client
  ```

Open your browser at `http://localhost:5173/`.

### 4. Build for Production

```bash
pnpm run build
```
