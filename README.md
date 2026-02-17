# NextWatch

**NextWatch** is an open-source, self-hosted web application for managing shift work scheduling.

![License](https://img.shields.io/github/license/gungadean/nextwatch)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

## Features
- **Shift Scheduling:** Automated drafting and publishing of schedules.
- **User Management:** Role-based access for Admins and Employees.
- **Self-Hosted:** Full Docker support for easy deployment.

## Quick Start (Docker)

The fastest way to run NextWatch is using Docker Compose.

**1. Clone the repository**
```bash
git clone [https://github.com/gungadean/nextwatch.git](https://github.com/gungadean/nextwatch.git)
cd nextwatch
```

**2. Configure Environment Variables**
NextWatch comes with a template configuration file. Create your local production config by copying the example:
```bash
cp .env.example .env
```
*Optional: Edit `.env` to customize your ports or database settings.*

**3. Start the application**
```bash
docker-compose up -d
```

**4. Access the App**
- **Frontend (App):** http://localhost
- **Backend (API Docs):** http://localhost:8000/docs

## Manual Installation

If you prefer to run the services without Docker, follow these steps.

### Backend
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Configuration
The application uses a generated `config.ini` in the root folder upon first run. There are variables to be configured in the `.env` file created in the Quick Start guide.

## License
Distributed under the GNU General Public License v3.0. See `LICENSE` for more information.