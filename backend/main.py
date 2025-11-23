# backend/main.py
# ✅ VERSIÓN OPTIMIZADA - SIN DUPLICACIÓN DE CÓDIGO

from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, date
from typing import Optional

# Imports locales
from database import get_db, engine, SessionLocal
import models
import schemas
from dependencies import (
    get_current_user, 
    get_current_paciente, 
    get_current_psicologo,
    get_current_admin,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from routers import chat_rasa, citas, ejercicios, emociones_diarias, psicologos

# Crear tablas
models.Base.metadata.create_all(bind=engine)

# ==================== APLICACIÓN ====================

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
        "http://localhost:5173",
        "https://tu-dominio.com"  # Agregar en producción
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== INCLUIR ROUTERS ====================

app.include_router(chat_rasa.router, prefix="/api", tags=["Chat Rasa"])
app.include_router(citas.router, prefix="/api/citas", tags=["Citas"])
app.include_router(ejercicios.router, prefix="/api/ejercicios", tags=["Ejercicios"])
app.include_router(emociones_diarias.router, prefix="/api/emociones-diarias", tags=["Emociones Diarias"])
app.include_router(psicologos.router, prefix="/api/psicologos", tags=["Psicólogos"])

# ==================== SCHEDULER ====================

scheduler = AsyncIOScheduler()

async def calcular_promedios_automatico():
    """
    Función que se ejecuta automáticamente cada día a las 23:59
    para calcular los promedios emocionales del día
    """
    try:
        print("🔄 Iniciando cálculo automático de promedios emocionales...")
        
        db = SessionLocal()
        
        # Importar función del router
        from routers.emociones_diarias import calcular_emociones_automatico
        
        resultado = await calcular_emociones_automatico(db=db)
        
        db.close()
        print(f"✅ Cálculo completado: {resultado}")
        
    except Exception as e:
        print(f"❌ Error en cálculo automático: {str(e)}")

# Configurar el scheduler
scheduler.add_job(
    calcular_promedios_automatico,
    CronTrigger(hour=23, minute=59),
    id='calculo_promedios_diarios',
    name='Cálculo de promedios emocionales diarios',
    replace_existing=True
)

@app.on_event("startup")
async def startup_event():
    """Iniciar el scheduler al arrancar la aplicación"""
    scheduler.start()
    print("✅ Scheduler iniciado - Cálculo automático programado para las 23:59")

@app.on_event("shutdown")
async def shutdown_event():
    """Detener el scheduler al cerrar la aplicación"""
    scheduler.shutdown()
    print("🛑 Scheduler detenido")

# ==================== AUTENTICACIÓN ====================

@app.post("/token", response_model=schemas.Token, tags=["Autenticación"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    ✅ Login unificado - OAuth2 compatible
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Buscar usuario por email
    user = db.query(models.Usuario).filter(
        models.Usuario.email == form_data.username
    ).first()
    
    # Si no encuentra, intentar con @sistema.com
    if not user and '@' not in form_data.username:
        user = db.query(models.Usuario).filter(
            models.Usuario.email == f"{form_data.username}@sistema.com"
        ).first()
    
    # Verificar credenciales
    if not user or not pwd_context.verify(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verificar que esté activo
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    # Crear token
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
    """
    ✅ Cambia la contraseña del usuario autenticado
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Verificar contraseña actual
    if not pwd_context.verify(password_data.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Validar que sea diferente
    if password_data.password_actual == password_data.password_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual"
        )
    
    # Actualizar contraseña
    current_user.password_hash = pwd_context.hash(password_data.password_nueva)
    current_user.debe_cambiar_password = False
    
    db.commit()
    
    # Enviar notificación por correo
    try:
        from email_service import send_password_changed
        send_password_changed(
            to_email=current_user.email,
            nombre=f"{current_user.nombre} {current_user.apellido}"
        )
    except Exception as e:
        print(f"Error enviando notificación de cambio de contraseña: {e}")
    
    return {
        "mensaje": "Contraseña actualizada exitosamente",
        "requiere_cambio_password": False
    }


@app.post("/api/auth/verificar-token", tags=["Autenticación"])
async def verificar_token(
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    ✅ Verifica si el token es válido y devuelve info del usuario
    """
    return {
        "user_id": current_user.id_usuario,
        "email": current_user.email,
        "nombre": f"{current_user.nombre} {current_user.apellido}",
        "rol": current_user.rol.value,
        "requiere_cambio_password": current_user.debe_cambiar_password
    }


# ==================== REGISTROS EMOCIONALES ====================

@app.post("/api/registros-emocionales", tags=["Registros Emocionales"])
def crear_registro_emocional(
    registro: schemas.RegistroEmocionalCreate,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Crear registro emocional (solo pacientes)
    """
    from nlp_service import nlp_service
    
    # Análisis NLP si hay notas
    analisis = None
    if registro.notas:
        try:
            analisis = nlp_service.comprehensive_analysis(registro.notas)
        except Exception as e:
            print(f"Error en análisis NLP: {e}")
    
    # Crear registro
    nuevo_registro = models.RegistroEmocional(
        id_usuario=current_user.id_usuario,
        nivel_animo=registro.nivel_animo,
        notas=registro.notas,
        contexto=registro.contexto,
        ubicacion=registro.ubicacion,
        clima=registro.clima,
        emocion_principal=analisis['emotions']['dominant_emotion'] if analisis else None,
        intensidad_emocion=analisis['emotions']['confidence'] if analisis else None,
        sentimiento_score=analisis['sentiment']['sentiment_score'] if analisis else None,
        sentimiento_label=analisis['sentiment']['label'] if analisis else None,
        nivel_riesgo=models.RiskLevel.ALTO if analisis and analisis['risk_assessment']['level'] == 'alto' else models.RiskLevel.BAJO,
        score_riesgo=analisis['risk_assessment']['score'] if analisis else 0,
        alertas_activadas=analisis['risk_assessment']['level'] == 'alto' if analisis else False
    )
    
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    
    # Si hay alerta, notificar al psicólogo
    if nuevo_registro.alertas_activadas:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        
        if asignacion:
            notif = models.Notificacion(
                id_usuario=asignacion.id_psicologo,
                tipo=models.NotificationType.ALERTA,
                titulo="⚠️ Alerta: Registro de Alto Riesgo",
                mensaje=f"El paciente {current_user.nombre} {current_user.apellido} ha registrado un estado emocional de alto riesgo.",
                prioridad="alta"
            )
            db.add(notif)
            db.commit()
    
    return {
        "mensaje": "Registro creado exitosamente",
        "id_registro": nuevo_registro.id_registro,
        "nivel_riesgo": nuevo_registro.nivel_riesgo.value if nuevo_registro.nivel_riesgo else None
    }


@app.get("/api/registros-emocionales", tags=["Registros Emocionales"])
def obtener_registros_emocionales(
    limit: int = 10,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener registros emocionales del paciente
    """
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == current_user.id_usuario
    ).order_by(models.RegistroEmocional.fecha_hora.desc()).limit(limit).all()
    
    return {
        "total": len(registros),
        "registros": [
            {
                "id_registro": r.id_registro,
                "fecha_hora": r.fecha_hora.isoformat(),
                "nivel_animo": r.nivel_animo,
                "emocion_principal": r.emocion_principal,
                "notas": r.notas,
                "nivel_riesgo": r.nivel_riesgo.value if r.nivel_riesgo else None
            }
            for r in registros
        ]
    }


@app.get("/api/registros-emocionales/analytics", tags=["Registros Emocionales"])
def obtener_analytics_registros(
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener analytics de registros emocionales
    """
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)
    
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == current_user.id_usuario,
        models.RegistroEmocional.fecha_hora >= fecha_inicio
    ).all()
    
    if not registros:
        return {
            "total_registros": 0,
            "promedio_animo": 0,
            "tendencia": "sin_datos",
            "emocion_principal": None
        }
    
    # Calcular promedio
    promedio_animo = sum(r.nivel_animo for r in registros) / len(registros)
    
    # Calcular tendencia
    fecha_mitad = datetime.utcnow() - timedelta(days=dias//2)
    registros_recientes = [r for r in registros if r.fecha_hora >= fecha_mitad]
    registros_antiguos = [r for r in registros if r.fecha_hora < fecha_mitad]
    
    if registros_recientes and registros_antiguos:
        prom_reciente = sum(r.nivel_animo for r in registros_recientes) / len(registros_recientes)
        prom_antiguo = sum(r.nivel_animo for r in registros_antiguos) / len(registros_antiguos)
        
        if prom_reciente > prom_antiguo + 0.5:
            tendencia = "mejorando"
        elif prom_reciente < prom_antiguo - 0.5:
            tendencia = "empeorando"
        else:
            tendencia = "estable"
    else:
        tendencia = "estable"
    
    # Emoción más frecuente
    emociones_count = {}
    for r in registros:
        if r.emocion_principal:
            emociones_count[r.emocion_principal] = emociones_count.get(r.emocion_principal, 0) + 1
    
    emocion_principal = max(emociones_count.items(), key=lambda x: x[1])[0] if emociones_count else None
    
    return {
        "total_registros": len(registros),
        "promedio_animo": round(promedio_animo, 1),
        "tendencia": tendencia,
        "emocion_principal": emocion_principal,
        "dias_analizados": dias
    }


# ==================== ENDPOINTS DE ADMIN ====================

@app.get("/api/admin/psicologos", tags=["Administración"])
def obtener_psicologos(
    current_user: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener lista de psicólogos (solo admin)
    """
    psicologos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).all()
    
    return {
        "total": len(psicologos),
        "psicologos": [
            {
                "id": p.id_usuario,
                "nombre": f"{p.nombre} {p.apellido}",
                "email": p.email,
                "activo": p.activo,
                "fecha_registro": p.fecha_registro.isoformat()
            }
            for p in psicologos
        ]
    }


@app.get("/api/admin/estadisticas", tags=["Administración"])
def obtener_estadisticas_api(
    current_user: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener estadísticas generales (solo admin)
    """
    total_pacientes = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PACIENTE,
        models.Usuario.activo == True
    ).count()
    
    total_psicologos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO,
        models.Usuario.activo == True
    ).count()
    
    total_registros = db.query(models.RegistroEmocional).count()
    
    return {
        "total_pacientes_activos": total_pacientes,
        "total_psicologos_activos": total_psicologos,
        "total_registros_emocionales": total_registros
    }


# ==================== ENDPOINTS DE PACIENTES (para psicólogos) ====================

@app.get("/api/pacientes/{paciente_id}/registros-emocionales", tags=["Pacientes"])
async def obtener_registros_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener registros emocionales de un paciente (psicólogos)
    """
    from dependencies import verificar_acceso_paciente
    
    # Verificar acceso
    if not verificar_acceso_paciente(current_user, paciente_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener registros
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == paciente_id
    ).order_by(models.RegistroEmocional.fecha_hora.desc()).all()
    
    return {
        "registros": [
            {
                "id_registro": r.id_registro,
                "fecha_hora": r.fecha_hora.isoformat(),
                "nivel_animo": r.nivel_animo,
                "emocion_principal": r.emocion_principal,
                "intensidad_emocion": r.intensidad_emocion,
                "notas": r.notas,
                "nivel_riesgo": r.nivel_riesgo.value if r.nivel_riesgo else None
            }
            for r in registros
        ]
    }


# ==================== HEALTH CHECK ====================

@app.get("/health", tags=["Sistema"])
def health_check():
    """✅ Verificar estado del sistema"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0"
    }


@app.get("/", tags=["Sistema"])
def root():
    """✅ Endpoint raíz"""
    return {
        "message": "Sistema de Seguimiento Emocional API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# ==================== TEST MANUAL DE SCHEDULER ====================

@app.post("/api/test/calcular-promedios-ahora", tags=["Testing"])
async def test_calcular_promedios(
    current_user: models.Usuario = Depends(get_current_admin)
):
    """✅ Ejecuta el cálculo de promedios manualmente (solo admin)"""
    await calcular_promedios_automatico()
    return {"mensaje": "Cálculo ejecutado manualmente"}


# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)