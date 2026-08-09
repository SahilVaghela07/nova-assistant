# NOVA — Local AI Assistant

> Built at the **Zero to One Workshop** · August 2026

A private, fully offline AI assistant that runs entirely on your machine. No data ever leaves your computer.

---

## Features (V1)

- 💬 **Text Chat** — Full conversation with local LLM
- 🧠 **Session Memory** — Remembers context within a session
- 🪪 **Custom Identity** — Edit name and personality from the UI
- 🎙️ **Voice Input** — Speak your messages (Web Speech API)
- 🔊 **Voice Output** — NOVA speaks back to you (TTS)
- 💾 **Save Sessions** — Export conversations as `.md` files locally
- 🎨 **Dark UI** — Clean, polished interface

---

## How to Run

### Prerequisites
1. Install [Ollama](https://ollama.com) on your machine
2. Pull the model: `ollama pull llama3.2:3b`
3. Make sure Ollama is running

### Start NOVA

**Terminal 1 — Backend:**
```bash
cd backend
npm install
npm start
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome.

---

## Architecture

```
YOUR MACHINE (100% local)
─────────────────────────
  React Frontend (5173)
        ↕
  Node/Express  (3001)
        ↕
  Ollama Server (11434)
  [llama3.2:3b]
─────────────────────────
Zero data leaves this box.
```

---

## Built by Zero to One
