from app.database import SessionLocal
from app.models import User, UserRole, Ticket
from app.auth import get_password_hash

def change_admin():
    db = SessionLocal()
    try:
        # 1. Find existing admin (any user with role='admin')
        old_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()

        # 2. Get new admin details
        print("\nEnter new admin credentials:")
        username = input("Username: ").strip() or "admin"
        full_name = input("Full Name (optional): ").strip() or username
        password = input("Password: ").strip() or "admin123"

        # 3. Create new admin
        new_admin = User(
            username=username,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            role=UserRole.ADMIN
        )
        db.add(new_admin)
        db.flush()  # assign new_admin.id

        # 4. If old admin exists, reassign their tickets to new admin
        if old_admin:
            old_id = old_admin.id
            new_id = new_admin.id

            # Reassign tickets created by old admin
            db.query(Ticket).filter(Ticket.created_by_id == old_id).update(
                {Ticket.created_by_id: new_id}
            )
            # Reassign tickets assigned to old admin (if any)
            db.query(Ticket).filter(Ticket.assigned_to_id == old_id).update(
                {Ticket.assigned_to_id: new_id}
            )

            # Delete old admin
            db.delete(old_admin)
            print(f"Removed old admin (ID: {old_id}).")

        db.commit()
        print(f"\n✅ Admin user created successfully!")
        print(f"   Username: {username}")
        print(f"   Full Name: {full_name}")
        print(f"   Password: {password}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    change_admin()