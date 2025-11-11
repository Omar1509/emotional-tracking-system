import firebase_admin
from firebase_admin import credentials, messaging
from typing import List, Dict, Optional
import os
import json

class FirebaseNotificationService:
    def __init__(self, credentials_path: Optional[str] = None):
        """
        Inicializar Firebase Admin SDK
        credentials_path: ruta al archivo JSON de credenciales de Firebase
        """
        if not firebase_admin._apps:
            if credentials_path and os.path.exists(credentials_path):
                cred = credentials.Certificate(credentials_path)
            else:
                # Usar credenciales desde variable de entorno
                cred_dict = json.loads(os.getenv("FIREBASE_CREDENTIALS", "{}"))
                if cred_dict:
                    cred = credentials.Certificate(cred_dict)
                else:
                    # Modo desarrollo sin Firebase
                    print("Warning: Firebase no configurado. Las notificaciones se simularán.")
                    self.firebase_enabled = False
                    return
            
            firebase_admin.initialize_app(cred)
        
        self.firebase_enabled = True
    
    def send_notification(self, token: str, title: str, body: str, 
                         data: Optional[Dict] = None) -> bool:
        """
        Enviar notificación push a un dispositivo específico
        
        Args:
            token: Token FCM del dispositivo
            title: Título de la notificación
            body: Cuerpo de la notificación
            data: Datos adicionales (opcional)
        """
        if not self.firebase_enabled:
            print(f"[SIMULACIÓN] Notificación: {title} - {body}")
            return True
        
        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                token=token,
            )
            
            response = messaging.send(message)
            print(f"Notificación enviada exitosamente: {response}")
            return True
            
        except Exception as e:
            print(f"Error al enviar notificación: {e}")
            return False
    
    def send_multicast(self, tokens: List[str], title: str, body: str,
                      data: Optional[Dict] = None) -> Dict:
        """
        Enviar notificación a múltiples dispositivos
        
        Returns:
            Dict con success_count y failure_count
        """
        if not self.firebase_enabled:
            print(f"[SIMULACIÓN] Notificación multicast: {title} - {body} a {len(tokens)} dispositivos")
            return {"success_count": len(tokens), "failure_count": 0}
        
        try:
            message = messaging.MulticastMessage(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                tokens=tokens,
            )
            
            response = messaging.send_multicast(message)
            print(f"Notificaciones enviadas: {response.success_count} exitosas, {response.failure_count} fallidas")
            
            return {
                "success_count": response.success_count,
                "failure_count": response.failure_count
            }
            
        except Exception as e:
            print(f"Error al enviar notificaciones multicast: {e}")
            return {"success_count": 0, "failure_count": len(tokens)}
    
    def send_daily_reminder(self, token: str, user_name: str) -> bool:
        """Enviar recordatorio diario de registro emocional"""
        title = "Recordatorio de Bienestar"
        body = f"Hola {user_name}, ¿cómo te sientes hoy? Registra tu estado emocional."
        data = {
            "type": "daily_reminder",
            "action": "open_record_screen"
        }
        return self.send_notification(token, title, body, data)
    
    def send_check_in_reminder(self, token: str) -> bool:
        """Recordatorio de check-in semanal"""
        title = "Check-in Semanal"
        body = "Ha pasado una semana. ¿Cómo ha sido tu estado de ánimo últimamente?"
        data = {
            "type": "weekly_checkin",
            "action": "open_analytics_screen"
        }
        return self.send_notification(token, title, body, data)
    
    def send_high_risk_alert(self, psychologist_tokens: List[str], 
                            patient_name: str) -> Dict:
        """Alerta de alto riesgo al equipo terapéutico"""
        title = "⚠️ Alerta de Alto Riesgo"
        body = f"El paciente {patient_name} ha mostrado indicadores de alto riesgo emocional."
        data = {
            "type": "high_risk_alert",
            "priority": "critical",
            "action": "review_patient_data"
        }
        return self.send_multicast(psychologist_tokens, title, body, data)
    
    def send_achievement_notification(self, token: str, achievement: str) -> bool:
        """Notificación de logro/milestone"""
        title = "🎉 ¡Felicitaciones!"
        body = achievement
        data = {
            "type": "achievement",
            "action": "show_achievement"
        }
        return self.send_notification(token, title, body, data)
    
    def send_therapy_appointment_reminder(self, token: str, 
                                         appointment_time: str) -> bool:
        """Recordatorio de cita terapéutica"""
        title = "Recordatorio de Cita"
        body = f"Tu sesión de terapia está programada para {appointment_time}"
        data = {
            "type": "appointment_reminder",
            "time": appointment_time,
            "action": "show_appointment_details"
        }
        return self.send_notification(token, title, body, data)
    
    def send_improvement_milestone(self, token: str, days_streak: int) -> bool:
        """Notificación de racha de mejora"""
        title = "¡Excelente Progreso!"
        body = f"Llevas {days_streak} días consecutivos con tendencia positiva. ¡Sigue así!"
        data = {
            "type": "milestone",
            "streak": str(days_streak),
            "action": "open_dashboard"
        }
        return self.send_notification(token, title, body, data)
    
    def send_motivational_message(self, token: str, message: str) -> bool:
        """Mensaje motivacional personalizado"""
        title = "Mensaje de Apoyo"
        body = message
        data = {
            "type": "motivational",
            "action": "open_app"
        }
        return self.send_notification(token, title, body, data)

# Instancia global del servicio
firebase_service = FirebaseNotificationService()

# Funciones auxiliares para uso rápido
def notify_daily_reminder(user_token: str, user_name: str) -> bool:
    return firebase_service.send_daily_reminder(user_token, user_name)

def notify_high_risk(psychologist_tokens: List[str], patient_name: str) -> Dict:
    return firebase_service.send_high_risk_alert(psychologist_tokens, patient_name)

def notify_achievement(user_token: str, achievement: str) -> bool:
    return firebase_service.send_achievement_notification(user_token, achievement)