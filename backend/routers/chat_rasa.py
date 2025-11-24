# backend/routers/chat_rasa.py
# ✅ VERSIÓN ACTUALIZADA - FIX MONGODB GUARDADO DE CONVERSACIONES

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
from pydantic import BaseModel

import models
from database import get_db
from dependencies import get_current_paciente
from mongodb_config import mongodb_service
from nlp_service import nlp_service

# Intentar importar el servicio avanzado de chatbot
try:
    from advanced_chatbot_service import AdvancedTherapeuticChatbot
    ADVANCED_CHATBOT_AVAILABLE = True
except:
    ADVANCED_CHATBOT_AVAILABLE = False
    print("⚠️ Advertencia: Chatbot avanzado no disponible, usando fallback")

# Importar chatbot básico como fallback
from chatbot_service import chatbot_service

router = APIRouter()

# ==================== SCHEMAS ====================

class MensajeChatRequest(BaseModel):
    mensaje: str
    sesion_id: Optional[str] = None

class MensajeChatResponse(BaseModel):
    respuestas: list[str]
    analisis_emocional: dict
    nivel_riesgo: str
    requiere_atencion: bool

# ==================== INICIALIZAR CHATBOT ====================

if ADVANCED_CHATBOT_AVAILABLE:
    try:
        chatbot_avanzado = AdvancedTherapeuticChatbot()
        print("✅ Chatbot avanzado inicializado correctamente")
    except Exception as e:
        print(f"⚠️ Error inicializando chatbot avanzado: {e}")
        ADVANCED_CHATBOT_AVAILABLE = False

# ==================== ENDPOINTS ====================

@router.post("/chat", response_model=dict)
async def enviar_mensaje_chat(
    mensaje_data: MensajeChatRequest,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Enviar mensaje al chatbot terapéutico
    FIX: Guarda correctamente en MongoDB con estructura completa
    """
    try:
        mensaje_usuario = mensaje_data.mensaje.strip()
        
        if not mensaje_usuario:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El mensaje no puede estar vacío"
            )
        
        # ID de sesión único para el chat
        sesion_id = mensaje_data.sesion_id or f"user_{current_user.id_usuario}_{datetime.utcnow().date()}"
        
        print(f"💬 [CHAT] Usuario {current_user.id_usuario}: {mensaje_usuario[:50]}...")
        
        # Análisis emocional del mensaje
        analisis_emocional = nlp_service.comprehensive_analysis(mensaje_usuario)
        
        print(f"🧠 [NLP] Emoción detectada: {analisis_emocional.get('emotions', {}).get('dominant_emotion')}")
        
        # Generar respuesta según disponibilidad de chatbot
        if ADVANCED_CHATBOT_AVAILABLE:
            respuesta_chatbot = await chatbot_avanzado.generate_response(
                user_id=str(current_user.id_usuario),
                message=mensaje_usuario,
                emotional_analysis=analisis_emocional
            )
            respuestas = respuesta_chatbot.get('responses', [])
            intent = respuesta_chatbot.get('intent', 'unknown')
        else:
            respuesta_chatbot = chatbot_service.send_message(
                sender_id=str(current_user.id_usuario),
                message=mensaje_usuario
            )
            respuestas = respuesta_chatbot.get('responses', [])
            intent = respuesta_chatbot.get('intent', 'unknown')
        
        print(f"🤖 [BOT] Respuestas generadas: {len(respuestas)}")
        
        # ✅ FIX: GUARDAR EN MONGODB CON ESTRUCTURA CORRECTA
        try:
            # Guardar mensaje del usuario
            mensaje_usuario_doc = {
                "user_id": current_user.id_usuario,
                "message": mensaje_usuario,
                "is_bot": False,
                "intent": intent,
                "confidence": analisis_emocional.get('emotions', {}).get('confidence', 0),
                "emotional_analysis": {
                    "sentiment": analisis_emocional.get('sentiment'),
                    "emotions": analisis_emocional.get('emotions'),
                    "risk_assessment": analisis_emocional.get('risk_assessment')
                },
                "timestamp": datetime.utcnow()
            }
            
            result = mongodb_service.chat_logs.insert_one(mensaje_usuario_doc)
            print(f"✅ [MONGO] Mensaje usuario guardado: {result.inserted_id}")
            
            # Guardar respuestas del bot
            for respuesta in respuestas:
                mensaje_bot_doc = {
                    "user_id": current_user.id_usuario,
                    "message": respuesta,
                    "is_bot": True,
                    "intent": intent,
                    "confidence": None,
                    "emotional_analysis": None,
                    "timestamp": datetime.utcnow()
                }
                
                result_bot = mongodb_service.chat_logs.insert_one(mensaje_bot_doc)
                print(f"✅ [MONGO] Respuesta bot guardada: {result_bot.inserted_id}")
            
            # Guardar análisis emocional completo en colección separada
            emotional_doc = {
                "user_id": current_user.id_usuario,
                "text": mensaje_usuario,
                "source": "chat",
                "sentiment": analisis_emocional.get('sentiment'),
                "emotions": analisis_emocional.get('emotions'),
                "risk_assessment": analisis_emocional.get('risk_assessment'),
                "timestamp": datetime.utcnow()
            }
            
            result_emotion = mongodb_service.emotional_texts.insert_one(emotional_doc)
            print(f"✅ [MONGO] Análisis emocional guardado: {result_emotion.inserted_id}")
            
        except Exception as mongo_error:
            print(f"❌ [MONGO ERROR] Error guardando en MongoDB: {mongo_error}")
            # No lanzar error, continuar con la respuesta
        
        # Detectar nivel de riesgo
        nivel_riesgo = analisis_emocional.get('risk_assessment', {}).get('level', 'bajo')
        requiere_atencion = analisis_emocional.get('risk_assessment', {}).get('score', 0) > 0.8
        
        print(f"⚠️ [RIESGO] Nivel: {nivel_riesgo}, Requiere atención: {requiere_atencion}")
        
        # Si es alto riesgo, crear notificación para el psicólogo
        if nivel_riesgo == 'alto' or requiere_atencion:
            asignacion = db.query(models.PacientePsicologo).filter(
                models.PacientePsicologo.id_paciente == current_user.id_usuario,
                models.PacientePsicologo.activo == True
            ).first()
            
            if asignacion:
                notificacion = models.Notificacion(
                    id_usuario=asignacion.id_psicologo,
                    tipo=models.NotificationType.ALERTA,
                    titulo="⚠️ Alerta de Alto Riesgo Emocional",
                    mensaje=f"El paciente {current_user.nombre} {current_user.apellido} ha mostrado indicadores de alto riesgo en el chat terapéutico.",
                    prioridad="critica",
                    enviada=False,
                    leida=False
                )
                db.add(notificacion)
                db.commit()
                print(f"✅ [ALERTA] Notificación creada para psicólogo {asignacion.id_psicologo}")
        
        # Guardar mensaje en PostgreSQL también
        mensaje_sql = models.MensajeChat(
            id_usuario=current_user.id_usuario,
            mensaje=mensaje_usuario,
            es_bot=False,
            intencion=intent,
            confianza_intencion=analisis_emocional.get('emotions', {}).get('confidence'),
            sentimiento_mensaje=analisis_emocional.get('sentiment', {}).get('sentiment_score'),
            emocion_detectada=analisis_emocional.get('emotions', {}).get('dominant_emotion'),
            id_sesion_chat=sesion_id
        )
        db.add(mensaje_sql)
        
        # Guardar respuestas del bot en SQL
        for respuesta in respuestas:
            mensaje_bot_sql = models.MensajeChat(
                id_usuario=current_user.id_usuario,
                mensaje=respuesta,
                es_bot=True,
                id_sesion_chat=sesion_id
            )
            db.add(mensaje_bot_sql)
        
        db.commit()
        print(f"✅ [POSTGRES] Mensajes guardados en PostgreSQL")
        
        return {
            "respuestas": respuestas,
            "analisis_emocional": {
                "emocion_dominante": analisis_emocional.get('emotions', {}).get('dominant_emotion'),
                "confianza": analisis_emocional.get('emotions', {}).get('confidence'),
                "sentimiento": analisis_emocional.get('sentiment', {}).get('label'),
                "sentimiento_score": analisis_emocional.get('sentiment', {}).get('sentiment_score'),
                "nivel_riesgo": nivel_riesgo,
                "score_riesgo": analisis_emocional.get('risk_assessment', {}).get('score')
            },
            "nivel_riesgo": nivel_riesgo,
            "requiere_atencion": requiere_atencion,
            "sesion_id": sesion_id,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error en chat: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error procesando mensaje: {str(e)}"
        )


@router.get("/chat/historial")
async def obtener_historial_chat(
    limite: int = 50,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener historial de chat del paciente
    """
    try:
        # Obtener de MongoDB
        historial_mongo = list(mongodb_service.chat_logs.find({
            "user_id": current_user.id_usuario
        }).sort("timestamp", -1).limit(limite))
        
        print(f"📊 [MONGO] Encontrados {len(historial_mongo)} mensajes")
        
        if historial_mongo:
            # Formatear respuesta
            mensajes = []
            for msg in historial_mongo:
                mensajes.append({
                    "mensaje": msg.get('message'),
                    "es_bot": msg.get('is_bot', False),
                    "fecha_hora": msg.get('timestamp').isoformat() if msg.get('timestamp') else None,
                    "emocion": msg.get('emotional_analysis', {}).get('emotions', {}).get('dominant_emotion') if not msg.get('is_bot') else None
                })
            
            return {
                "total": len(mensajes),
                "mensajes": mensajes
            }
        else:
            print("⚠️ [MONGO] No hay mensajes, intentando PostgreSQL")
    except Exception as mongo_error:
        print(f"❌ [MONGO ERROR] {mongo_error}")
    
    # Fallback: obtener de PostgreSQL
    mensajes_sql = db.query(models.MensajeChat).filter(
        models.MensajeChat.id_usuario == current_user.id_usuario
    ).order_by(models.MensajeChat.fecha_hora.desc()).limit(limite).all()
    
    print(f"📊 [POSTGRES] Encontrados {len(mensajes_sql)} mensajes")
    
    return {
        "total": len(mensajes_sql),
        "mensajes": [
            {
                "mensaje": m.mensaje,
                "es_bot": m.es_bot,
                "fecha_hora": m.fecha_hora.isoformat(),
                "emocion": m.emocion_detectada if not m.es_bot else None
            }
            for m in mensajes_sql
        ]
    }


@router.get("/chat/estadisticas")
async def obtener_estadisticas_chat(
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener estadísticas de uso del chat
    """
    try:
        # Obtener estadísticas de MongoDB
        estadisticas = mongodb_service.get_user_engagement_stats(
            user_id=current_user.id_usuario,
            days=dias
        )
        
        # Obtener patrones emocionales
        patrones = mongodb_service.get_emotional_patterns(
            user_id=current_user.id_usuario,
            days=dias
        )
        
        return {
            "periodo_dias": dias,
            "total_mensajes": estadisticas.get('chat_messages', 0),
            "promedio_diario": round(estadisticas.get('avg_daily_interactions', 0), 1),
            "emociones_dominantes": patrones.get('dominant_emotions', {}),
            "sentimiento_promedio": round(patrones.get('average_sentiment', 0), 2),
            "alertas_alto_riesgo": patrones.get('risk_alerts', 0)
        }
        
    except Exception as e:
        print(f"Error obteniendo estadísticas: {e}")
        
        # Fallback: calcular desde PostgreSQL
        fecha_inicio = datetime.utcnow() - timedelta(days=dias)
        
        total_mensajes = db.query(models.MensajeChat).filter(
            models.MensajeChat.id_usuario == current_user.id_usuario,
            models.MensajeChat.fecha_hora >= fecha_inicio,
            models.MensajeChat.es_bot == False
        ).count()
        
        return {
            "periodo_dias": dias,
            "total_mensajes": total_mensajes,
            "promedio_diario": round(total_mensajes / dias, 1) if dias > 0 else 0
        }


@router.get("/chat/test-mongo")
async def test_mongo_connection():
    """
    ✅ Endpoint de testing para verificar conexión a MongoDB
    """
    try:
        # Intentar insertar un documento de prueba
        test_doc = {
            "test": True,
            "message": "Test de conexión MongoDB",
            "timestamp": datetime.utcnow()
        }
        
        result = mongodb_service.chat_logs.insert_one(test_doc)
        
        # Verificar que se guardó
        found = mongodb_service.chat_logs.find_one({"_id": result.inserted_id})
        
        # Eliminar documento de prueba
        mongodb_service.chat_logs.delete_one({"_id": result.inserted_id})
        
        return {
            "status": "success",
            "message": "MongoDB conectado correctamente",
            "inserted_id": str(result.inserted_id),
            "found": found is not None
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }