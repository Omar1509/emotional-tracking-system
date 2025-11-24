import requests
from typing import Dict, List
import json
from nlp_service import analyze_text

class ChatbotService:
    def __init__(self, rasa_url: str = "http://localhost:5006"):
        self.rasa_url = rasa_url
        self.webhook_url = f"{rasa_url}/webhooks/rest/webhook"
        
    def send_message(self, sender_id: str, message: str) -> Dict:
        """
        Envía un mensaje al chatbot Rasa y recibe la respuesta
        """
        try:
            # Análisis emocional del mensaje del usuario
            emotional_analysis = analyze_text(message)
            
            # Enviar mensaje a Rasa
            payload = {
                "sender": sender_id,
                "message": message
            }
            
            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                bot_responses = response.json()
                
                # Extraer respuestas del bot
                replies = []
                for resp in bot_responses:
                    if 'text' in resp:
                        replies.append(resp['text'])
                
                return {
                    'success': True,
                    'responses': replies,
                    'emotional_analysis': emotional_analysis,
                    'intent': bot_responses[0].get('intent', 'unknown') if bot_responses else 'unknown'
                }
            else:
                return self._fallback_response(message, emotional_analysis)
                
        except requests.exceptions.ConnectionError:
            # Si Rasa no está disponible, usar respuestas de respaldo
            return self._fallback_response(message, emotional_analysis)
        except Exception as e:
            print(f"Error en chatbot: {e}")
            return self._fallback_response(message, emotional_analysis)
    
    def _fallback_response(self, message: str, emotional_analysis: Dict) -> Dict:
        """
        Sistema de respuestas de respaldo cuando Rasa no está disponible
        """
        emotion = emotional_analysis['emotions']['dominant_emotion']
        sentiment_score = emotional_analysis['sentiment']['sentiment_score']
        
        # Respuestas basadas en emociones
        responses = {
            'tristeza': [
                "Entiendo que estás pasando por un momento difícil. Es completamente normal sentirse triste a veces.",
                "Recuerda que no estás solo. ¿Hay algo específico que te esté afectando hoy?"
            ],
            'ansiedad': [
                "Percibo que podrías estar sintiendo ansiedad. Toma un respiro profundo.",
                "La ansiedad puede ser abrumadora. ¿Te gustaría hablar sobre lo que te preocupa?"
            ],
            'alegría': [
                "Me alegra notar energía positiva en tu mensaje.",
                "Es maravilloso que estés teniendo un buen momento. ¿Qué ha contribuido a sentirte así?"
            ],
            'enojo': [
                "Veo que podrías estar frustrado. Es válido sentir enojo.",
                "¿Quieres compartir qué es lo que te está molestando?"
            ],
            'miedo': [
                "Es completamente normal tener miedos. Estoy aquí para escucharte.",
                "¿Hay algo específico que te está causando preocupación?"
            ]
        }
        
        # Respuestas de alto riesgo
        if emotional_analysis['risk_assessment']['level'] == 'alto':
            high_risk_responses = [
                "Noto que podrías estar pasando por un momento muy difícil. Por favor, considera contactar a tu psicólogo o llamar a una línea de ayuda si necesitas apoyo inmediato.",
                "Tu bienestar es muy importante. Si sientes que necesitas ayuda urgente, por favor contacta a un profesional de salud mental."
            ]
            return {
                'success': True,
                'responses': high_risk_responses,
                'emotional_analysis': emotional_analysis,
                'intent': 'high_risk',
                'fallback': True
            }
        
        # Seleccionar respuesta según emoción
        selected_responses = responses.get(emotion, [
            "Gracias por compartir. Estoy aquí para escucharte.",
            "¿Cómo te has sentido últimamente?"
        ])
        
        return {
            'success': True,
            'responses': selected_responses,
            'emotional_analysis': emotional_analysis,
            'intent': f'emotion_{emotion}',
            'fallback': True
        }
    
    def get_conversation_history(self, sender_id: str, limit: int = 10) -> List[Dict]:
        """
        Obtiene el historial de conversación (implementar según necesidad)
        """
        # Esta función se conectaría con MongoDB para obtener el historial
        return []

# Instancia global del servicio
chatbot_service = ChatbotService()

def process_chat_message(user_id: str, message: str) -> Dict:
    """Función auxiliar para procesar mensajes"""
    return chatbot_service.send_message(user_id, message)