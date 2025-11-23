# backend/routers/chat_rasa.py
# ✅ VERSIÓN OPTIMIZADA

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import httpx
import logging
from typing import Optional, Dict
from pydantic import BaseModel

from database import get_db
from dependencies import get_current_user, get_current_paciente
from mongodb_config import mongodb_service
import models

router = APIRouter()
logger = logging.getLogger(__name__)

RASA_URL = "http://localhost:5005/webhooks/rest/webhook"

# ==================== SCHEMAS ====================

class RasaMessage(BaseModel):
    mensaje: str


class RasaResponse(BaseModel):
    respuesta: str
    emocion_detectada: Optional[str] = None
    confianza: Optional[float] = None
    timestamp: str
    metadata: Optional[Dict] = None


# ==================== ENDPOINTS ====================

@router.post("/chat", response_model=Dict)
async def enviar_mensaje_chatbot(
    mensaje: RasaMessage,
    current_user: models.Usuario = Depends(get_current_paciente),  # ✅ Solo pacientes
    db: Session = Depends(get_db)
):
    """
    Envía un mensaje al chatbot Rasa y guarda la conversación en MongoDB
    ✅ Solo pacientes pueden acceder
    """
    try:
        # Preparar el mensaje para Rasa
        rasa_payload = {
            "sender": str(current_user.id_usuario),
            "message": mensaje.mensaje
        }
        
        # Enviar mensaje a Rasa (con fallback)
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(RASA_URL, json=rasa_payload)
                response.raise_for_status()
                rasa_response = response.json()
        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            logger.error(f"Error conectando con Rasa: {str(e)}")
            # Respuesta de fallback
            rasa_response = [{
                "text": "Lo siento, el servicio de chatbot no está disponible en este momento. Por favor, intenta más tarde.",
                "custom": {
                    "emocion_detectada": "neutral",
                    "confianza": 0.5
                }
            }]
        
        # Extraer información de la respuesta
        respuesta_bot = ""
        emocion_detectada = None
        confianza_emocion = None
        metadata = {}
        
        if rasa_response and len(rasa_response) > 0:
            primera_respuesta = rasa_response[0]
            respuesta_bot = primera_respuesta.get("text", "")
            
            # Extraer metadata si existe
            if "custom" in primera_respuesta:
                custom_data = primera_respuesta["custom"]
                emocion_detectada = custom_data.get("emocion_detectada")
                confianza_emocion = custom_data.get("confianza")
                metadata = custom_data
        
        # Guardar en MongoDB
        timestamp_actual = datetime.utcnow()
        
        try:
            # Mensaje del usuario
            mongodb_service.chat_logs.insert_one({
                "user_id": str(current_user.id_usuario),
                "nombre_usuario": f"{current_user.nombre} {current_user.apellido}",
                "message": mensaje.mensaje,
                "is_bot": False,
                "timestamp": timestamp_actual,
                "emocion_detectada": emocion_detectada,
                "confianza_emocion": confianza_emocion,
                "source": "chat_rasa"
            })
            
            # Respuesta del bot
            mongodb_service.chat_logs.insert_one({
                "user_id": str(current_user.id_usuario),
                "nombre_usuario": f"{current_user.nombre} {current_user.apellido}",
                "message": respuesta_bot,
                "is_bot": True,
                "timestamp": timestamp_actual,
                "metadata": metadata,
                "source": "chat_rasa"
            })
            
            # Guardar análisis emocional si existe
            if emocion_detectada:
                mongodb_service.emotional_texts.insert_one({
                    "user_id": str(current_user.id_usuario),
                    "text": mensaje.mensaje,
                    "source": "chat_rasa",
                    "emotional_analysis": {
                        "emotions": {
                            "dominant_emotion": emocion_detectada,
                            "confidence": confianza_emocion
                        }
                    },
                    "timestamp": timestamp_actual
                })
            
            logger.info(f"✅ Conversación guardada en MongoDB para usuario {current_user.id_usuario}")
            
        except Exception as mongo_error:
            logger.error(f"❌ Error al guardar en MongoDB: {str(mongo_error)}")
            # No fallar la petición si MongoDB falla
        
        # Construir respuesta
        return {
            "respuesta": respuesta_bot,
            "emocion_detectada": emocion_detectada,
            "confianza": confianza_emocion,
            "timestamp": timestamp_actual.isoformat(),
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"❌ Error en chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al procesar mensaje: {str(e)}"
        )


@router.get("/historial")
async def obtener_historial_chat(
    limite: int = 50,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    Obtiene el historial de conversaciones del paciente
    ✅ Solo pacientes pueden ver su historial
    """
    try:
        # Obtener conversaciones desde MongoDB
        conversaciones = list(mongodb_service.chat_logs.find(
            {"user_id": str(current_user.id_usuario)}
        ).sort("timestamp", -1).limit(limite))
        
        # Formatear respuesta
        historial = []
        for conv in conversaciones:
            historial.append({
                "mensaje": conv.get("message"),
                "es_bot": conv.get("is_bot", False),
                "timestamp": conv.get("timestamp").isoformat() if conv.get("timestamp") else None,
                "emocion_detectada": conv.get("emocion_detectada"),
                "confianza_emocion": conv.get("confianza_emocion")
            })
        
        return {
            "total_mensajes": len(historial),
            "historial": list(reversed(historial))  # Más antiguo primero
        }
        
    except Exception as e:
        logger.error(f"❌ Error al obtener historial: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener historial: {str(e)}"
        )


@router.delete("/historial")
async def limpiar_historial_chat(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    Limpia el historial de conversaciones del paciente
    ✅ Solo pacientes pueden limpiar su historial
    """
    try:
        # Eliminar conversaciones de MongoDB
        resultado = mongodb_service.chat_logs.delete_many({
            "user_id": str(current_user.id_usuario)
        })
        
        return {
            "mensaje": "Historial eliminado exitosamente",
            "mensajes_eliminados": resultado.deleted_count
        }
        
    except Exception as e:
        logger.error(f"❌ Error al limpiar historial: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al limpiar historial: {str(e)}"
        )


@router.get("/estadisticas-emociones")
async def obtener_estadisticas_emociones(
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    Obtiene estadísticas de emociones detectadas en el chat
    ✅ Solo pacientes pueden ver sus estadísticas
    """
    try:
        fecha_inicio = datetime.utcnow() - timedelta(days=dias)
        
        # Construir filtro
        filtro = {
            "user_id": str(current_user.id_usuario),
            "emocion_detectada": {"$exists": True, "$ne": None},
            "timestamp": {"$gte": fecha_inicio}
        }
        
        # Obtener conversaciones con emociones
        conversaciones = list(mongodb_service.chat_logs.find(filtro))
        
        if not conversaciones:
            return {
                "total_conversaciones": 0,
                "emociones": {},
                "dias_analizados": dias
            }
        
        # Contar emociones
        conteo_emociones = {}
        for conv in conversaciones:
            emocion = conv.get("emocion_detectada")
            if emocion:
                conteo_emociones[emocion] = conteo_emociones.get(emocion, 0) + 1
        
        return {
            "total_conversaciones": len(conversaciones),
            "emociones": conteo_emociones,
            "dias_analizados": dias
        }
        
    except Exception as e:
        logger.error(f"❌ Error al obtener estadísticas: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al obtener estadísticas: {str(e)}"
        )