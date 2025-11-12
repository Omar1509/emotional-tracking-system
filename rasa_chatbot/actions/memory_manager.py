# rasa_chatbot/actions/memory_manager.py

from typing import List, Dict, Optional, Deque
from datetime import datetime, timedelta
from collections import deque, Counter
import json

class ConversationMemory:
    """
    Gestiona la memoria conversacional completa del paciente
    Mantiene contexto, emociones, temas y patrones
    """
    
    def __init__(self, max_messages: int = 50):
        self.max_messages = max_messages
        self.conversation_history: Deque[Dict] = deque(maxlen=max_messages)
        self.emotional_timeline: List[Dict] = []
        self.topics_discussed: set = set()
        self.crisis_mentions: List[Dict] = []
        self.session_start = datetime.now()
        
    def add_message(self, 
                   sender: str, 
                   text: str, 
                   emotion: Optional[Dict] = None,
                   timestamp: Optional[datetime] = None):
        """
        Agrega un mensaje al historial con toda su metadata
        
        Args:
            sender: 'user' o 'bot'
            text: contenido del mensaje
            emotion: dict con emocion e intensidad
            timestamp: momento del mensaje
        """
        
        if timestamp is None:
            timestamp = datetime.now()
        
        message = {
            'sender': sender,
            'text': text,
            'emotion': emotion,
            'timestamp': timestamp,
            'word_count': len(text.split()),
            'has_question': '?' in text,
            'has_exclamation': '!' in text,
            'char_count': len(text)
        }
        
        self.conversation_history.append(message)
        
        # Actualizar línea de tiempo emocional (solo mensajes del usuario)
        if emotion and sender == 'user':
            self.emotional_timeline.append({
                'timestamp': timestamp,
                'emotion': emotion.get('emocion', 'neutral'),
                'intensity': emotion.get('intensidad', 5.0)
            })
        
        # Extraer y guardar temas mencionados
        self._extract_topics(text)
        
        # Detectar y registrar menciones de crisis
        if sender == 'user' and self._is_crisis_mention(text):
            self.crisis_mentions.append({
                'timestamp': timestamp,
                'text': text,
                'emotion': emotion
            })
    
    def get_conversation_context(self, last_n: int = 10) -> str:
        """
        Obtiene el contexto conversacional formateado de los últimos N mensajes
        
        Returns:
            String con el historial formateado
        """
        recent_messages = list(self.conversation_history)[-last_n:]
        
        if not recent_messages:
            return ""
        
        context_lines = []
        for msg in recent_messages:
            sender_label = "Paciente" if msg['sender'] == 'user' else "Asistente"
            context_lines.append(f"{sender_label}: {msg['text']}")
        
        return "\n".join(context_lines)
    
    def get_emotional_trajectory(self) -> Dict:
        """
        Analiza la trayectoria emocional completa de la conversación
        
        Returns:
            Dict con tendencia, emoción dominante, intensidades, etc.
        """
        if not self.emotional_timeline:
            return {
                'trend': 'neutral',
                'dominant_emotion': 'neutral',
                'recent_intensity': 5.0,
                'average_intensity': 5.0,
                'emotion_switches': 0,
                'timeline': []
            }
        
        emotions = [e['emotion'] for e in self.emotional_timeline]
        intensities = [e['intensity'] for e in self.emotional_timeline]
        
        # Calcular tendencia emocional
        trend = self._calculate_emotional_trend(intensities)
        
        # Emoción dominante
        emotion_counts = Counter(emotions)
        dominant_emotion = emotion_counts.most_common(1)[0][0] if emotion_counts else 'neutral'
        
        # Número de cambios emocionales
        emotion_switches = sum(1 for i in range(1, len(emotions)) if emotions[i] != emotions[i-1])
        
        return {
            'trend': trend,
            'dominant_emotion': dominant_emotion,
            'recent_intensity': intensities[-1] if intensities else 5.0,
            'average_intensity': sum(intensities) / len(intensities) if intensities else 5.0,
            'max_intensity': max(intensities) if intensities else 5.0,
            'min_intensity': min(intensities) if intensities else 5.0,
            'emotion_switches': emotion_switches,
            'timeline': self.emotional_timeline[-10:]  # Últimas 10 emociones
        }
    
    def _calculate_emotional_trend(self, intensities: List[float]) -> str:
        """
        Calcula la tendencia emocional basándose en las intensidades
        
        Args:
            intensities: lista de intensidades emocionales
            
        Returns:
            'mejorando', 'empeorando' o 'estable'
        """
        if len(intensities) < 3:
            return 'insuficiente_data'
        
        # Comparar primera mitad vs segunda mitad
        mid_point = len(intensities) // 2
        first_half_avg = sum(intensities[:mid_point]) / mid_point
        second_half_avg = sum(intensities[mid_point:]) / (len(intensities) - mid_point)
        
        diff = second_half_avg - first_half_avg
        
        if diff > 1.0:
            return 'empeorando'
        elif diff < -1.0:
            return 'mejorando'
        else:
            return 'estable'
    
    def _extract_topics(self, text: str):
        """
        Extrae y guarda temas mencionados en el texto
        
        Args:
            text: mensaje a analizar
        """
        topics_keywords = {
            'trabajo': ['trabajo', 'jefe', 'oficina', 'empleo', 'laboral', 'colega', 'empresa'],
            'familia': ['familia', 'papá', 'mamá', 'padre', 'madre', 'hermano', 'hermana', 'hijo', 'hija'],
            'pareja': ['pareja', 'novio', 'novia', 'esposo', 'esposa', 'relación', 'matrimonio'],
            'salud': ['enfermedad', 'dolor', 'médico', 'hospital', 'salud', 'enfermo', 'síntoma'],
            'economía': ['dinero', 'deuda', 'pagar', 'económico', 'financiero', 'plata', 'cuenta'],
            'estudios': ['universidad', 'examen', 'estudiar', 'tarea', 'clase', 'colegio', 'carrera'],
            'amigos': ['amigo', 'amiga', 'amistad', 'compañero'],
            'soledad': ['solo', 'soledad', 'aislado', 'abandonado'],
            'autoestima': ['feo', 'gordo', 'inútil', 'fracaso', 'malo', 'tonto']
        }
        
        text_lower = text.lower()
        for topic, keywords in topics_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                self.topics_discussed.add(topic)
    
    def _is_crisis_mention(self, text: str) -> bool:
        """
        Detecta si hay mención de crisis en el texto
        
        Args:
            text: mensaje a evaluar
            
        Returns:
            True si detecta crisis, False caso contrario
        """
        crisis_keywords = [
            'suicid', 'suicidio', 'matarme', 'quitarme la vida',
            'no quiero vivir', 'acabar con todo', 'mejor muerto',
            'no vale la pena vivir', 'terminar con mi vida',
            'hacerme daño', 'lastimarm', 'cortarme'
        ]
        
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in crisis_keywords)
    
    def get_behavioral_patterns(self) -> Dict:
        """
        Analiza patrones de comportamiento en la conversación
        
        Returns:
            Dict con métricas de engagement, verbosidad, etc.
        """
        if len(self.conversation_history) < 5:
            return {
                'engagement_level': 'bajo',
                'verbosity': 'normal',
                'response_speed': 'normal',
                'question_frequency': 'normal'
            }
        
        user_messages = [m for m in self.conversation_history if m['sender'] == 'user']
        
        if not user_messages:
            return {}
        
        # Longitud promedio de mensajes
        avg_word_count = sum(m['word_count'] for m in user_messages) / len(user_messages)
        
        # Frecuencia de preguntas
        questions_count = sum(1 for m in user_messages if m['has_question'])
        question_rate = questions_count / len(user_messages)
        
        # Calcular tiempo entre mensajes (si hay suficientes)
        time_gaps = []
        for i in range(1, len(user_messages)):
            gap = (user_messages[i]['timestamp'] - user_messages[i-1]['timestamp']).total_seconds()
            if gap < 600:  # Solo considerar gaps menores a 10 minutos
                time_gaps.append(gap)
        
        avg_gap = sum(time_gaps) / len(time_gaps) if time_gaps else 60
        
        return {
            'engagement_level': 'alto' if avg_word_count > 15 else 'medio' if avg_word_count > 8 else 'bajo',
            'verbosity': 'alto' if avg_word_count > 20 else 'medio' if avg_word_count > 10 else 'bajo',
            'response_speed': 'rápido' if avg_gap < 20 else 'pausado' if avg_gap > 60 else 'normal',
            'question_frequency': 'alto' if question_rate > 0.4 else 'medio' if question_rate > 0.2 else 'bajo',
            'avg_message_length': round(avg_word_count, 1),
            'total_user_messages': len(user_messages)
        }
    
    def should_summarize(self) -> bool:
        """
        Determina si es momento de hacer un resumen
        
        Returns:
            True si hay suficientes mensajes para resumir
        """
        return len(self.conversation_history) >= 20
    
    def generate_summary(self) -> str:
        """
        Genera un resumen legible de la conversación
        
        Returns:
            String con el resumen formateado
        """
        trajectory = self.get_emotional_trajectory()
        patterns = self.get_behavioral_patterns()
        
        topics_str = ', '.join(self.topics_discussed) if self.topics_discussed else 'ninguno específico'
        
        duration = datetime.now() - self.session_start
        duration_mins = int(duration.total_seconds() / 60)
        
        summary = f"""Resumen de nuestra conversación:

📊 Duración: {duration_mins} minutos
💭 Mensajes intercambiados: {len(self.conversation_history)}

😊 Estado emocional:
   • Emoción predominante: {trajectory['dominant_emotion']}
   • Tendencia: {trajectory['trend']}
   • Intensidad promedio: {trajectory['average_intensity']:.1f}/10
   • Cambios emocionales: {trajectory['emotion_switches']}

📌 Temas tratados: {topics_str}

💬 Participación:
   • Nivel de engagement: {patterns.get('engagement_level', 'medio')}
   • Promedio de palabras por mensaje: {patterns.get('avg_message_length', 0)}
"""
        
        if self.crisis_mentions:
            summary += f"\n⚠️ IMPORTANTE: Se detectaron {len(self.crisis_mentions)} mención(es) que requieren atención especial."
        
        return summary.strip()
    
    def get_stats(self) -> Dict:
        """
        Obtiene estadísticas completas de la conversación
        
        Returns:
            Dict con todas las métricas
        """
        return {
            'total_messages': len(self.conversation_history),
            'user_messages': len([m for m in self.conversation_history if m['sender'] == 'user']),
            'bot_messages': len([m for m in self.conversation_history if m['sender'] == 'bot']),
            'emotional_trajectory': self.get_emotional_trajectory(),
            'behavioral_patterns': self.get_behavioral_patterns(),
            'topics_discussed': list(self.topics_discussed),
            'crisis_mentions_count': len(self.crisis_mentions),
            'session_duration_minutes': int((datetime.now() - self.session_start).total_seconds() / 60)
        }


# ============================================
# GESTIÓN GLOBAL DE MEMORIA POR USUARIO
# ============================================

# Diccionario global para almacenar memorias de usuarios
_user_memories: Dict[str, ConversationMemory] = {}

def get_user_memory(user_id: str) -> ConversationMemory:
    """
    Obtiene o crea la memoria para un usuario específico
    
    Args:
        user_id: identificador único del usuario
        
    Returns:
        Instancia de ConversationMemory para ese usuario
    """
    if user_id not in _user_memories:
        _user_memories[user_id] = ConversationMemory(max_messages=50)
        print(f"✅ Nueva memoria creada para usuario: {user_id}")
    
    return _user_memories[user_id]

def clear_user_memory(user_id: str) -> bool:
    """
    Limpia la memoria de un usuario específico
    
    Args:
        user_id: identificador del usuario
        
    Returns:
        True si se limpió, False si no existía
    """
    if user_id in _user_memories:
        del _user_memories[user_id]
        print(f"🗑️ Memoria limpiada para usuario: {user_id}")
        return True
    return False

def get_all_active_users() -> List[str]:
    """
    Obtiene lista de todos los usuarios con memoria activa
    
    Returns:
        Lista de user_ids
    """
    return list(_user_memories.keys())