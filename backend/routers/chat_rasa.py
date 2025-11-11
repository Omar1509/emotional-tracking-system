from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import List, Optional
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

RASA_URL = os.getenv("RASA_URL", "http://localhost:5005")

# IMPORTANTE: Debe coincidir EXACTAMENTE con el SECRET_KEY del main.py
SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=True)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
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

class MensajeChat(BaseModel):
    mensaje: str
    
class RespuestaChat(BaseModel):
    respuesta: str
    respuestas: Optional[List[str]] = None
    emocion_detectada: Optional[str] = None
    intensidad_emocional: Optional[float] = None
    timestamp: datetime

class HistorialChat(BaseModel):
    mensajes: List[dict]
    total: int

@router.post("/chat/enviar-mensaje", response_model=RespuestaChat)
async def enviar_mensaje_rasa(
    mensaje: MensajeChat,
    current_user: models.Usuario = Depends(get_current_user)
):
    # Verificar que sea paciente
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden usar el chat"
        )
    
    try:
        # Enviar mensaje a Rasa
        async with httpx.AsyncClient(timeout=30.0) as client:
            rasa_response = await client.post(
                f"{RASA_URL}/webhooks/rest/webhook",
                json={
                    "sender": f"paciente_{current_user.id_usuario}",
                    "message": mensaje.mensaje
                }
            )
        
        if rasa_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="El servicio de chat no está disponible. Verifica que Rasa esté corriendo."
            )
        
        respuestas_rasa = rasa_response.json()
        respuestas_texto = [r.get("text", "") for r in respuestas_rasa if r.get("text")]
        respuesta_principal = respuestas_texto[0] if respuestas_texto else "Lo siento, no tengo una respuesta en este momento."
        
        # Análisis emocional del mensaje
        analisis = None
        try:
            analisis = nlp_service.comprehensive_analysis(mensaje.mensaje)
        except Exception as e:
            print(f"Error en análisis NLP: {e}")
            analisis = {
                'sentiment': {'sentiment_score': 0, 'label': 'neutral'},
                'emotions': {'dominant_emotion': 'neutral', 'scores': {}},
                'risk_assessment': {'level': 'bajo', 'score': 0}
            }
        
        # Obtener conexión a MongoDB para guardar mensajes
        mongo_db = get_database()
        
        # Guardar mensaje del usuario en MongoDB
        mongo_db.chat_messages.insert_one({
            "user_id": str(current_user.id_usuario),
            "message": mensaje.mensaje,
            "is_bot": False,
            "timestamp": datetime.utcnow(),
            "emotional_analysis": analisis
        })
        
        # Guardar respuesta del bot en MongoDB
        mongo_db.chat_messages.insert_one({
            "user_id": str(current_user.id_usuario),
            "message": respuesta_principal,
            "is_bot": True,
            "timestamp": datetime.utcnow(),
            "intent": respuestas_rasa[0].get("intent") if respuestas_rasa else None,
            "confidence": respuestas_rasa[0].get("confidence") if respuestas_rasa else None
        })
        
        # Guardar análisis emocional en MongoDB
        mongo_db.emotional_texts.insert_one({
            "user_id": str(current_user.id_usuario),
            "text": mensaje.mensaje,
            "emotional_analysis": analisis,
            "source": "chat_rasa",
            "timestamp": datetime.utcnow()
        })
        
        return RespuestaChat(
            respuesta=respuesta_principal,
            respuestas=respuestas_texto,
            emocion_detectada=analisis['emotions']['dominant_emotion'],
            intensidad_emocional=analisis['risk_assessment']['score'],
            timestamp=datetime.utcnow()
        )
        
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo conectar con Rasa. Verifica que esté corriendo en el puerto 5005."
        )
    except Exception as e:
        print(f"❌ Error en chat: {e}")
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
    # Verificar que sea paciente
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden ver su historial"
        )
    
    # Obtener conexión a MongoDB
    mongo_db = get_database()
    
    # Obtener mensajes de MongoDB
    mensajes = list(mongo_db.chat_messages.find({
        "user_id": str(current_user.id_usuario)
    }).sort("timestamp", -1).limit(limit))
    
    # Formatear mensajes
    mensajes_formateados = []
    for msg in reversed(mensajes):
        mensajes_formateados.append({
            "role": "assistant" if msg.get("is_bot") else "user",
            "mensaje": msg.get("message"),
            "timestamp": msg.get("timestamp").isoformat() if msg.get("timestamp") else None,
            "emocion_detectada": msg.get("emotional_analysis", {}).get("emotions", {}).get("dominant_emotion") if not msg.get("is_bot") else None,
            "intensidad_emocional": msg.get("emotional_analysis", {}).get("risk_assessment", {}).get("score") if not msg.get("is_bot") else None
        })
    
    return HistorialChat(
        mensajes=mensajes_formateados,
        total=len(mensajes_formateados)
    )