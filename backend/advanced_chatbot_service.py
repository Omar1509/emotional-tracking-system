"""
Sistema Avanzado de Chatbot Terapéutico con LLM
Combina Rasa para clasificación + LLM para generación de respuestas naturales
"""

from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import json
import os
from transformers import pipeline
import anthropic
from openai import OpenAI
from mongodb_config import mongodb_service
from nlp_service import nlp_service

# ============================================
# CONFIGURACIÓN
# ============================================

# Elegir proveedor de LLM (claude, openai, o fallback)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "fallback")  # claude, openai, fallback
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Inicializar clientes de LLM
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


# ============================================
# ANÁLISIS EMOCIONAL MEJORADO
# ============================================

class AdvancedEmotionAnalyzer:
    """Análisis emocional más profundo con múltiples dimensiones"""
    
    def __init__(self):
        # Modelo de emociones en español (BETO)
        self.emotion_classifier = pipeline(
            "text-classification",
            model="finiteautomata/beto-emotion-analysis",
            top_k=None
        )
        
        # Modelo de sentimientos
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model="pysentimiento/robertuito-sentiment-analysis"
        )
    
    def analyze(self, text: str) -> Dict:
        """Análisis emocional completo"""
        
        # Análisis de emociones
        emotions_result = self.emotion_classifier(text)[0]
        emotions_dict = {item['label']: item['score'] for item in emotions_result}
        dominant_emotion = max(emotions_result, key=lambda x: x['score'])
        
        # Análisis de sentimiento
        sentiment_result = self.sentiment_analyzer(text)[0]
        
        # Mapeo emocional en español
        emotion_map = {
            'joy': 'alegría',
            'sadness': 'tristeza',
            'anger': 'enojo',
            'fear': 'miedo',
            'surprise': 'sorpresa',
            'disgust': 'asco',
            'others': 'neutral'
        }
        
        # Evaluación de riesgo
        risk_score = self._calculate_risk(text, emotions_dict, sentiment_result)
        
        # Detección de necesidades terapéuticas
        therapeutic_needs = self._detect_therapeutic_needs(text, emotions_dict)
        
        return {
            'dominant_emotion': emotion_map.get(dominant_emotion['label'], 'neutral'),
            'emotion_confidence': dominant_emotion['score'],
            'all_emotions': {emotion_map.get(k, k): v for k, v in emotions_dict.items()},
            'sentiment': {
                'label': sentiment_result['label'],
                'score': sentiment_result['score']
            },
            'risk_assessment': {
                'level': 'alto' if risk_score > 0.7 else 'medio' if risk_score > 0.4 else 'bajo',
                'score': risk_score,
                'requires_immediate_attention': risk_score > 0.8
            },
            'therapeutic_needs': therapeutic_needs,
            'intensity': self._calculate_intensity(emotions_dict)
        }
    
    def _calculate_risk(self, text: str, emotions: Dict, sentiment: Dict) -> float:
        """Calcula score de riesgo basado en múltiples factores"""
        risk_score = 0.0
        
        # Palabras de crisis
        crisis_keywords = [
            'suicidio', 'matarme', 'acabar con todo', 'no quiero vivir',
            'hacerme daño', 'terminar con mi vida', 'morir', 'muerte',
            'no aguanto más', 'ya no puedo', 'sin salida', 'desesperado'
        ]
        
        text_lower = text.lower()
        crisis_matches = sum(1 for keyword in crisis_keywords if keyword in text_lower)
        risk_score += min(crisis_matches * 0.3, 0.6)
        
        # Emociones negativas intensas
        if emotions.get('sadness', 0) > 0.7:
            risk_score += 0.25
        if emotions.get('fear', 0) > 0.6:
            risk_score += 0.20
        if emotions.get('anger', 0) > 0.7:
            risk_score += 0.15
        
        # Sentimiento muy negativo
        if sentiment['label'] == 'NEG' and sentiment['score'] > 0.8:
            risk_score += 0.20
        
        # Frases de desesperanza
        hopelessness_phrases = [
            'no tiene sentido', 'nada importa', 'todo está perdido',
            'no hay esperanza', 'nunca mejorará', 'siempre será así'
        ]
        if any(phrase in text_lower for phrase in hopelessness_phrases):
            risk_score += 0.25
        
        return min(risk_score, 1.0)
    
    def _calculate_intensity(self, emotions: Dict) -> float:
        """Calcula la intensidad emocional general (0-10)"""
        # Emoción más fuerte
        max_emotion = max(emotions.values())
        
        # Cantidad de emociones activas (>0.3)
        active_emotions = sum(1 for score in emotions.values() if score > 0.3)
        
        # Intensidad base
        intensity = max_emotion * 10
        
        # Ajuste por cantidad de emociones (emociones mezcladas = más intenso)
        if active_emotions > 2:
            intensity = min(intensity + 1, 10)
        
        return round(intensity, 1)
    
    def _detect_therapeutic_needs(self, text: str, emotions: Dict) -> List[str]:
        """Detecta necesidades terapéuticas específicas"""
        needs = []
        
        text_lower = text.lower()
        
        # Regulación emocional
        if emotions.get('anger', 0) > 0.6 or emotions.get('fear', 0) > 0.6:
            needs.append('regulacion_emocional')
        
        # Manejo de ansiedad
        anxiety_keywords = ['ansiedad', 'ansioso', 'nervioso', 'preocupado', 'agobiado']
        if any(keyword in text_lower for keyword in anxiety_keywords):
            needs.append('manejo_ansiedad')
        
        # Procesamiento del duelo
        grief_keywords = ['perdí', 'falleció', 'murió', 'extraño', 'duelo', 'luto']
        if any(keyword in text_lower for keyword in grief_keywords):
            needs.append('procesamiento_duelo')
        
        # Habilidades sociales
        social_keywords = ['solo', 'aislado', 'nadie me entiende', 'sin amigos']
        if any(keyword in text_lower for keyword in social_keywords):
            needs.append('habilidades_sociales')
        
        # Autoestima
        self_esteem_keywords = ['inútil', 'fracaso', 'no sirvo', 'no valgo', 'incapaz']
        if any(keyword in text_lower for keyword in self_esteem_keywords):
            needs.append('trabajo_autoestima')
        
        # Técnicas de afrontamiento
        if emotions.get('sadness', 0) > 0.7:
            needs.append('tecnicas_afrontamiento')
        
        return needs


# ============================================
# GESTIÓN DE CONTEXTO Y MEMORIA
# ============================================

class ConversationMemory:
    """Gestiona el contexto y memoria de las conversaciones"""
    
    def __init__(self):
        self.mongo = mongodb_service
    
    def get_conversation_context(self, user_id: int, messages_limit: int = 10) -> Dict:
        """Obtiene el contexto completo de la conversación"""
        
        # Últimos mensajes
        recent_messages = self.mongo.get_conversation_context(user_id, messages_limit)
        
        # Patrones emocionales recientes (últimos 7 días)
        emotional_patterns = self.mongo.get_emotional_patterns(user_id, days=7)
        
        # Entradas de alto riesgo recientes
        high_risk_entries = self.mongo.get_high_risk_entries(user_id, days=7)
        
        # Resumen del perfil emocional
        emotional_profile = self._build_emotional_profile(emotional_patterns)
        
        return {
            'recent_messages': recent_messages,
            'emotional_patterns': emotional_patterns,
            'high_risk_entries': high_risk_entries,
            'emotional_profile': emotional_profile,
            'risk_level': 'alto' if high_risk_entries else 'bajo'
        }
    
    def _build_emotional_profile(self, patterns: Dict) -> Dict:
        """Construye un perfil emocional resumido"""
        if not patterns or patterns.get('total_entries', 0) == 0:
            return {'description': 'Sin datos suficientes'}
        
        dominant = patterns.get('dominant_emotions', {})
        avg_sentiment = patterns.get('average_sentiment', 0)
        
        # Emoción dominante
        main_emotion = max(dominant.items(), key=lambda x: x[1])[0] if dominant else 'neutral'
        
        # Tendencia emocional
        if avg_sentiment > 0.3:
            trend = 'positiva'
        elif avg_sentiment < -0.3:
            trend = 'negativa'
        else:
            trend = 'neutral'
        
        return {
            'main_emotion': main_emotion,
            'emotional_trend': trend,
            'risk_alerts_count': patterns.get('risk_alerts', 0),
            'engagement_level': 'alto' if patterns.get('total_entries', 0) > 10 else 'medio'
        }
    
    def save_interaction(self, user_id: int, user_message: str, 
                        bot_response: str, analysis: Dict):
        """Guarda la interacción en MongoDB"""
        
        # Guardar mensaje del usuario
        self.mongo.save_chat_message(
            user_id=user_id,
            message=user_message,
            is_bot=False,
            intent=None,
            confidence=None,
            emotional_analysis=analysis
        )
        
        # Guardar respuesta del bot
        self.mongo.save_chat_message(
            user_id=user_id,
            message=bot_response,
            is_bot=True,
            intent=analysis.get('therapeutic_needs', []),
            confidence=analysis.get('emotion_confidence', 0.5),
            emotional_analysis=None
        )
        
        # Guardar análisis emocional completo
        self.mongo.save_emotional_text(
            user_id=user_id,
            text=user_message,
            emotional_analysis=analysis,
            source='advanced_chat'
        )


# ============================================
# GENERACIÓN DE RESPUESTAS CON LLM
# ============================================

class TherapeuticLLM:
    """Generador de respuestas terapéuticas con LLM"""
    
    def __init__(self, provider: str = "fallback"):
        self.provider = provider
        self.fallback_responses = self._load_fallback_responses()
    
    def generate_response(self, user_message: str, context: Dict, 
                         analysis: Dict) -> str:
        """Genera una respuesta terapéutica basada en LLM"""
        
        # Construir prompt terapéutico
        prompt = self._build_therapeutic_prompt(user_message, context, analysis)
        
        # Intentar con el proveedor configurado
        if self.provider == "claude" and anthropic_client:
            return self._generate_with_claude(prompt, analysis)
        elif self.provider == "openai" and openai_client:
            return self._generate_with_openai(prompt, analysis)
        else:
            return self._generate_fallback(user_message, analysis)
    
    def _build_therapeutic_prompt(self, message: str, context: Dict, 
                                  analysis: Dict) -> str:
        """Construye el prompt para el LLM con contexto terapéutico"""
        
        emotional_profile = context.get('emotional_profile', {})
        recent_messages = context.get('recent_messages', [])
        risk_level = analysis['risk_assessment']['level']
        dominant_emotion = analysis['dominant_emotion']
        therapeutic_needs = analysis.get('therapeutic_needs', [])
        
        # Contexto de conversación previa
        conversation_history = "\n".join([
            f"{'Usuario' if not msg.get('is_bot') else 'Bot'}: {msg.get('message', '')}"
            for msg in recent_messages[-5:]  # Últimos 5 mensajes
        ])
        
        prompt = f"""Eres un asistente terapéutico empático y profesional. Tu objetivo es proporcionar apoyo emocional de forma cálida, validante y útil.

INFORMACIÓN DEL PACIENTE:
- Emoción actual: {dominant_emotion} (intensidad: {analysis.get('intensity', 5)}/10)
- Nivel de riesgo: {risk_level}
- Tendencia emocional reciente: {emotional_profile.get('emotional_trend', 'desconocida')}
- Necesidades terapéuticas detectadas: {', '.join(therapeutic_needs) if therapeutic_needs else 'ninguna específica'}

CONTEXTO DE CONVERSACIÓN RECIENTE:
{conversation_history if conversation_history else "Primera interacción"}

MENSAJE ACTUAL DEL USUARIO:
"{message}"

INSTRUCCIONES PARA TU RESPUESTA:
1. **Valida la emoción**: Reconoce y normaliza lo que siente
2. **Sé empático y cálido**: Usa emojis moderadamente (���, ���, ���) para transmitir calidez
3. **Haz preguntas reflexivas**: Ayuda al usuario a explorar sus emociones
4. **Ofrece perspectiva terapéutica**: Si es relevante, sugiere técnicas o insights
5. **Mantén el contexto**: Referencia información de mensajes previos si es relevante
6. **Sé conciso pero profundo**: 2-4 oraciones, máximo
7. **Nunca des consejos médicos**: Recuerda que no eres un psicólogo licenciado

{"⚠️ URGENTE: El usuario muestra signos de alto riesgo. Tu respuesta debe incluir recursos de crisis y alentar a buscar ayuda profesional inmediata." if risk_level == 'alto' else ""}

RESPONDE DE FORMA NATURAL, EMPÁTICA Y TERAPÉUTICAMENTE ÚTIL:"""
        
        return prompt
    
    def _generate_with_claude(self, prompt: str, analysis: Dict) -> str:
        """Genera respuesta usando Claude (Anthropic)"""
        try:
            message = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=300,
                temperature=0.7,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text.strip()
        except Exception as e:
            print(f"❌ Error con Claude: {e}")
            return self._generate_fallback("", analysis)
    
    def _generate_with_openai(self, prompt: str, analysis: Dict) -> str:
        """Genera respuesta usando GPT (OpenAI)"""
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "Eres un asistente terapéutico empático y profesional."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"❌ Error con OpenAI: {e}")
            return self._generate_fallback("", analysis)
    
    def _generate_fallback(self, message: str, analysis: Dict) -> str:
        """Sistema de respuestas de fallback basado en reglas"""
        
        emotion = analysis.get('dominant_emotion', 'neutral')
        intensity = analysis.get('intensity', 5)
        risk_level = analysis['risk_assessment']['level']
        needs = analysis.get('therapeutic_needs', [])
        
        # Crisis - Máxima prioridad
        if risk_level == 'alto':
            return (
                "⚠️ Lo que me cuentas me preocupa mucho. Lo que sientes es muy intenso y creo que "
                "necesitas ayuda profesional urgente. Por favor, contacta a tu psicólogo AHORA, "
                "llama a un familiar de confianza, o marca al 911. También está la línea de prevención "
                "del suicidio (1-800-273-8255). Tu vida importa ��� ¿Hay alguien cerca que pueda ayudarte?"
            )
        
        # Respuestas por emoción dominante
        responses = {
            'tristeza': [
                f"Puedo sentir la tristeza en tus palabras ��� {'Es muy intenso, lo sé' if intensity > 7 else 'Es completamente válido sentirse así'}. "
                f"¿Hay algo específico que esté pesando en tu corazón ahora mismo?",
                
                f"La tristeza puede sentirse muy pesada ��� {'Parece que ha sido especialmente difícil últimamente' if intensity > 7 else 'A veces necesitamos permitirnos sentirla'}. "
                f"¿Desde cuándo te sientes así?",
            ],
            'ansiedad': [
                f"La ansiedad puede hacer que todo se sienta abrumador ��� {'Noto que es muy intensa para ti ahora' if intensity > 7 else 'Es una respuesta natural de tu cuerpo'}. "
                f"¿Puedes identificar qué pensamientos se repiten en tu mente?",
                
                f"Entiendo perfectamente esa sensación de ansiedad ��� {'Es como si no pudieras detener tu mente, ¿verdad?' if intensity > 7 else 'Es agotador cuando persiste'}. "
                f"¿Has notado si hay momentos donde se intensifica más?",
            ],
            'enojo': [
                f"Puedo percibir tu frustración y enojo {'y es muy intenso' if intensity > 7 else ''} ��� "
                f"Esos sentimientos son válidos. ¿Qué es lo que más te está molestando en este momento?",
                
                f"El enojo es una emoción poderosa {'y veo que está muy presente para ti ahora' if intensity > 7 else ''} ��� "
                f"A veces señala que algo importante no está bien. ¿Hay una situación específica detrás de esto?",
            ],
            'miedo': [
                f"El miedo puede ser muy paralizante ��� {'Especialmente cuando es tan intenso como lo que describes' if intensity > 7 else 'Es una emoción muy primitiva'}. "
                f"¿Qué es lo que más te atemoriza ahora mismo?",
                
                f"Puedo sentir tu temor {'y lo fuerte que es' if intensity > 7 else ''} ��� "
                f"Es valiente de tu parte reconocerlo. ¿Este miedo es algo nuevo o ha estado contigo un tiempo?",
            ],
            'alegría': [
                f"¡Qué bueno escuchar esa alegría en tu mensaje! ��� {'Es maravilloso que estés sintiendo algo tan positivo' if intensity > 7 else 'Me alegra que estés teniendo un buen momento'}. "
                f"¿Qué ha contribuido a que te sientas así?",
            ],
        }
        
        # Seleccionar respuesta apropiada
        emotion_responses = responses.get(emotion, [
            f"Gracias por compartir esto conmigo ��� {'Puedo sentir la intensidad de lo que estás viviendo' if intensity > 7 else 'Estoy aquí para escucharte'}. "
            f"¿Puedes contarme un poco más sobre lo que estás experimentando?"
        ])
        
        # Agregar sugerencia terapéutica si es relevante
        response = emotion_responses[0]
        
        # Sugerencias basadas en necesidades
        if 'manejo_ansiedad' in needs and intensity > 6:
            response += " ¿Te gustaría que te guíe en una técnica rápida de respiración que puede ayudarte ahora mismo? ���️"
        elif 'regulacion_emocional' in needs and intensity > 7:
            response += " Cuando las emociones son tan intensas, a veces técnicas de grounding pueden ayudar. ¿Quieres intentarlo?"
        elif 'trabajo_autoestima' in needs:
            response += " Recuerda que tus sentimientos no definen quién eres como persona ���"
        
        return response
    
    def _load_fallback_responses(self) -> Dict:
        """Carga respuestas de fallback estructuradas"""
        return {
            'greeting': [
                "Hola ��� Me alegra verte por aquí. ¿Cómo has estado? ¿Qué está pasando en tu mundo hoy?",
                "¡Hola! ��� Gracias por escribirme. Estoy aquí para ti. ¿Cómo te sientes en este momento?",
            ],
            'goodbye': [
                "Cuídate mucho ��� Ha sido valioso conversar contigo. Recuerda que puedes volver cuando lo necesites.",
                "Gracias por compartir conmigo hoy ��� Que tengas un buen día y recuerda ser amable contigo mismo/a.",
            ],
            'gratitude': [
                "No tienes nada que agradecer ��� Es importante para mí poder acompañarte. Siempre estaré aquí.",
                "Gracias a ti por confiar en mí y abrirte ��� Eso requiere mucha valentía.",
            ]
        }


# ============================================
# SERVICIO PRINCIPAL
# ============================================

class AdvancedChatbotService:
    """Servicio principal del chatbot avanzado"""
    
    def __init__(self, llm_provider: str = "fallback"):
        self.emotion_analyzer = AdvancedEmotionAnalyzer()
        self.memory = ConversationMemory()
        self.llm = TherapeuticLLM(provider=llm_provider)
    
    def process_message(self, user_id: int, message: str) -> Dict:
        """
        Procesa un mensaje del usuario y genera una respuesta terapéutica
        
        Returns:
            Dict con la respuesta y análisis completo
        """
        
        # 1. Análisis emocional profundo
        emotional_analysis = self.emotion_analyzer.analyze(message)
        
        # 2. Obtener contexto de conversación
        conversation_context = self.memory.get_conversation_context(user_id)
        
        # 3. Generar respuesta con LLM
        response = self.llm.generate_response(
            user_message=message,
            context=conversation_context,
            analysis=emotional_analysis
        )
        
        # 4. Guardar interacción
        self.memory.save_interaction(
            user_id=user_id,
            user_message=message,
            bot_response=response,
            analysis=emotional_analysis
        )
        
        # 5. Enviar alerta si es alto riesgo
        if emotional_analysis['risk_assessment']['requires_immediate_attention']:
            self._send_crisis_alert(user_id, message, emotional_analysis)
        
        return {
            'response': response,
            'emotional_analysis': emotional_analysis,
            'requires_followup': emotional_analysis['risk_assessment']['level'] in ['alto', 'medio'],
            'therapeutic_recommendations': self._get_therapeutic_recommendations(emotional_analysis),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def _send_crisis_alert(self, user_id: int, message: str, analysis: Dict):
        """Envía alerta de crisis al equipo terapéutico"""
        # TODO: Integrar con sistema de notificaciones
        print(f"��� ALERTA DE CRISIS - Usuario {user_id}")
        print(f"Mensaje: {message}")
        print(f"Riesgo: {analysis['risk_assessment']}")
    
    def _get_therapeutic_recommendations(self, analysis: Dict) -> List[str]:
        """Genera recomendaciones terapéuticas basadas en el análisis"""
        recommendations = []
        
        needs = analysis.get('therapeutic_needs', [])
        intensity = analysis.get('intensity', 5)
        
        if 'manejo_ansiedad' in needs:
            recommendations.append('Técnicas de respiración y mindfulness')
        
        if 'regulacion_emocional' in needs:
            recommendations.append('Ejercicios de grounding y regulación')
        
        if 'trabajo_autoestima' in needs:
            recommendations.append('Trabajar autocompasión y autoestima')
        
        if 'procesamiento_duelo' in needs:
            recommendations.append('Procesamiento del duelo con psicólogo')
        
        if intensity > 7:
            recommendations.append('Considera agendar sesión con tu psicólogo pronto')
        
        return recommendations


# ============================================
# INSTANCIA GLOBAL
# ============================================

# Crear instancia del servicio
advanced_chatbot = AdvancedChatbotService(llm_provider=LLM_PROVIDER)


# ============================================
# FUNCIÓN DE USO RÁPIDO
# ============================================

def chat_with_advanced_bot(user_id: int, message: str) -> Dict:
    """
    Función de acceso rápido al chatbot avanzado
    
    Usage:
        result = chat_with_advanced_bot(user_id=123, message="Me siento muy ansioso")
        print(result['response'])
    """
    return advanced_chatbot.process_message(user_id, message)
