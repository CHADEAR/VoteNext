# VoteNext
### Real-time Digital Voting System

VoteNext is a digital voting platform designed with a focus on speed, precision, and real-time result visualization. The system is built using a **Decoupled Architecture** to ensure high scalability, ease of maintenance, and independent service management.

---

## 📋 Prerequisites

To ensure the system operates correctly, please verify that your environment meets the following requirements:

* **Node.js**: Version 18.x LTS or higher is recommended.
* **Docker & Docker Compose**: Required for managing core services and databases.
* **Package Manager**: `npm` or `yarn`.

---

## 🚀 Getting Started

### 1. Development Mode
Follow these steps to set up the system locally for coding and testing purposes.

**Infrastructure Setup (Docker):**
Start the database and necessary background services using the development compose file:
```bash
docker-compose -f docker-compose.dev.yml up -d
Backend Services Setup:
Navigate to the server directory to install dependencies and start the API:

Bash
cd vote_next_server
npm install
npm run dev
Frontend Application Setup:
Navigate to the client directory to install dependencies and launch the user interface:

Bash
cd vote_next_client
npm install
npm run dev
