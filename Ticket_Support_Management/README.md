# Ticket Support System

A full‑stack ticket management system with role‑based access control. Built with **FastAPI** (backend) and **React + Vite** (frontend).

## Features

- Three user roles: **Admin**, **Agent**, **Viewer**
- **Ticket creation**, assignment, and status workflow (Open → In Progress → Resolved → Closed)
- **Activity history** with comments for every change
- **Role‑based visibility**: agents see only their assigned tickets, viewers see only tickets they created
- **Admin dashboard** with analytics and insights
- **User management** (create, edit roles, activate/deactivate users) – only for admins
- **Paginated views** for recent activity and all tickets

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy, SQLite, bcrypt
- **Frontend**: React, Vite, Axios, Chart.js, React Router

---

## Getting Started

### Prerequisites

- Python 3.8+ and `pip`
- Node.js 16+ and `npm`

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ticket-support-system.git
cd ticket-support-system
2. Backend Setup
Create and activate a virtual environment
bash
cd backend
python -m venv venv
Windows: venv\Scripts\activate

Mac/Linux: source venv/bin/activate

Install dependencies
bash
pip install -r requirements.txt
Run the FastAPI server
bash
uvicorn main:app --reload
The backend API will be available at http://localhost:8000.
You can test it by visiting http://localhost:8000 – you should see a JSON message.

3. Frontend Setup
Open a new terminal and go to the frontend folder:

bash
cd frontend
npm install
Create a .env file (optional) if you need to change the API URL (default is http://localhost:8000):

env
VITE_API_URL=http://localhost:8000
Run the development server:

bash
npm run dev
The frontend will start on http://localhost:5173.

4. First‑time admin creation
The system doesn’t have any users by default. To create the first admin, you can use the setup-admin endpoint (you need to do this manually or via a script).
Optionally, you can temporarily remove the if current_user.role != ADMIN check in the admin creation endpoint, but it's easier to run a small script.

Alternatively, you can directly insert an admin user into the database using a SQLite browser or a simple Python script (not shown here, but you can do it manually if needed).

For quick testing, you can modify the auth.py endpoint /setup-admin to allow creation even if an admin already exists (but that’s not recommended for production).
Once an admin exists, you can log in and then create other users via the admin panel.

5. Using the application
Log in with the admin credentials you created.

From the sidebar, you can navigate to:

Dashboard: Analytics charts and recent tickets

Tickets: List of tickets with filters, inline assignment/status updates

New Ticket: Only visible to viewers and admins (agents cannot create tickets)

Users: Manage users (admin only)

Insights: Admin‑only page with user activity and full ticket list (paginated)

API Documentation
Once the backend is running, you can view the interactive API docs at:

Swagger UI: http://localhost:8000/docs

ReDoc: http://localhost:8000/redoc

Troubleshooting
CORS issues: The backend is configured to allow requests from http://localhost:5173. If you change the frontend port, update the CORS settings in main.py.

Session cookie not sent: Make sure your browser accepts cookies and that the withCredentials: true setting in frontend/src/services/api.js is present.

404 errors: Ensure both servers are running and that the API base URL is correct.

License
This project is for educational purposes. Feel free to use and modify it.

Happy ticketing! 🚀
