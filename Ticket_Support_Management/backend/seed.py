from app.database import SessionLocal
from app.models import User, UserRole
from app.auth import get_password_hash

def create_admin():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == "admin").first()
        if existing:
            print("Admin user already exists. Deleting old one to recreate...")
            db.delete(existing)
            db.commit()

        admin = User(
            username="admin",
            hashed_password=get_password_hash("admin123"),  # Truncation applied
            full_name="Administrator",
            role=UserRole.ADMIN
        )
        db.add(admin)
        db.commit()
        print("Admin user created successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()