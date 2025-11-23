from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from mongodb_config import mongodb_service
from routers import chat_rasa
from datetime import datetime, timedelta, date
from typing import List, Optional, Dict
import jwt
from passlib.context import CryptContext
import re
from pydantic import BaseModel

from database import get_db, engine
import models
import schemas
from nlp_service import nlp_service
from chatbot_service import chatbot_service

models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema de Seguimiento Emocional",
    description="API para seguimiento emocional y apoyo terapéutico",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_rasa.router, prefix="/api", tags=["Chat Rasa"])

# Seguridad
SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)

# ============= PYDANTIC MODELS =============

class RegistroEmocionalCreate(BaseModel):
    nivel_animo: int
    notas: Optional[str] = None
    contexto: Optional[str] = None
    ubicacion: Optional[str] = None
    clima: Optional[str] = None

# ============= UTILIDADES DE PRIVACIDAD =============

def puede_ver_datos_sensibles_paciente(
    usuario_actual: models.Usuario,
    id_paciente: int,
    db: Session
) -> bool:
    if usuario_actual.id_usuario == id_paciente:
        return True
    
    if usuario_actual.rol == models.UserRole.PSICOLOGO:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == id_paciente,
            models.PacientePsicologo.id_psicologo == usuario_actual.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        return asignacion is not None
    
    return False

def sanitizar_datos_paciente(usuario: models.Usuario) -> dict:
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "rol": usuario.rol.value,
        "activo": usuario.activo,
        "fecha_registro": usuario.fecha_registro
    }

def verificar_acceso_datos_sensibles(
    usuario_actual: models.Usuario,
    id_paciente: int,
    db: Session
):
    if not puede_ver_datos_sensibles_paciente(usuario_actual, id_paciente, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para ver información sensible de este paciente."
        )

# ============= UTILIDADES DE AUTENTICACIÓN =============

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def generar_username(primer_nombre: str, primer_apellido: str, segundo_nombre: Optional[str], db: Session) -> str:
    primer_nombre = primer_nombre.strip().lower()
    primer_apellido = primer_apellido.strip().lower()
    segundo_nombre = segundo_nombre.strip().lower() if segundo_nombre else ""
    
    username_base = f"{primer_nombre[0]}{primer_apellido}"
    if segundo_nombre:
        username_base += segundo_nombre[0]
    
    username_base = re.sub(r'[^a-z0-9]', '', username_base)
    
    username = username_base
    counter = 1
    while db.query(models.Usuario).filter(models.Usuario.email == f"{username}@sistema.com").first():
        username = f"{username_base}{counter}"
        counter += 1
    
    return username

def generar_email_sistema(username: str) -> str:
    return f"{username}@sistema.com"

def generar_password_temporal() -> str:
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(12))

# ============= ENDPOINTS DE AUTENTICACIÓN =============

@app.post("/token", response_model=schemas.Token, tags=["Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.email == form_data.username).first()
    
    if not user and '@' not in form_data.username:
        user = db.query(models.Usuario).filter(
            models.Usuario.email == f"{form_data.username}@sistema.com"
        ).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
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
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.rol.value,
        "user_id": user.id_usuario,
        "nombre_completo": f"{user.nombre} {user.apellido}"
    }

# ============= ENDPOINTS DE REGISTROS EMOCIONALES =============

@app.post("/api/registros-emocionales", tags=["Registros Emocionales"])
def crear_registro_emocional(
    registro: RegistroEmocionalCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden registrar emociones"
        )
    
    analisis = None
    if registro.notas:
        try:
            analisis = nlp_service.comprehensive_analysis(registro.notas)
        except Exception as e:
            print(f"Error en análisis NLP: {e}")
    
    nuevo_registro = models.RegistroEmocional(
        id_usuario=current_user.id_usuario,
        nivel_animo=registro.nivel_animo,
        notas=registro.notas,
        contexto=registro.contexto,
        ubicacion=registro.ubicacion,
        clima=registro.clima,
        emocion_principal=analisis['emotions']['dominant_emotion'] if analisis else None,
        intensidad_emocion=analisis['emotions']['scores'].get(analisis['emotions']['dominant_emotion'], 0) if analisis else None,
        sentimiento_score=analisis['sentiment']['sentiment_score'] if analisis else None,
        sentimiento_label=analisis['sentiment']['label'] if analisis else None,
        nivel_riesgo=models.RiskLevel.ALTO if analisis and analisis['risk_assessment']['level'] == 'alto' else models.RiskLevel.BAJO,
        score_riesgo=analisis['risk_assessment']['score'] if analisis else 0,
        alertas_activadas=analisis['risk_assessment']['level'] == 'alto' if analisis else False
    )
    
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    
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
        "id_registro": nuevo_registro.id_registro
    }

@app.get("/api/registros-emocionales", tags=["Registros Emocionales"])
def obtener_registros_emocionales(
    limit: int = 10,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden ver sus registros"
        )
    
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == current_user.id_usuario
    ).order_by(models.RegistroEmocional.fecha_hora.desc()).limit(limit).all()
    
    return registros

@app.get("/api/registros-emocionales/analytics", tags=["Registros Emocionales"])
def obtener_analytics_registros(
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden ver sus analíticas"
        )
    
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)
    
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == current_user.id_usuario,
        models.RegistroEmocional.fecha_hora >= fecha_inicio
    ).all()
    
    if not registros:
        return {
            "total_registros": 0,
            "promedio_animo": 0,
            "tendencia": "estable",
            "emocion_principal": None
        }
    
    promedio_animo = sum(r.nivel_animo for r in registros) / len(registros)
    
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
    
    emociones_count = {}
    for r in registros:
        if r.emocion_principal:
            emociones_count[r.emocion_principal] = emociones_count.get(r.emocion_principal, 0) + 1
    
    emocion_principal = max(emociones_count.items(), key=lambda x: x[1])[0] if emociones_count else None
    
    return {
        "total_registros": len(registros),
        "promedio_animo": round(promedio_animo, 1),
        "tendencia": tendencia,
        "emocion_principal": emocion_principal
    }

# ============= ENDPOINTS DE ADMIN =============

@app.get("/api/admin/psicologos", tags=["Administración"])
def obtener_psicologos(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores"
        )
    
    psicologos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).all()
    
    return {"total": len(psicologos), "psicologos": psicologos}

@app.get("/api/admin/estadisticas", tags=["Administración"])
def obtener_estadisticas_api(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores"
        )
    
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

# ============= ENDPOINTS DE PSICÓLOGOS =============

@app.get("/api/psicologos/mis-pacientes", tags=["Psicólogos"])
def obtener_mis_pacientes_api(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos"
        )
    
    asignaciones = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).all()
    
    pacientes = []
    for asig in asignaciones:
        paciente = asig.paciente
        
        registros_7d = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == paciente.id_usuario,
            models.RegistroEmocional.fecha_hora >= datetime.utcnow() - timedelta(days=7)
        ).all()
        
        prom_animo = sum(r.nivel_animo for r in registros_7d) / len(registros_7d) if registros_7d else 0
        
        alertas = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == paciente.id_usuario,
            models.RegistroEmocional.alertas_activadas == True,
            models.RegistroEmocional.fecha_hora >= datetime.utcnow() - timedelta(days=7)
        ).count()
        
        pacientes.append({
            "id_paciente": paciente.id_usuario,
            "nombre_completo": f"{paciente.nombre} {paciente.apellido}",
            "email": paciente.email,
            "telefono": paciente.telefono,
            "fecha_asignacion": asig.fecha_asignacion,
            "registros_ultima_semana": len(registros_7d),
            "promedio_animo_7dias": round(prom_animo, 2),
            "alertas_activas": alertas
        })
    
    return {"total_pacientes": len(pacientes), "pacientes": pacientes}

# ============= ENDPOINTS DE REGISTRO =============

@app.post("/register/paciente", response_model=schemas.RespuestaRegistro, tags=["Registro"])
def registrar_paciente(
    datos: schemas.RegistroPacienteCompleto,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos"
        )
    
    username = generar_username(datos.primer_nombre, datos.primer_apellido, datos.segundo_nombre, db)
    email = generar_email_sistema(username)
    password_temporal = generar_password_temporal()
    
    nombre_completo = f"{datos.primer_nombre}"
    if datos.segundo_nombre:
        nombre_completo += f" {datos.segundo_nombre}"
    
    apellido_completo = datos.primer_apellido
    if datos.segundo_apellido:
        apellido_completo += f" {datos.segundo_apellido}"
    
    nuevo_paciente = models.Usuario(
        email=email,
        password_hash=get_password_hash(password_temporal),
        nombre=nombre_completo,
        apellido=apellido_completo,
        telefono=datos.telefono,
        fecha_nacimiento=datos.fecha_nacimiento,
        direccion=datos.direccion,
        rol=models.UserRole.PACIENTE,
        activo=True
    )
    
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)
    
    asignacion = models.PacientePsicologo(
        id_paciente=nuevo_paciente.id_usuario,
        id_psicologo=current_user.id_usuario,
        activo=True,
        notas=f"Motivo: {datos.motivo_consulta}"
    )
    db.add(asignacion)
    db.commit()
    
    return {
        "mensaje": "Paciente registrado",
        "usuario": nuevo_paciente,
        "credenciales": {
            "username": username,
            "email": email,
            "password_temporal": password_temporal
        },
        "instrucciones": "Comparte estas credenciales"
    }

@app.post("/register/psicologo", response_model=schemas.RespuestaRegistro, tags=["Registro"])
def registrar_psicologo(
    datos: schemas.RegistroPsicologoCompleto,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores"
        )
    
    if db.query(models.Usuario).filter(models.Usuario.email == datos.email_personal).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email ya registrado"
        )
    
    username = generar_username(datos.primer_nombre, datos.primer_apellido, datos.segundo_nombre, db)
    password_temporal = generar_password_temporal()
    
    nombre_completo = f"{datos.primer_nombre}"
    if datos.segundo_nombre:
        nombre_completo += f" {datos.segundo_nombre}"
    
    apellido_completo = datos.primer_apellido
    if datos.segundo_apellido:
        apellido_completo += f" {datos.segundo_apellido}"
    
    nuevo_psicologo = models.Usuario(
        email=datos.email_personal,
        password_hash=get_password_hash(password_temporal),
        nombre=nombre_completo,
        apellido=apellido_completo,
        telefono=datos.telefono,
        fecha_nacimiento=datos.fecha_nacimiento,
        direccion=datos.direccion,
        rol=models.UserRole.PSICOLOGO,
        activo=True
    )
    
    db.add(nuevo_psicologo)
    db.commit()
    db.refresh(nuevo_psicologo)
    
    return {
        "mensaje": "Psicólogo registrado",
        "usuario": nuevo_psicologo,
        "credenciales": {
            "username": username,
            "email": datos.email_personal,
            "password_temporal": password_temporal
        },
        "instrucciones": "Comparte estas credenciales"
    }

# ============= NUEVOS ENDPOINTS PARA RASA =============

@app.post("/api/chat/guardar-analisis", tags=["Chat"])
async def guardar_analisis_emocional(data: Dict):
    """
    Endpoint para que Rasa guarde análisis emocionales en MongoDB
    """
    try:
        # Guardar en MongoDB
        mongodb_service.save_emotional_text(
            user_id=data.get('paciente_id', 999),
            text=data.get('mensaje', ''),
            emotional_analysis={
                'sentiment': data.get('sentimiento', {}),
                'emotions': {
                    'dominant_emotion': data.get('emocion_principal', 'neutral'),
                    'confidence': data.get('confianza', 0.5),
                    'mixed_emotions': data.get('emociones_mixtas', [])
                },
                'risk_assessment': {
                    'level': data.get('nivel_riesgo', 'bajo'),
                    'score': data.get('score_riesgo', 0.0)
                }
            },
            source=data.get('contexto', 'chat_rasa')
        )
        
        print(f"✅ Análisis guardado en MongoDB para paciente {data.get('paciente_id')}")
        
        return {"status": "success", "message": "Análisis guardado"}
    
    except Exception as e:
        print(f"⚠️ Error guardando análisis: {e}")
        return {"status": "error", "message": str(e)}


@app.post("/api/alertas/crisis", tags=["Alertas"])
async def recibir_alerta_crisis(
    data: Dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Recibe alertas de crisis desde Rasa y notifica al psicólogo
    """
    try:
        paciente_id = data.get('paciente_id')
        nivel = data.get('nivel_crisis', 'alto')
        mensaje = data.get('mensaje', '')
        
        print(f"🚨 ALERTA DE CRISIS RECIBIDA - Paciente {paciente_id} - Nivel: {nivel}")
        
        # Buscar paciente
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == paciente_id
        ).first()
        
        if not paciente:
            print(f"⚠️ Paciente {paciente_id} no encontrado")
            return {"status": "error", "message": "Paciente no encontrado"}
        
        # Buscar psicólogo asignado
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == paciente_id,
            models.PacientePsicologo.activo == True
        ).first()
        
        if asignacion:
            # Crear notificación en PostgreSQL
            notificacion = models.Notificacion(
                id_usuario=asignacion.id_psicologo,
                tipo=models.NotificationType.ALERTA,
                titulo=f"🚨 ALERTA DE CRISIS - NIVEL {nivel.upper()}",
                mensaje=(
                    f"El paciente {paciente.nombre} {paciente.apellido} ha mostrado "
                    f"indicadores de crisis nivel {nivel} en el chat.\n\n"
                    f"Mensaje: {mensaje[:200]}{'...' if len(mensaje) > 200 else ''}\n\n"
                    f"⚠️ SE REQUIERE ATENCIÓN INMEDIATA"
                ),
                prioridad="critica" if nivel == 'crítico' else "alta",
                datos_extra=str(data)
            )
            db.add(notificacion)
            db.commit()
            
            print(f"✅ Notificación de crisis creada para psicólogo {asignacion.id_psicologo}")
            
            # TODO: Enviar notificación push via Firebase
            # background_tasks.add_task(
            #     enviar_push_crisis, 
            #     asignacion.id_psicologo, 
            #     paciente.nombre,
            #     nivel
            # )
        else:
            print(f"⚠️ No se encontró psicólogo asignado para paciente {paciente_id}")
        
        return {
            "status": "success",
            "message": "Alerta procesada",
            "nivel": nivel,
            "paciente": f"{paciente.nombre} {paciente.apellido}",
            "notificacion_creada": asignacion is not None
        }
    
    except Exception as e:
        print(f"❌ Error procesando alerta de crisis: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}


@app.get("/health", tags=["Sistema"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

@app.get("/api/pacientes/{paciente_id}/registros-emocionales", tags=["Pacientes"])
async def obtener_registros_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener registros emocionales de un paciente específico"""
    
    # Verificar que el psicólogo tenga acceso a este paciente
    if current_user.rol == models.UserRole.PSICOLOGO:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == paciente_id,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        
        if not asignacion:
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
                "fecha_hora": r.fecha_hora,
                "nivel_animo": r.nivel_animo,
                "emocion_principal": r.emocion_principal,
                "intensidad_emocion": r.intensidad_emocion,
                "notas": r.notas,
                "nivel_riesgo": r.nivel_riesgo.value if r.nivel_riesgo else None
            }
            for r in registros
        ]
    }
# ==================== ENDPOINT REGISTRAR PACIENTE ====================

@app.post("/api/psicologos/registrar-paciente", tags=["Psicólogos"])
def registrar_paciente_psicologo(
    paciente_data: schemas.PacienteRegistro,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Registra un nuevo paciente y envía credenciales por correo"""
    
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden registrar pacientes")
    
    # Verificar email
    if db.query(models.Usuario).filter(models.Usuario.email == paciente_data.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado")
    
    # Verificar cédula
    if paciente_data.cedula:
        if db.query(models.Usuario).filter(models.Usuario.cedula == paciente_data.cedula).first():
            raise HTTPException(status_code=400, detail="La cédula ya está registrada")
    
    # Importar funciones
    from email_service import send_credentials, generate_temp_password
    import bcrypt
    
    # Generar contraseña temporal
    password_temporal = generate_temp_password(12)
    hashed_password = bcrypt.hashpw(password_temporal.encode('utf-8'), bcrypt.gensalt())
    
    # Construir nombres
    nombre = paciente_data.primer_nombre
    if paciente_data.segundo_nombre:
        nombre += f" {paciente_data.segundo_nombre}"
    
    apellido = paciente_data.primer_apellido
    if paciente_data.segundo_apellido:
        apellido += f" {paciente_data.segundo_apellido}"
    
    # Crear paciente
    nuevo_paciente = models.Usuario(
        email=paciente_data.correo,
        password_hash=hashed_password.decode('utf-8'),
        nombre=nombre,
        apellido=apellido,
        cedula=paciente_data.cedula,
        fecha_nacimiento=paciente_data.fecha_nacimiento,
        telefono=paciente_data.telefono,
        direccion=paciente_data.direccion,
        rol=models.UserRole.PACIENTE,
        debe_cambiar_password=True
    )
    
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)
    
    # Asignar al psicólogo
    asignacion = models.PacientePsicologo(
        id_paciente=nuevo_paciente.id_usuario,
        id_psicologo=current_user.id_usuario,
        activo=True
    )
    db.add(asignacion)
    db.commit()
    
    # Enviar correo
    try:
        send_credentials(
            to_email=nuevo_paciente.email,
            nombre=f"{nombre} {apellido}",
            email_login=nuevo_paciente.email,
            password=password_temporal,
            psicologo=f"{current_user.nombre} {current_user.apellido}"
        )
        print(f"✅ Correo enviado a {nuevo_paciente.email}")
    except Exception as e:
        print(f"⚠️ Error enviando correo: {e}")
    
    return {
        "mensaje": "Paciente registrado exitosamente. Se han enviado las credenciales por correo.",
        "paciente": {
            "id": nuevo_paciente.id_usuario,
            "nombre": f"{nombre} {apellido}",
            "cedula": nuevo_paciente.cedula,
            "email": nuevo_paciente.email,
            "telefono": nuevo_paciente.telefono
        }
    }
# ==================== COPIAR Y PEGAR AL FINAL DE main.py ====================

# HISTORIAL DE CHAT
@app.get("/api/psicologos/paciente/{paciente_id}/historial-chat", tags=["Psicólogos"])
async def obtener_historial_chat(
    paciente_id: int,
    limit: int = 100,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene el historial completo de chat de un paciente"""
    # Verificar que el psicólogo tenga acceso
    if current_user.rol == models.UserRole.PSICOLOGO:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == paciente_id,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este paciente"
            )
    
    # Obtener mensajes del chat
    mensajes = db.query(models.MensajeChat).filter(
        models.MensajeChat.id_usuario == paciente_id
    ).order_by(models.MensajeChat.fecha_hora.desc()).limit(limit).all()
    
    # Intentar obtener desde MongoDB si existe
    try:
        from mongodb_config import mongodb_service
        mensajes_mongo = mongodb_service.get_chat_history(paciente_id, limit=limit)
        
        # Combinar mensajes
        mensajes_combinados = []
        
        for m in mensajes:
            mensajes_combinados.append({
                "id": m.id_mensaje,
                "mensaje": m.mensaje,
                "es_bot": m.es_bot,
                "fecha_hora": m.fecha_hora.isoformat(),
                "emocion_detectada": m.emocion_detectada,
                "sentimiento": m.sentimiento_mensaje,
                "intencion": m.intencion
            })
        
        for m in mensajes_mongo:
            mensajes_combinados.append({
                "id": str(m.get('_id', '')),
                "mensaje": m.get('message', ''),
                "es_bot": m.get('is_bot', False),
                "fecha_hora": m.get('timestamp', datetime.utcnow()).isoformat(),
                "emocion_detectada": m.get('emotional_analysis', {}).get('emotions', {}).get('dominant_emotion'),
                "sentimiento": m.get('emotional_analysis', {}).get('sentiment', {}).get('sentiment_score'),
                "intencion": m.get('intent')
            })
        
        mensajes_combinados.sort(key=lambda x: x['fecha_hora'], reverse=True)
        mensajes_combinados = mensajes_combinados[:limit]
        
    except Exception as e:
        print(f"⚠️ Error obteniendo mensajes de MongoDB: {e}")
        mensajes_combinados = [
            {
                "id": m.id_mensaje,
                "mensaje": m.mensaje,
                "es_bot": m.es_bot,
                "fecha_hora": m.fecha_hora.isoformat(),
                "emocion_detectada": m.emocion_detectada,
                "sentimiento": m.sentimiento_mensaje,
                "intencion": m.intencion
            }
            for m in mensajes
        ]
    
    return {
        "total_mensajes": len(mensajes_combinados),
        "mensajes": mensajes_combinados
    }


# EDITAR PACIENTE
@app.put("/api/psicologos/paciente/{paciente_id}", tags=["Psicólogos"])
async def editar_paciente(
    paciente_id: int,
    paciente_data: schemas.PacienteEditar,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edita la información de un paciente"""
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden editar pacientes")
    
    # Verificar acceso
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    
    # Buscar paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Actualizar campos
    if paciente_data.nombre is not None:
        paciente.nombre = paciente_data.nombre
    if paciente_data.apellido is not None:
        paciente.apellido = paciente_data.apellido
    if paciente_data.cedula is not None:
        # Verificar que no esté en uso
        existente = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="La cédula ya está registrada")
        paciente.cedula = paciente_data.cedula
    if paciente_data.email is not None:
        existente = db.query(models.Usuario).filter(
            models.Usuario.email == paciente_data.email,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if existente:
            raise HTTPException(status_code=400, detail="El email ya está registrado")
        paciente.email = paciente_data.email
    if paciente_data.telefono is not None:
        paciente.telefono = paciente_data.telefono
    if paciente_data.direccion is not None:
        paciente.direccion = paciente_data.direccion
    if paciente_data.fecha_nacimiento is not None:
        paciente.fecha_nacimiento = paciente_data.fecha_nacimiento
    if paciente_data.activo is not None:
        paciente.activo = paciente_data.activo
    
    db.commit()
    db.refresh(paciente)
    
    return {
        "mensaje": "Paciente actualizado exitosamente",
        "paciente": {
            "id": paciente.id_usuario,
            "nombre": paciente.nombre,
            "apellido": paciente.apellido,
            "cedula": paciente.cedula,
            "email": paciente.email,
            "telefono": paciente.telefono
        }
    }


# ELIMINAR PACIENTE
@app.delete("/api/psicologos/paciente/{paciente_id}", tags=["Psicólogos"])
async def eliminar_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Elimina (desactiva) un paciente del sistema"""
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden eliminar pacientes")
    
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="No tienes acceso a este paciente")
    
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Soft delete
    paciente.activo = False
    asignacion.activo = False
    db.commit()
    
    return {
        "mensaje": f"Paciente {paciente.nombre} {paciente.apellido} desactivado exitosamente",
        "paciente_id": paciente_id
    }


# OBTENER CITAS
@app.get("/api/psicologos/mis-citas", tags=["Psicólogos"])
async def obtener_mis_citas(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtiene todas las citas del psicólogo"""
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    citas = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario
    ).order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()
    
    citas_detalladas = []
    for cita in citas:
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == cita.id_paciente
        ).first()
        
        citas_detalladas.append({
            "id_cita": cita.id_cita,
            "fecha": cita.fecha.isoformat() if cita.fecha else None,
            "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
            "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
            "duracion_minutos": cita.duracion_minutos,
            "estado": cita.estado.value,
            "modalidad": cita.modalidad,
            "paciente": {
                "id": cita.id_paciente,
                "nombre": f"{paciente.nombre} {paciente.apellido}" if paciente else "Desconocido",
                "email": paciente.email if paciente else None
            },
            "notas_previas": cita.notas_previas,
            "notas_sesion": cita.notas_sesion,
            "objetivos": cita.objetivos
        })
    
    return {
        "total_citas": len(citas_detalladas),
        "citas": citas_detalladas
    }
# CREAR NUEVA CITA
@app.post("/api/psicologos/citas", tags=["Psicólogos"])
async def crear_cita(
    cita_data: schemas.CitaCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea una nueva cita médica
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden crear citas"
        )
    
    # Verificar que el psicólogo tenga acceso al paciente
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == cita_data.id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Crear la cita
    nueva_cita = models.Cita(
        id_paciente=cita_data.id_paciente,
        id_psicologo=current_user.id_usuario,
        fecha=cita_data.fecha,
        hora_inicio=cita_data.hora_inicio,
        hora_fin=cita_data.hora_fin,
        duracion_minutos=cita_data.duracion_minutos,
        modalidad=cita_data.modalidad,
        url_videollamada=cita_data.url_videollamada,
        notas_previas=cita_data.notas_previas,
        objetivos=cita_data.objetivos,
        estado=models.AppointmentStatus.PROGRAMADA
    )
    
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    
    # Obtener información del paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == cita_data.id_paciente
    ).first()
    
    return {
        "mensaje": "Cita creada exitosamente",
        "cita": {
            "id_cita": nueva_cita.id_cita,
            "fecha": nueva_cita.fecha.isoformat(),
            "hora_inicio": nueva_cita.hora_inicio.isoformat(),
            "paciente": {
                "id": paciente.id_usuario,
                "nombre": f"{paciente.nombre} {paciente.apellido}"
            }
        }
    }


# ACTUALIZAR CITA
@app.put("/api/psicologos/citas/{cita_id}", tags=["Psicólogos"])
async def actualizar_cita(
    cita_id: int,
    cita_data: schemas.CitaUpdate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza una cita existente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden actualizar citas"
        )
    
    # Buscar la cita
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == cita_id,
        models.Cita.id_psicologo == current_user.id_usuario
    ).first()
    
    if not cita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    # Actualizar campos
    if cita_data.fecha is not None:
        cita.fecha = cita_data.fecha
    if cita_data.hora_inicio is not None:
        cita.hora_inicio = cita_data.hora_inicio
    if cita_data.hora_fin is not None:
        cita.hora_fin = cita_data.hora_fin
    if cita_data.estado is not None:
        cita.estado = cita_data.estado
    if cita_data.notas_sesion is not None:
        cita.notas_sesion = cita_data.notas_sesion
    if cita_data.tareas_asignadas is not None:
        cita.tareas_asignadas = cita_data.tareas_asignadas
    if cita_data.modalidad is not None:
        cita.modalidad = cita_data.modalidad
    if cita_data.url_videollamada is not None:
        cita.url_videollamada = cita_data.url_videollamada
    
    cita.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(cita)
    
    return {
        "mensaje": "Cita actualizada exitosamente",
        "cita": {
            "id_cita": cita.id_cita,
            "fecha": cita.fecha.isoformat() if cita.fecha else None,
            "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
            "estado": cita.estado.value
        }
    }


# CANCELAR/ELIMINAR CITA
@app.delete("/api/psicologos/citas/{cita_id}", tags=["Psicólogos"])
async def cancelar_cita(
    cita_id: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancela una cita (cambia estado a cancelada)
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden cancelar citas"
        )
    
    # Buscar la cita
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == cita_id,
        models.Cita.id_psicologo == current_user.id_usuario
    ).first()
    
    if not cita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    # Cambiar estado a cancelada
    cita.estado = models.AppointmentStatus.CANCELADA
    cita.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    
    return {
        "mensaje": "Cita cancelada exitosamente",
        "cita_id": cita_id
    }
@app.get("/api/psicologos/paciente/{paciente_id}/historial-chat", tags=["Psicólogos"])
async def obtener_historial_chat(
    paciente_id: int,
    limit: int = 100,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial completo de chat de un paciente
    """
    # Verificar que el psicólogo tenga acceso
    if current_user.rol == models.UserRole.PSICOLOGO:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == paciente_id,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este paciente"
            )
    
    # Obtener mensajes del chat desde PostgreSQL
    mensajes = db.query(models.MensajeChat).filter(
        models.MensajeChat.id_usuario == paciente_id
    ).order_by(models.MensajeChat.fecha_hora.desc()).limit(limit).all()
    
    # También intentar obtener desde MongoDB si existe
    try:
        from mongodb_config import mongodb_service
        mensajes_mongo = mongodb_service.get_chat_history(paciente_id, limit=limit)
        
        # Combinar mensajes de ambas fuentes
        mensajes_combinados = []
        
        # Agregar mensajes de PostgreSQL
        for m in mensajes:
            mensajes_combinados.append({
                "id": m.id_mensaje,
                "mensaje": m.mensaje,
                "es_bot": m.es_bot,
                "fecha_hora": m.fecha_hora.isoformat(),
                "emocion_detectada": m.emocion_detectada,
                "sentimiento": m.sentimiento_mensaje,
                "intencion": m.intencion
            })
        
        # Agregar mensajes de MongoDB
        for m in mensajes_mongo:
            mensajes_combinados.append({
                "id": str(m.get('_id', '')),
                "mensaje": m.get('message', ''),
                "es_bot": m.get('is_bot', False),
                "fecha_hora": m.get('timestamp', datetime.utcnow()).isoformat(),
                "emocion_detectada": m.get('emotional_analysis', {}).get('emotions', {}).get('dominant_emotion'),
                "sentimiento": m.get('emotional_analysis', {}).get('sentiment', {}).get('sentiment_score'),
                "intencion": m.get('intent')
            })
        
        # Ordenar por fecha
        mensajes_combinados.sort(key=lambda x: x['fecha_hora'], reverse=True)
        mensajes_combinados = mensajes_combinados[:limit]
        
    except Exception as e:
        print(f"⚠️ Error obteniendo mensajes de MongoDB: {e}")
        # Si falla MongoDB, usar solo PostgreSQL
        mensajes_combinados = [
            {
                "id": m.id_mensaje,
                "mensaje": m.mensaje,
                "es_bot": m.es_bot,
                "fecha_hora": m.fecha_hora.isoformat(),
                "emocion_detectada": m.emocion_detectada,
                "sentimiento": m.sentimiento_mensaje,
                "intencion": m.intencion
            }
            for m in mensajes
        ]
    
    return {
        "total_mensajes": len(mensajes_combinados),
        "mensajes": mensajes_combinados
    }


# ==================== EDITAR PACIENTE ====================

@app.put("/api/psicologos/paciente/{paciente_id}", tags=["Psicólogos"])
async def editar_paciente(
    paciente_id: int,
    paciente_data: schemas.PacienteEditar,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Edita la información de un paciente
    """
    # Verificar que sea psicólogo
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden editar pacientes"
        )
    
    # Verificar que el psicólogo tenga acceso
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Buscar paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Actualizar campos si se proporcionan
    if paciente_data.nombre is not None:
        paciente.nombre = paciente_data.nombre
    
    if paciente_data.apellido is not None:
        paciente.apellido = paciente_data.apellido
    
    if paciente_data.cedula is not None:
        # Verificar que la cédula no esté en uso por otro paciente
        existente = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada para otro paciente"
            )
        paciente.cedula = paciente_data.cedula
    
    if paciente_data.email is not None:
        # Verificar que el email no esté en uso
        existente = db.query(models.Usuario).filter(
            models.Usuario.email == paciente_data.email,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email ya está registrado"
            )
        paciente.email = paciente_data.email
    
    if paciente_data.telefono is not None:
        paciente.telefono = paciente_data.telefono
    
    if paciente_data.direccion is not None:
        paciente.direccion = paciente_data.direccion
    
    if paciente_data.fecha_nacimiento is not None:
        paciente.fecha_nacimiento = paciente_data.fecha_nacimiento
    
    if paciente_data.activo is not None:
        paciente.activo = paciente_data.activo
    
    db.commit()
    db.refresh(paciente)
    
    return {
        "mensaje": "Paciente actualizado exitosamente",
        "paciente": {
            "id": paciente.id_usuario,
            "nombre": paciente.nombre,
            "apellido": paciente.apellido,
            "cedula": paciente.cedula,
            "email": paciente.email,
            "telefono": paciente.telefono,
            "direccion": paciente.direccion,
            "activo": paciente.activo
        }
    }


# ==================== ELIMINAR PACIENTE ====================

@app.delete("/api/psicologos/paciente/{paciente_id}", tags=["Psicólogos"])
async def eliminar_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina (desactiva) un paciente del sistema
    """
    # Verificar que sea psicólogo
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden eliminar pacientes"
        )
    
    # Verificar que el psicólogo tenga acceso
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Buscar paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Desactivar paciente (soft delete)
    paciente.activo = False
    
    # Desactivar asignación
    asignacion.activo = False
    
    db.commit()
    
    return {
        "mensaje": f"Paciente {paciente.nombre} {paciente.apellido} desactivado exitosamente",
        "paciente_id": paciente_id
    }


# ==================== OBTENER CITAS DEL PSICÓLOGO ====================

@app.get("/api/psicologos/mis-citas", tags=["Psicólogos"])
async def obtener_mis_citas(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todas las citas del psicólogo autenticado
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden acceder a esta información"
        )
    
    # Obtener citas
    citas = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario
    ).order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()
    
    # Enriquecer con información del paciente
    citas_detalladas = []
    for cita in citas:
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == cita.id_paciente
        ).first()
        
        citas_detalladas.append({
            "id_cita": cita.id_cita,
            "fecha": cita.fecha.isoformat() if cita.fecha else None,
            "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
            "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
            "duracion_minutos": cita.duracion_minutos,
            "estado": cita.estado.value,
            "modalidad": cita.modalidad,
            "paciente": {
                "id": cita.id_paciente,
                "nombre_completo": f"{paciente.nombre} {paciente.apellido}" if paciente else "Desconocido",
                "email": paciente.email if paciente else None
            },
            "notas_previas": cita.notas_previas,
            "notas_sesion": cita.notas_sesion,
            "objetivos": cita.objetivos,
            "tareas_asignadas": cita.tareas_asignadas
        })
    
    return {
        "total_citas": len(citas_detalladas),
        "citas": citas_detalladas
    }
