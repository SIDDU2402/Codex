# Codex

**A Modern Coding Contest Platform**

---

Codex is a professional, full-stack coding contest platform designed for speed, scale, and reliability. Built with a powerful blend of Docker-based environment orchestration, Gemini API for AI-driven features, robust sandboxing for code execution, and a developer-friendly React+TypeScript frontend, Codex delivers an outstanding experience to both contest creators and participants.

---

## 🚀 Core Features

- **Contest Management:** Create, host, and manage coding contests with live leaderboards, problem authorship, and customizable scoring.
- **AI-Driven Tooling:** Integrated Gemini API for contextual help, problem analysis, and code review features[14][18].
- **Secure Execution Sandbox:** All code submissions run in isolated, resource-restricted sandboxes to ensure security and fairness[7][11].
- **Dockerized Infrastructure:** Every key service is containerized for rapid deployment, scaling, and consistent performance[4][5].
- **Modern UI/UX:** Built with React and TypeScript for a seamless, responsive front-end experience[8][12].
- **Real-Time Feedback:** Immediate compilation, test validation, and scoreboard updates.
- **Multi-Language Support:** Easily configure additional languages and runtime environments.

---

## 🛠️ Tech Stack

| Layer        | Technology                   |
|--------------|-----------------------------|
| Frontend     | React, TypeScript           |
| Backend      | Node.js, Express            |
| AI Integration| Google Gemini API           |
| Sandbox      | Docker, OS-level isolation  |
| Orchestration| Docker Compose              |
| UI Framework | shadcn-ui, Tailwind CSS     |

---

## ⚡ Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/)
- [Git](https://git-scm.com/)
- Google Gemini API Key ([learn more](https://ai.google.dev/))

---

### Installation

### Clone the repository
```bash
git clone https://github.com/SIDDU2402/Codex.git
cd Codex

Set up environment
cp .env.example .env

Edit .env to add your Gemini API key and other settings
Build and start services
docker-compose up --build
```
---

## 🧩 How It Works

- **Containerized Judge:** Submissions spawn new Docker containers, ensuring all code runs in a secure, resource-limited sandbox[5][7][11].
- **Gemini API AI Layer:** Used for code analysis, hints, and review features. Easily customize Gemini API calls for your workflow[14][18].
- **Frontend:** Real-time updates, interactive dashboards, and problem-solving, all via a robust React + TypeScript SPA.

---
## 🙏 Acknowledgments

- Google AI Gemini for advanced AI integration[14][18]
- Docker for sandboxing and orchestration[4][5]
- shadcn-ui & Tailwind CSS for frontend components
- The open-source community

---

## 📬 Contact

For support or feature requests, open an issue or start a discussion on GitHub.

---
