# NextWatch

**NextWatch** is an open-source, self-hosted web application for managing shift work scheduling.

![License](https://img.shields.io/github/license/gungadean/nextwatch)
![Version](https://img.shields.io/badge/version-0.3.0-blue)

## Features
- **Shift Scheduling:** Automated background drafting and publishing of schedules using an advanced Simulated Annealing optimizer with global real-time progress tracking.
- **Draft Tweaking:** Fine-tune generated schedules using Frozen Assignments and smart auto-assign features.
- **Schedule Templating:** Quickly generate schedules using customizable baseline templates.
- **User Management:** Role-based access for Admins and Employees with integrated time-off requests.
- **Self-Hosted:** Full Docker support for easy deployment.

## Quick Start (Docker)

The fastest way to run NextWatch is using Docker Compose.

**1. Clone the repository**
```bash
git clone [https://github.com/gungadean/nextwatch.git](https://github.com/gungadean/nextwatch.git)
cd nextwatch
```

**2. Generate Secret Keys**
To ensure your authentication system is secure, you must generate unique, random keys for the `SECRET_ACCESS` and `SECRET_REFRESH` variables in your `.env` file.

You can generate secure 64-character hex strings on Linux or macOS using `openssl`. Run the following command in your terminal twice (once for each key):
```bash
openssl rand -hex 32
```

If you're on Windows or do not have `openssl` installed, you can use Docker to generate the keys using the following command:
```bash
docker run --rm alpine/openssl rand -hex 32
```

**3. Configure Environment Variables**
NextWatch comes with a template configuration file. Create your local production config by copying the example:
```bash
cp backend/.env.example backend/.env
```
*(Make sure to open your new `backend/.env` file and paste in the secret keys you generated in step 2!)*

**4. Start the application**
```bash
docker-compose up -d
```

**5. Access the App**
- **Frontend (App):** http://localhost
- **Backend (API Docs):** http://localhost:8000/docs

## Manual Installation

If you prefer to run the services without Docker, follow these steps.

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the database migrations:
   ```bash
   alembic upgrade head
   ```
5. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Configuration
All backend application configuration is securely handled via the `backend/.env` file. This file controls your database connection string, JWT security tokens, CORS settings, and host configuration. See `backend/.env.example` for all available options.

## License
Distributed under the GNU General Public License v3.0. See `LICENSE` for more information.