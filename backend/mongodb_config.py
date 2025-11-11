from pymongo import MongoClient
from datetime import datetime
from typing import List, Dict, Optional
import os

# Configuración de MongoDB
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017/")
DATABASE_NAME = "emotional_tracking"

class MongoDBService:
    def __init__(self):
        self.client = MongoClient(MONGODB_URL)
        self.db = self.client[DATABASE_NAME]
        
        # Colecciones
        self.chat_logs = self.db["chat_logs"]
        self.emotional_texts = self.db["emotional_texts"]
        self.notifications = self.db["notifications"]
        
        # Crear índices
        self._create_indexes()
    
    def _create_indexes(self):
        """Crear índices para optimizar consultas"""
        self.chat_logs.create_index([("user_id", 1), ("timestamp", -1)])
        self.emotional_texts.create_index([("user_id", 1), ("timestamp", -1)])
        self.notifications.create_index([("user_id", 1), ("sent", 1)])
    
    # Chat Logs
    def save_chat_message(self, user_id: int, message: str, is_bot: bool, 
                          intent: Optional[str] = None, 
                          confidence: Optional[float] = None,
                          emotional_analysis: Optional[Dict] = None):
        """Guardar mensaje de chat con análisis emocional"""
        document = {
            "user_id": user_id,
            "message": message,
            "is_bot": is_bot,
            "intent": intent,
            "confidence": confidence,
            "emotional_analysis": emotional_analysis,
            "timestamp": datetime.utcnow()
        }
        return self.chat_logs.insert_one(document)
    
    def get_chat_history(self, user_id: int, limit: int = 50) -> List[Dict]:
        """Obtener historial de chat de un usuario"""
        messages = self.chat_logs.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(limit)
        return list(messages)
    
    def get_conversation_context(self, user_id: int, last_n: int = 10) -> List[Dict]:
        """Obtener contexto de conversación reciente"""
        messages = self.chat_logs.find(
            {"user_id": user_id}
        ).sort("timestamp", -1).limit(last_n)
        return list(reversed(list(messages)))
    
    # Emotional Texts
    def save_emotional_text(self, user_id: int, text: str, 
                           emotional_analysis: Dict, 
                           source: str = "chat"):
        """Guardar texto con análisis emocional completo"""
        document = {
            "user_id": user_id,
            "text": text,
            "source": source,  # "chat", "record", "journal"
            "sentiment": emotional_analysis.get("sentiment"),
            "emotions": emotional_analysis.get("emotions"),
            "risk_assessment": emotional_analysis.get("risk_assessment"),
            "timestamp": datetime.utcnow()
        }
        return self.emotional_texts.insert_one(document)
    
    def get_emotional_patterns(self, user_id: int, days: int = 30) -> Dict:
        """Analizar patrones emocionales en el tiempo"""
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        texts = self.emotional_texts.find({
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        }).sort("timestamp", 1)
        
        texts_list = list(texts)
        
        if not texts_list:
            return {
                "total_entries": 0,
                "dominant_emotions": {},
                "average_sentiment": 0,
                "risk_alerts": 0
            }
        
        # Análisis de emociones dominantes
        emotion_counts = {}
        sentiment_sum = 0
        high_risk_count = 0
        
        for text in texts_list:
            if text.get("emotions") and text["emotions"].get("dominant_emotion"):
                emotion = text["emotions"]["dominant_emotion"]
                emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1
            
            if text.get("sentiment") and text["sentiment"].get("sentiment_score"):
                sentiment_sum += text["sentiment"]["sentiment_score"]
            
            if text.get("risk_assessment") and text["risk_assessment"].get("level") == "alto":
                high_risk_count += 1
        
        return {
            "total_entries": len(texts_list),
            "dominant_emotions": emotion_counts,
            "average_sentiment": sentiment_sum / len(texts_list) if texts_list else 0,
            "risk_alerts": high_risk_count,
            "period_days": days
        }
    
    def get_high_risk_entries(self, user_id: int, days: int = 7) -> List[Dict]:
        """Obtener entradas de alto riesgo"""
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        entries = self.emotional_texts.find({
            "user_id": user_id,
            "timestamp": {"$gte": start_date},
            "risk_assessment.level": "alto"
        }).sort("timestamp", -1)
        
        return list(entries)
    
    # Notifications
    def create_notification(self, user_id: int, notification_type: str, 
                           message: str, priority: str = "normal"):
        """Crear notificación para el usuario"""
        document = {
            "user_id": user_id,
            "type": notification_type,  # "reminder", "alert", "achievement"
            "message": message,
            "priority": priority,  # "low", "normal", "high", "critical"
            "sent": False,
            "read": False,
            "created_at": datetime.utcnow()
        }
        return self.notifications.insert_one(document)
    
    def get_pending_notifications(self, user_id: int) -> List[Dict]:
        """Obtener notificaciones pendientes"""
        notifications = self.notifications.find({
            "user_id": user_id,
            "sent": False
        }).sort("created_at", -1)
        
        return list(notifications)
    
    def mark_notification_sent(self, notification_id):
        """Marcar notificación como enviada"""
        self.notifications.update_one(
            {"_id": notification_id},
            {"$set": {"sent": True, "sent_at": datetime.utcnow()}}
        )
    
    def mark_notification_read(self, notification_id):
        """Marcar notificación como leída"""
        self.notifications.update_one(
            {"_id": notification_id},
            {"$set": {"read": True, "read_at": datetime.utcnow()}}
        )
    
    # Analytics
    def get_user_engagement_stats(self, user_id: int, days: int = 30) -> Dict:
        """Estadísticas de engagement del usuario"""
        from datetime import timedelta
        start_date = datetime.utcnow() - timedelta(days=days)
        
        chat_count = self.chat_logs.count_documents({
            "user_id": user_id,
            "is_bot": False,
            "timestamp": {"$gte": start_date}
        })
        
        text_entries = self.emotional_texts.count_documents({
            "user_id": user_id,
            "timestamp": {"$gte": start_date}
        })
        
        return {
            "chat_messages": chat_count,
            "emotional_entries": text_entries,
            "total_interactions": chat_count + text_entries,
            "period_days": days,
            "avg_daily_interactions": (chat_count + text_entries) / days if days > 0 else 0
        }

# Instancia global del servicio
mongodb_service = MongoDBService()

# Función para obtener la base de datos directamente
def get_database():
    """Retorna la instancia de la base de datos de MongoDB"""
    return mongodb_service.db