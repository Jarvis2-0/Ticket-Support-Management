from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, users, tickets, analytics, admin

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ticket Support System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(tickets.router)
app.include_router(analytics.router)

@app.get("/")
def root():
    return {"message": "Support Ticket API Running"}