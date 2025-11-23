from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# PostgreSQL Database URL
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/emotional_tracking_db"
)

# Configuración del engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,  # Verifica la conexión antes de usarla
    pool_size=10,  # Tamaño del pool de conexiones
    max_overflow=20,  # Conexiones adicionales permitidas
    echo=False  # Cambiar a True para ver SQL queries
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Crea todas las tablas en la base de datos"""
    import models
    Base.metadata.create_all(bind=engine)
    print("✅ Tablas creadas exitosamente")

def drop_db():
    """Elimina todas las tablas (usar con cuidado)"""
    import models
    Base.metadata.drop_all(bind=engine)
    print("⚠️ Todas las tablas han sido eliminadas")

def get_mongo_db():
    """Dependency para obtener la base de datos MongoDB"""
    from mongodb_config import mongodb_service
    return mongodb_service.db