# backend/routers/emociones_diarias.py
# CREAR ESTE ARCHIVO NUEVO

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List
import jwt

from database import get_db
import models
from mongodb_config import mongodb_service

router = APIRouter()

# Configuración JWT (debe coincidir con main.py)
SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"
ALGORITHM = "HS256"

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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


@router.post("/calcular-emocion-diaria/{paciente_id}")
async def calcular_emocion_diaria(
    paciente_id: int,
    fecha: date,
    db: Session = Depends(get_db)
):
    """
    Calcula el promedio de emociones de un día específico desde MongoDB
    y lo guarda en PostgreSQL
    """
    
    try:
        # Obtener todos los mensajes del día desde MongoDB
        inicio_dia = datetime.combine(fecha, datetime.min.time())
        fin_dia = datetime.combine(fecha, datetime.max.time())
        
        mensajes = list(mongodb_service.emotional_texts.find({
            "user_id": str(paciente_id),
            "timestamp": {
                "$gte": inicio_dia,
                "$lte": fin_dia
            },
            "source": "chat_rasa"
        }))
        
        if not mensajes:
            return {
                "mensaje": "No hay datos para este día",
                "fecha": str(fecha),
                "total_interacciones": 0
            }
        
        # Calcular promedios
        emociones = {
            'alegria': [],
            'alegría': [],  # Con tilde
            'tristeza': [],
            'ansiedad': [],
            'enojo': [],
            'miedo': []
        }
        
        niveles_riesgo = []
        emociones_dominantes = []
        
        for msg in mensajes:
            emotional_analysis = msg.get('emotional_analysis', {})
            emotions = emotional_analysis.get('emotions', {})
            
            # Mapear emoción dominante
            emocion_dom = emotions.get('dominant_emotion', '').lower()
            if emocion_dom:
                emociones_dominantes.append(emocion_dom)
            
            # Obtener scores de cada emoción
            scores = emotions.get('all_emotions', {})
            for emocion_key, valor in scores.items():
                emocion_lower = emocion_key.lower()
                if emocion_lower in emociones:
                    emociones[emocion_lower].append(valor * 10)  # Escala 0-10
            
            # Nivel de riesgo
            risk = emotional_analysis.get('risk_assessment', {})
            risk_score = risk.get('score', 0)
            niveles_riesgo.append(risk_score)
        
        # Calcular promedios (unificar alegria con y sin tilde)
        alegria_valores = emociones['alegria'] + emociones['alegría']
        
        promedios = {
            'alegria_promedio': sum(alegria_valores) / len(alegria_valores) if alegria_valores else 0.0,
            'tristeza_promedio': sum(emociones['tristeza']) / len(emociones['tristeza']) if emociones['tristeza'] else 0.0,
            'ansiedad_promedio': sum(emociones['ansiedad']) / len(emociones['ansiedad']) if emociones['ansiedad'] else 0.0,
            'enojo_promedio': sum(emociones['enojo']) / len(emociones['enojo']) if emociones['enojo'] else 0.0,
            'miedo_promedio': sum(emociones['miedo']) / len(emociones['miedo']) if emociones['miedo'] else 0.0
        }
        
        nivel_riesgo_prom = sum(niveles_riesgo) / len(niveles_riesgo) if niveles_riesgo else 0.0
        
        # Emoción más frecuente
        from collections import Counter
        if emociones_dominantes:
            emocion_dominante = Counter(emociones_dominantes).most_common(1)[0][0]
        else:
            emocion_dominante = 'neutral'
        
        # Verificar si ya existe registro para este día
        registro_existente = db.query(models.EmocionDiaria).filter(
            models.EmocionDiaria.id_usuario == paciente_id,
            models.EmocionDiaria.fecha == fecha
        ).first()
        
        if registro_existente:
            # Actualizar
            registro_existente.alegria_promedio = promedios['alegria_promedio']
            registro_existente.tristeza_promedio = promedios['tristeza_promedio']
            registro_existente.ansiedad_promedio = promedios['ansiedad_promedio']
            registro_existente.enojo_promedio = promedios['enojo_promedio']
            registro_existente.miedo_promedio = promedios['miedo_promedio']
            registro_existente.emocion_dominante = emocion_dominante
            registro_existente.nivel_riesgo_promedio = nivel_riesgo_prom
            registro_existente.total_interacciones = len(mensajes)
            registro_existente.fecha_calculo = datetime.utcnow()
            
            db.commit()
            accion = "actualizado"
        else:
            # Crear nuevo
            nuevo_registro = models.EmocionDiaria(
                id_usuario=paciente_id,
                fecha=fecha,
                alegria_promedio=promedios['alegria_promedio'],
                tristeza_promedio=promedios['tristeza_promedio'],
                ansiedad_promedio=promedios['ansiedad_promedio'],
                enojo_promedio=promedios['enojo_promedio'],
                miedo_promedio=promedios['miedo_promedio'],
                emocion_dominante=emocion_dominante,
                nivel_riesgo_promedio=nivel_riesgo_prom,
                total_interacciones=len(mensajes)
            )
            db.add(nuevo_registro)
            db.commit()
            accion = "creado"
        
        return {
            "mensaje": f"Emoción diaria {accion} exitosamente",
            "fecha": str(fecha),
            "emocion_dominante": emocion_dominante,
            "total_interacciones": len(mensajes),
            "promedios": {k: round(v, 2) for k, v in promedios.items()},
            "nivel_riesgo": round(nivel_riesgo_prom, 2)
        }
    
    except Exception as e:
        print(f"Error calculando emoción diaria: {e}")
        raise HTTPException(status_code=500, detail=f"Error calculando emoción diaria: {str(e)}")


@router.get("/emociones-diarias/{paciente_id}")
async def obtener_emociones_diarias(
    paciente_id: int,
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene las emociones diarias de un paciente
    """
    
    # Verificar permisos
    if current_user.rol == models.UserRole.PSICOLOGO:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == paciente_id,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()
        
        if not asignacion:
            raise HTTPException(status_code=403, detail="Paciente no asignado")
    elif current_user.id_usuario != paciente_id:
        raise HTTPException(status_code=403, detail="Sin permisos")
    
    fecha_inicio = date.today() - timedelta(days=dias)
    
    emociones = db.query(models.EmocionDiaria).filter(
        models.EmocionDiaria.id_usuario == paciente_id,
        models.EmocionDiaria.fecha >= fecha_inicio
    ).order_by(models.EmocionDiaria.fecha.asc()).all()
    
    return {
        "emociones_diarias": [
            {
                "fecha": str(e.fecha),
                "emocion_dominante": e.emocion_dominante,
                "alegria": round(e.alegria_promedio, 2),
                "tristeza": round(e.tristeza_promedio, 2),
                "ansiedad": round(e.ansiedad_promedio, 2),
                "enojo": round(e.enojo_promedio, 2),
                "miedo": round(e.miedo_promedio, 2),
                "nivel_riesgo": round(e.nivel_riesgo_promedio, 2),
                "total_interacciones": e.total_interacciones
            }
            for e in emociones
        ],
        "total_dias": len(emociones)
    }


@router.post("/calcular-emociones-automatico")
async def calcular_emociones_automatico(db: Session = Depends(get_db)):
    """
    Calcula automáticamente las emociones diarias de todos los pacientes
    para el día de ayer (se puede ejecutar con un cron job)
    """
    
    ayer = date.today() - timedelta(days=1)
    
    # Obtener todos los pacientes
    pacientes = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PACIENTE,
        models.Usuario.activo == True
    ).all()
    
    resultados = []
    
    for paciente in pacientes:
        try:
            resultado = await calcular_emocion_diaria(paciente.id_usuario, ayer, db)
            resultados.append({
                "paciente_id": paciente.id_usuario,
                "nombre": f"{paciente.nombre} {paciente.apellido}",
                "resultado": resultado
            })
        except Exception as e:
            resultados.append({
                "paciente_id": paciente.id_usuario,
                "nombre": f"{paciente.nombre} {paciente.apellido}",
                "error": str(e)
            })
    
    return {
        "fecha_calculada": str(ayer),
        "total_pacientes": len(pacientes),
        "resultados": resultados
    }