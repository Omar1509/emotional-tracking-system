# rasa_chatbot/actions/database_connector.py

import requests
from typing import Dict, Optional
from datetime import datetime
import os

class BackendConnector:
    """
    Conector con el backend de FastAPI para persistir datos
    """
    
    def __init__(self):
        self.backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")
        self.api_base = f"{self.backend_url}/api"
        
    def save_emotional_analysis(self,
                                user_id: str,
                                message: str,
                                analysis: Dict) -> bool:
        """
        Guarda análisis emocional en MongoDB a través del backend
        
        Args:
            user_id: ID del usuario (ej: "paciente_123")
            message: mensaje analizado
            analysis: dict con el análisis completo
            
        Returns:
            True si se guardó exitosamente
        """
        try:
            # Extraer paciente_id del sender_id
            if user_id.startswith("paciente_"):
                paciente_id = int(user_id.split("_")[1])
            else:
                paciente_id = 999  # ID de prueba
            
            payload = {
                "paciente_id": paciente_id,
                "mensaje": message,
                "emocion_principal": analysis.get('emocion_principal', 'neutral'),
                "intensidad": analysis.get('intensidad_ajustada', 5.0),
                "confianza": analysis.get('confianza', 0.5),
                "sentimiento": analysis.get('sentimiento', {}),
                "emociones_mixtas": analysis.get('emociones_mixtas', []),
                "nivel_riesgo": analysis['analisis_crisis'].get('nivel', 'bajo'),
                "score_riesgo": analysis['analisis_crisis'].get('score', 0.0),
                "contexto": "chat_rasa",
                "timestamp": datetime.now().isoformat(),
                "metadata": analysis.get('metadatos', {})
            }
            
            response = requests.post(
                f"{self.api_base}/chat/guardar-analisis",
                json=payload,
                timeout=5
            )
            
            if response.ok:
                print(f"✅ Análisis guardado en backend para paciente {paciente_id}")
                return True
            else:
                print(f"⚠️ Error al guardar en backend: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("⚠️ Backend no disponible - modo offline")
            return False
        except Exception as e:
            print(f"⚠️ Error guardando en backend: {e}")
            return False
    
    def send_crisis_alert(self,
                         user_id: str,
                         message: str,
                         crisis_analysis: Dict) -> bool:
        """
        Envía alerta de crisis al backend
        
        Args:
            user_id: ID del usuario
            message: mensaje que activó la alerta
            crisis_analysis: análisis de crisis
            
        Returns:
            True si se envió exitosamente
        """
        try:
            if user_id.startswith("paciente_"):
                paciente_id = int(user_id.split("_")[1])
            else:
                paciente_id = 999
            
            payload = {
                "paciente_id": paciente_id,
                "mensaje": message,
                "nivel_crisis": crisis_analysis.get('nivel', 'alto'),
                "score": crisis_analysis.get('score', 0.0),
                "indicadores": crisis_analysis.get('indicadores', []),
                "timestamp": datetime.now().isoformat()
            }
            
            response = requests.post(
                f"{self.api_base}/alertas/crisis",
                json=payload,
                timeout=5
            )
            
            if response.ok:
                print(f"🚨 ALERTA DE CRISIS enviada al backend para paciente {paciente_id}")
                return True
            else:
                print(f"⚠️ Error enviando alerta: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"⚠️ Error enviando alerta de crisis: {e}")
            return False

# Instancia global
backend_connector = BackendConnector()