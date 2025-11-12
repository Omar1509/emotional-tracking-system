# backend/routers/chat_rasa.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import httpx
import os
import jwt
from sqlalchemy.orm import Session

from database import get_db
import models
from mongodb_config import get_database
from nlp_service import nlp_service

router = APIRouter()

# URL de Rasa
RASA_URL = os.getenv("RASA_URL", "http://localhost:5006")

# IMPORTANTE: Debe coincidir EXACTAMENTE con el SECRET_KEY del main.py
SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Obtiene el usuario actual desde el token JWT
    """
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
    
    # Buscar usuario en PostgreSQL
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    
    return user

# ============================================
# MODELOS PYDANTIC
# ============================================

class MensajeChat(BaseModel):
    mensaje: str
    
class RespuestaChat(BaseModel):
    respuesta: str
    respuestas: Optional[List[str]] = None
    emocion_detectada: Optional[str] = None
    intensidad_emocional: Optional[float] = None
    nivel_riesgo: Optional[str] = None
    timestamp: datetime

class HistorialChat(BaseModel):
    mensajes: List[dict]
    total: int

# ============================================
# ENDPOINTS
# ============================================

@router.post("/chat/enviar-mensaje", response_model=RespuestaChat)
async def enviar_mensaje_rasa(
    mensaje: MensajeChat,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)  # ✅ AGREGADO
):
    """
    Envía un mensaje al chatbot de Rasa y guarda la conversación
    """
    # Verificar que sea paciente
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden usar el chat"
        )
    
    if not mensaje.mensaje or len(mensaje.mensaje.strip()) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El mensaje no puede estar vacío"
        )
    
    try:
        sender_id = f"paciente_{current_user.id_usuario}"
        
        print(f"\n{'='*60}")
        print(f"📤 ENVIANDO MENSAJE A RASA")
        print(f"{'='*60}")
        print(f"Usuario: {sender_id}")
        print(f"Mensaje: {mensaje.mensaje}")
        print(f"URL Rasa: {RASA_URL}/webhooks/rest/webhook")
        
        # Enviar mensaje a Rasa
        async with httpx.AsyncClient(timeout=30.0) as client:
            rasa_response = await client.post(
                f"{RASA_URL}/webhooks/rest/webhook",
                json={
                    "sender": sender_id,
                    "message": mensaje.mensaje
                }
            )
        
        print(f"Status Code: {rasa_response.status_code}")
        
        if rasa_response.status_code != 200:
            print(f"❌ Error de Rasa: {rasa_response.text}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"El servicio de chat no está disponible (Status: {rasa_response.status_code}). Verifica que Rasa esté corriendo en {RASA_URL}"
            )
        
        respuestas_rasa = rasa_response.json()
        print(f"Respuestas de Rasa: {respuestas_rasa}")
        
        # Extraer textos de las respuestas
        respuestas_texto = []
        for r in respuestas_rasa:
            if isinstance(r, dict) and r.get("text"):
                respuestas_texto.append(r.get("text"))
        
        respuesta_principal = respuestas_texto[0] if respuestas_texto else "Lo siento, no tengo una respuesta en este momento."
        
        print(f"✅ Respuesta principal: {respuesta_principal[:100]}...")
        
        # Análisis emocional del mensaje del usuario
        analisis = None
        try:
            print(f"🧠 Analizando emoción del mensaje...")
            analisis = nlp_service.comprehensive_analysis(mensaje.mensaje)
            print(f"✅ Análisis completado: {analisis['emotions']['dominant_emotion']} ({analisis['risk_assessment']['level']})")
        except Exception as e:
            print(f"⚠️ Error en análisis NLP: {e}")
            analisis = {
                'sentiment': {'sentiment_score': 0, 'label': 'neutral'},
                'emotions': {
                    'dominant_emotion': 'neutral',
                    'scores': {'neutral': 1.0}
                },
                'risk_assessment': {
                    'level': 'bajo',
                    'score': 0
                }
            }
        
        # Obtener conexión a MongoDB para guardar mensajes
        try:
            mongo_db = get_database()
            
            # Guardar mensaje del usuario en MongoDB
            mongo_db.chat_messages.insert_one({
                "user_id": str(current_user.id_usuario),
                "message": mensaje.mensaje,
                "is_bot": False,
                "timestamp": datetime.utcnow(),
                "emotional_analysis": analisis,
                "sender_name": f"{current_user.nombre} {current_user.apellido}"
            })
            
            # Guardar respuesta(s) del bot en MongoDB
            for resp_texto in respuestas_texto:
                mongo_db.chat_messages.insert_one({
                    "user_id": str(current_user.id_usuario),
                    "message": resp_texto,
                    "is_bot": True,
                    "timestamp": datetime.utcnow()
                })
            
            # Guardar análisis emocional detallado
            mongo_db.emotional_texts.insert_one({
                "user_id": str(current_user.id_usuario),
                "text": mensaje.mensaje,
                "emotional_analysis": analisis,
                "source": "chat_rasa",
                "timestamp": datetime.utcnow()
            })
            
            print(f"💾 Conversación guardada en MongoDB")
            
        except Exception as e:
            print(f"⚠️ Error guardando en MongoDB: {e}")
            # No fallar si MongoDB no está disponible
        
        # ✅ AHORA 'db' ESTÁ DEFINIDO
        # Si hay alto riesgo, crear alerta en PostgreSQL
        if analisis and analisis['risk_assessment']['level'] in ['alto', 'crítico']:
            try:
                # Buscar psicólogo asignado
                asignacion = db.query(models.PacientePsicologo).filter(
                    models.PacientePsicologo.id_paciente == current_user.id_usuario,
                    models.PacientePsicologo.activo == True
                ).first()
                
                if asignacion:
                    # Crear notificación de alerta
                    notificacion = models.Notificacion(
                        id_usuario=asignacion.id_psicologo,
                        tipo=models.NotificationType.ALERTA,
                        titulo=f"🚨 Alerta de Crisis - {analisis['risk_assessment']['level'].upper()}",
                        mensaje=(
                            f"El paciente {current_user.nombre} {current_user.apellido} "
                            f"ha mostrado indicadores de riesgo nivel {analisis['risk_assessment']['level']} en el chat.\n\n"
                            f"Mensaje: {mensaje.mensaje[:200]}{'...' if len(mensaje.mensaje) > 200 else ''}\n\n"
                            f"⚠️ Requiere atención inmediata."
                        ),
                        prioridad="critica" if analisis['risk_assessment']['level'] == 'crítico' else "alta"
                    )
                    db.add(notificacion)
                    db.commit()
                    print(f"🚨 Alerta de crisis enviada al psicólogo {asignacion.id_psicologo}")
            except Exception as e:
                print(f"⚠️ Error creando alerta: {e}")
        
        print(f"{'='*60}\n")
        
        return RespuestaChat(
            respuesta=respuesta_principal,
            respuestas=respuestas_texto,
            emocion_detectada=analisis['emotions']['dominant_emotion'] if analisis else None,
            intensidad_emocional=analisis['risk_assessment']['score'] if analisis else None,
            nivel_riesgo=analisis['risk_assessment']['level'] if analisis else None,
            timestamp=datetime.utcnow()
        )
        
    except httpx.ConnectError as e:
        print(f"❌ Error de conexión con Rasa: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"No se pudo conectar con Rasa en {RASA_URL}. Verifica que esté corriendo con: rasa run --enable-api --cors '*' --port 5006"
        )
    except httpx.TimeoutException:
        print(f"⏱️ Timeout conectando con Rasa")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servidor de chat tardó demasiado en responder"
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error inesperado en chat: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando el mensaje: {str(e)}"
        )


@router.get("/chat/historial", response_model=HistorialChat)
def obtener_historial_chat(
    limit: int = 50,
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene el historial de chat del usuario actual
    """
    # Verificar que sea paciente
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden ver su historial"
        )
    
    try:
        # Obtener conexión a MongoDB
        mongo_db = get_database()
        
        # Obtener mensajes de MongoDB
        mensajes = list(mongo_db.chat_messages.find({
            "user_id": str(current_user.id_usuario)
        }).sort("timestamp", -1).limit(limit))
        
        # Formatear mensajes (del más antiguo al más reciente)
        mensajes_formateados = []
        for msg in reversed(mensajes):
            mensajes_formateados.append({
                "role": "assistant" if msg.get("is_bot") else "user",
                "mensaje": msg.get("message"),
                "timestamp": msg.get("timestamp").isoformat() if msg.get("timestamp") else None,
                "emocion_detectada": (
                    msg.get("emotional_analysis", {}).get("emotions", {}).get("dominant_emotion") 
                    if not msg.get("is_bot") else None
                ),
                "intensidad_emocional": (
                    msg.get("emotional_analysis", {}).get("risk_assessment", {}).get("score") 
                    if not msg.get("is_bot") else None
                )
            })
        
        return HistorialChat(
            mensajes=mensajes_formateados,
            total=len(mensajes_formateados)
        )
    
    except Exception as e:
        print(f"❌ Error obteniendo historial: {e}")
        return HistorialChat(
            mensajes=[],
            total=0
        )


@router.get("/chat/estadisticas")
def obtener_estadisticas_chat(
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Obtiene estadísticas del uso del chat por el paciente
    """
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden ver sus estadísticas"
        )
    
    try:
        mongo_db = get_database()
        
        # Total de mensajes del usuario
        total_mensajes_usuario = mongo_db.chat_messages.count_documents({
            "user_id": str(current_user.id_usuario),
            "is_bot": False
        })
        
        # Total de conversaciones (respuestas del bot)
        total_respuestas_bot = mongo_db.chat_messages.count_documents({
            "user_id": str(current_user.id_usuario),
            "is_bot": True
        })
        
        # Emociones más frecuentes
        pipeline = [
            {
                "$match": {
                    "user_id": str(current_user.id_usuario),
                    "is_bot": False,
                    "emotional_analysis.emotions.dominant_emotion": {"$exists": True}
                }
            },
            {
                "$group": {
                    "_id": "$emotional_analysis.emotions.dominant_emotion",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": 5}
        ]
        
        emociones = list(mongo_db.chat_messages.aggregate(pipeline))
        emociones_formateadas = [
            {"emocion": e["_id"], "cantidad": e["count"]}
            for e in emociones
        ]
        
        return {
            "total_mensajes": total_mensajes_usuario,
            "total_conversaciones": total_respuestas_bot,
            "emociones_frecuentes": emociones_formateadas,
            "promedio_mensajes_por_sesion": (
                total_mensajes_usuario / max(total_respuestas_bot, 1)
            )
        }
    
    except Exception as e:
        print(f"❌ Error obteniendo estadísticas: {e}")
        return {
            "total_mensajes": 0,
            "total_conversaciones": 0,
            "emociones_frecuentes": [],
            "promedio_mensajes_por_sesion": 0
        }


@router.post("/chat/limpiar-historial")
def limpiar_historial_chat(
    current_user: models.Usuario = Depends(get_current_user)
):
    """
    Limpia el historial de chat del usuario (solo para testing)
    """
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden limpiar su historial"
        )
    
    try:
        mongo_db = get_database()
        
        # Eliminar mensajes del chat
        result_chat = mongo_db.chat_messages.delete_many({
            "user_id": str(current_user.id_usuario)
        })
        
        # Eliminar análisis emocionales del chat
        result_emotional = mongo_db.emotional_texts.delete_many({
            "user_id": str(current_user.id_usuario),
            "source": "chat_rasa"
        })
        
        return {
            "mensaje": "Historial limpiado exitosamente",
            "mensajes_eliminados": result_chat.deleted_count,
            "analisis_eliminados": result_emotional.deleted_count
        }
    
    except Exception as e:
        print(f"❌ Error limpiando historial: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error limpiando historial: {str(e)}"
        )


@router.get("/chat/health")
def verificar_estado_chat():
    """
    Verifica el estado del servicio de chat (Rasa)
    """
    try:
        import requests
        response = requests.get(f"{RASA_URL}/", timeout=5)
        
        if response.status_code == 200:
            return {
                "status": "healthy",
                "rasa_url": RASA_URL,
                "rasa_status": "online",
                "message": "El servicio de chat está disponible"
            }
        else:
            return {
                "status": "degraded",
                "rasa_url": RASA_URL,
                "rasa_status": "offline",
                "message": f"Rasa respondió con status {response.status_code}"
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "rasa_url": RASA_URL,
            "rasa_status": "offline",
            "error": str(e),
            "message": f"No se pudo conectar con Rasa en {RASA_URL}"
        }