"""
Script para inicializar la base de datos PostgreSQL
Ejecutar: python init_database.py
"""

from database import engine, init_db
from models import Base, Usuario, UserRole
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_tables():
    """Crear todas las tablas"""
    print("🔨 Creando tablas en PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente")

def create_default_users():
    """Crear usuarios por defecto para pruebas"""
    print("👤 Creando usuarios por defecto...")
    
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Verificar si ya existen usuarios
        existing = db.query(Usuario).first()
        if existing:
            print("⚠️ Ya existen usuarios en la base de datos")
            return
        
        # Usuario paciente de prueba
        paciente = Usuario(
            email="paciente@test.com",
            nombre="Juan",
            apellido="Pérez",
            password_hash=pwd_context.hash("password123"),
            telefono="+593999999999",
            rol=UserRole.PACIENTE,
            activo=True
        )
        
        # Usuario psicólogo de prueba
        psicologo = Usuario(
            email="psicologo@test.com",
            nombre="María",
            apellido="González",
            password_hash=pwd_context.hash("password123"),
            telefono="+593988888888",
            rol=UserRole.PSICOLOGO,
            activo=True
        )
        
        # Usuario admin
        admin = Usuario(
            email="admin@test.com",
            nombre="Admin",
            apellido="Sistema",
            password_hash=pwd_context.hash("admin123"),
            rol=UserRole.ADMIN,
            activo=True
        )
        
        db.add(paciente)
        db.add(psicologo)
        db.add(admin)
        db.commit()
        
        print("✅ Usuarios creados:")
        print("   📧 paciente@test.com / password123")
        print("   📧 psicologo@test.com / password123")
        print("   📧 admin@test.com / admin123")
        
    except Exception as e:
        print(f"❌ Error al crear usuarios: {e}")
        db.rollback()
    finally:
        db.close()

def verify_connection():
    """Verificar conexión a PostgreSQL"""
    print("🔍 Verificando conexión a PostgreSQL...")
    try:
        connection = engine.connect()
        result = connection.execute("SELECT version();")
        version = result.fetchone()[0]
        print(f"✅ Conectado a: {version}")
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        print("\n💡 Sugerencias:")
        print("   1. Verifica que PostgreSQL esté corriendo")
        print("   2. Verifica las credenciales en database.py")
        print("   3. Verifica que la base de datos 'emotional_tracking_db' exista")
        return False

def main():
    print("=" * 60)
    print("🚀 INICIALIZANDO BASE DE DATOS")
    print("=" * 60)
    print()
    
    # Verificar conexión
    if not verify_connection():
        return
    
    print()
    
    # Crear tablas
    create_tables()
    
    print()
    
    # Crear usuarios por defecto
    create_default_users()
    
    print()
    print("=" * 60)
    print("✅ INICIALIZACIÓN COMPLETADA")
    print("=" * 60)
    print()
    print("🎯 Próximos pasos:")
    print("   1. Inicia el servidor: uvicorn main:app --reload")
    print("   2. Accede a: http://localhost:8000/docs")
    print("   3. Usa las credenciales de prueba para hacer login")
    print()

if __name__ == "__main__":
    main()