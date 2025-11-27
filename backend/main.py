# backend/main.py
# ✅ VERSIÓN CORREGIDA - Funcional sin errores

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

# ==================== IMPORTACIONES LOCALES ====================
import auth  # ✅ auth está en backend/auth.py (raíz)
from database import get_db, engine, SessionLocal, init_db
import models
import schemas
from routers import admin
from dependencies import (
    get_current_user,
    get_current_paciente,
    get_current_psicologo,
    get_current_admin,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# ==================== CREAR APLICACIÓN ====================

app = FastAPI(
    title="Sistema de Seguimiento Emocional",
    description="API para seguimiento emocional y apoyo terapéutico",
    version="2.0.0"
)

# ==================== CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "https://tu-dominio.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== CREAR TABLAS ====================

try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ Tablas de base de datos verificadas")
except Exception as e:
    print(f"⚠️ Error creando tablas: {e}")

# ==================== ENDPOINTS DE AUTENTICACIÓN ====================
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
@app.post("/token", response_model=schemas.Token, tags=["Autenticación"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """✅ Login con OAuth2"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    user = db.query(models.Usuario).filter(
        models.Usuario.email == form_data.username
    ).first()
    
    if not user and '@' not in form_data.username:
        user = db.query(models.Usuario).filter(
            models.Usuario.email == f"{form_data.username}@sistema.com"
        ).first()
    
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.rol.value,
        "user_id": user.id_usuario,
        "nombre_completo": f"{user.nombre} {user.apellido}",
        "requiere_cambio_password": user.debe_cambiar_password
    }

@app.post("/api/auth/cambiar-password", tags=["Autenticación"])
async def cambiar_password(
    password_data: schemas.CambioPassword,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """✅ Cambiar contraseña"""
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    if not pwd_context.verify(password_data.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    if password_data.password_actual == password_data.password_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente"
        )
    
    current_user.password_hash = pwd_context.hash(password_data.password_nueva)
    current_user.debe_cambiar_password = False
    db.commit()
    
    try:
        from email_service import send_password_changed
        send_password_changed(
            to_email=current_user.email,
            nombre=f"{current_user.nombre} {current_user.apellido}"
        )
    except:
        pass
    
    return {
        "mensaje": "Contraseña actualizada exitosamente",
        "requiere_cambio_password": False
    }

@app.post("/api/auth/verificar-token", tags=["Autenticación"])
async def verificar_token(current_user: models.Usuario = Depends(get_current_user)):
    """✅ Verificar token válido"""
    return {
        "user_id": current_user.id_usuario,
        "email": current_user.email,
        "nombre": f"{current_user.nombre} {current_user.apellido}",
        "rol": current_user.rol.value,
        "requiere_cambio_password": current_user.debe_cambiar_password
    }

# ==================== INCLUIR ROUTERS ====================

# 1. Router de autenticación desde backend/auth.py
print("✅ Router 'auth' cargado desde backend/auth.py")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])

# 2. Routers desde routers/ con importación dinámica
routers_disponibles = ['auth']
routers_faltantes = []

routers_config = [
    ('pacientes', '/api/pacientes', ['pacientes']),
    ('psicologos', '/api/psicologos', ['psicologos']),
    ('admin', '/api/admin', ['admin']),
    ('registros_emocionales', '/api/registros-emocionales', ['registros']),
    ('citas', '/api/citas', ['citas']),
    ('ejercicios', '/api/ejercicios', ['ejercicios']),
    ('chat_rasa', '/api/chat', ['chat']),
]

for router_name, prefix, tags in routers_config:
    try:
        module = __import__(f'routers.{router_name}', fromlist=['router'])
        router = module.router
        app.include_router(router, prefix=prefix, tags=tags)
        routers_disponibles.append(router_name)
        print(f"✅ Router '{router_name}' cargado desde routers/{router_name}.py")
    except ImportError as e:
        routers_faltantes.append(router_name)
        print(f"⚠️  Router '{router_name}' no disponible: {str(e)}")
    except AttributeError:
        routers_faltantes.append(router_name)
        print(f"⚠️  Router '{router_name}' no tiene atributo 'router'")
    except Exception as e:
        routers_faltantes.append(router_name)
        print(f"❌ Error cargando '{router_name}': {str(e)}")

# 3. Scheduler de emociones diarias
try:
    from scheduler_emociones_diarias import iniciar_scheduler, router as emociones_router
    app.include_router(emociones_router, prefix="/api/emociones-diarias", tags=["emociones-diarias"])
    routers_disponibles.append('emociones-diarias')
    print("✅ Scheduler de emociones diarias cargado")
except ImportError:
    print("⚠️  Scheduler de emociones diarias no disponible")
except Exception as e:
    print(f"❌ Error cargando scheduler: {str(e)}")

# ==================== EVENTOS ====================

@app.on_event("startup")
async def startup_event():
    """Inicialización al arrancar"""
    print("\n" + "=" * 60)
    print("🚀 INICIANDO SISTEMA DE SEGUIMIENTO EMOCIONAL")
    print("=" * 60)
    
    try:
        init_db()
        print("✅ Base de datos inicializada")
    except Exception as e:
        print(f"⚠️ Error inicializando BD: {e}")
    
    try:
        from scheduler_emociones_diarias import iniciar_scheduler
        iniciar_scheduler()
        print("✅ Scheduler de emociones diarias iniciado")
    except Exception as e:
        print(f"⚠️ Scheduler no disponible: {e}")
    
    print("\n📊 RESUMEN DE ROUTERS:")
    print(f"  ✅ Disponibles: {len(routers_disponibles)}")
    if routers_disponibles:
        for r in routers_disponibles:
            print(f"     - {r}")
    
    if routers_faltantes:
        print(f"\n  ⚠️  No disponibles: {len(routers_faltantes)}")
        for r in routers_faltantes:
            print(f"     - {r}")
        print(f"\n  ℹ️  Los routers faltantes serán omitidos (no causarán error)")
    
    print("\n✅ Sistema iniciado correctamente")
    print("📚 Documentación disponible en: http://127.0.0.1:8000/docs")
    print("=" * 60 + "\n")

@app.on_event("shutdown")
async def shutdown_event():
    """Cierre de la aplicación"""
    print("\n🛑 Cerrando Sistema de Seguimiento Emocional...")

# ==================== ENDPOINTS DE INFORMACIÓN ====================

@app.get("/")
async def root():
    """Endpoint raíz"""
    return {
        "mensaje": "Sistema de Seguimiento Emocional API",
        "version": "2.0.0",
        "estado": "activo",
        "routers_disponibles": len(routers_disponibles),
        "documentacion": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check del sistema"""
    return {
        "status": "healthy",
        "routers_disponibles": routers_disponibles,
        "routers_faltantes": routers_faltantes,
        "total_routers": len(routers_disponibles)
    }

@app.get("/api")
async def api_info():
    """Información de la API"""
    return {
        "nombre": "Sistema de Seguimiento Emocional",
        "version": "2.0.0",
        "endpoints_disponibles": {
            "auth": "/api/auth (login, cambiar-password, verificar-token)",
            "usuarios": "/api/usuarios" if 'usuarios' in routers_disponibles else "No disponible",
            "pacientes": "/api/pacientes" if 'pacientes' in routers_disponibles else "No disponible",
            "psicologos": "/api/psicologos" if 'psicologos' in routers_disponibles else "No disponible",
            "chat": "/api/chat" if 'chat_rasa' in routers_disponibles else "No disponible",
            "citas": "/api/citas" if 'citas' in routers_disponibles else "No disponible",
            "ejercicios": "/api/ejercicios" if 'ejercicios' in routers_disponibles else "No disponible",
            "emociones": "/api/emociones-diarias" if 'emociones-diarias' in routers_disponibles else "No disponible",
        },
        "documentacion": "/docs"
    }

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)