from transformers import pipeline
from typing import Dict, List, Optional
import numpy as np
from datetime import datetime
import re

class AdvancedEmotionAnalyzer:
    """
    Análisis emocional avanzado con múltiples capas de detección
    """
    
    def __init__(self):
        print("🤖 Inicializando analizador emocional avanzado...")
        
        try:
            self.emotion_classifier = pipeline(
                "text-classification",
                model="finiteautomata/beto-emotion-analysis",
                top_k=None,
                device=-1 
            )
            print("✅ Modelo de emociones cargado")
        except Exception as e:
            print(f"⚠️ Error cargando modelo de emociones: {e}")
            self.emotion_classifier = None
        
        try:
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="pysentimiento/robertuito-sentiment-analysis",
                device=-1
            )
            print("✅ Modelo de sentimiento cargado")
        except Exception as e:
            print(f"⚠️ Error cargando modelo de sentimiento: {e}")
            self.sentiment_analyzer = None
        
        # Diccionarios de modificadores
        self.intensifiers = {
            'muy': 1.3, 'mucho': 1.3, 'demasiado': 1.5, 'extremadamente': 1.7,
            'increíblemente': 1.5, 'bastante': 1.2, 'super': 1.4, 'súper': 1.4,
            'tan': 1.2, 'realmente': 1.3, 'totalmente': 1.4, 'completamente': 1.4,
            'absolutamente': 1.5, 'sumamente': 1.4, 'demasiadamente': 1.6
        }
        
        self.diminishers = {
            'poco': 0.7, 'algo': 0.8, 'un poco': 0.7, 'apenas': 0.6,
            'levemente': 0.7, 'ligeramente': 0.7, 'medio': 0.8,
            'casi': 0.9, 'relativamente': 0.8
        }
        
        print("✅ Analizador emocional listo")
    
    def comprehensive_analysis(self,
                              text: str,
                              context: Optional[str] = None,
                              emotional_history: Optional[List[Dict]] = None) -> Dict:
        """
        Análisis emocional completo con contexto e historial
        
        Args:
            text: mensaje actual a analizar
            context: contexto conversacional previo
            emotional_history: historial de emociones previas
            
        Returns:
            Dict con análisis completo
        """
        
        if not text or len(text.strip()) < 2:
            return self._default_analysis()
        
        # 1. Análisis base de emociones
        base_emotions = self._analyze_base_emotions(text)
        
        # 2. Análisis de sentimiento
        sentiment = self._analyze_sentiment(text)
        
        # 3. Detectar modificadores de intensidad
        intensity_modifier = self._detect_intensity_modifiers(text)
        
        # 4. Ajuste contextual
        contextual_adjustment = 0.0
        if context:
            contextual_adjustment = self._analyze_with_context(text, context)
        
        # 5. Coherencia emocional
        coherence_score = 1.0
        if emotional_history and len(emotional_history) >= 2:
            coherence_score = self._check_emotional_coherence(base_emotions, emotional_history)
        
        # 6. Detección de crisis avanzada
        crisis_analysis = self._advanced_crisis_detection(text, base_emotions, emotional_history)
        
        # 7. Calcular intensidad ajustada
        base_intensity = base_emotions['intensidad']
        adjusted_intensity = base_intensity * intensity_modifier * coherence_score
        adjusted_intensity += contextual_adjustment
        adjusted_intensity = float(np.clip(adjusted_intensity, 0, 10))
        
        # 8. Detectar emociones mixtas
        mixed_emotions = self._detect_mixed_emotions(text)
        
        return {
            'emocion_principal': base_emotions['emocion'],
            'intensidad_ajustada': round(adjusted_intensity, 2),
            'intensidad_base': base_intensity,
            'confianza': base_emotions['confianza'],
            'sentimiento': sentiment,
            'emociones_mixtas': mixed_emotions,
            'distribucion_emociones': base_emotions.get('distribucion', {}),
            'modificadores': {
                'intensificador': intensity_modifier,
                'contextual': contextual_adjustment,
                'coherencia': coherence_score
            },
            'analisis_crisis': crisis_analysis,
            'metadatos': {
                'timestamp': datetime.now().isoformat(),
                'longitud_palabras': len(text.split()),
                'longitud_caracteres': len(text),
                'tiene_contexto': context is not None,
                'tiene_historial': emotional_history is not None and len(emotional_history) > 0
            }
        }
    
    def _analyze_base_emotions(self, text: str) -> Dict:
        """Análisis base con el modelo BETO"""
        
        if not self.emotion_classifier:
            return self._default_emotion()
        
        try:
            results = self.emotion_classifier(text)[0]
            
            emotion_map = {
                'joy': 'alegría',
                'sadness': 'tristeza',
                'anger': 'enojo',
                'fear': 'ansiedad',
                'disgust': 'disgusto',
                'surprise': 'sorpresa',
                'others': 'neutral'
            }
            
            dominant = max(results, key=lambda x: x['score'])
            
            distribucion = {
                emotion_map.get(r['label'], r['label']): round(r['score'], 3)
                for r in results
            }
            
            return {
                'emocion': emotion_map.get(dominant['label'], 'neutral'),
                'intensidad': round(dominant['score'] * 10, 2),
                'confianza': dominant['score'],
                'distribucion': distribucion
            }
        except Exception as e:
            print(f"⚠️ Error en análisis de emociones: {e}")
            return self._default_emotion()
    
    def _analyze_sentiment(self, text: str) -> Dict:
        """Análisis de sentimiento"""
        
        if not self.sentiment_analyzer:
            return {'polaridad': 'neutral', 'score': 0.0}
        
        try:
            result = self.sentiment_analyzer(text)[0]
            
            sentiment_map = {
                'POS': 'positivo',
                'NEU': 'neutral',
                'NEG': 'negativo'
            }
            
            score = result['score'] if result['label'] == 'POS' else -result['score'] if result['label'] == 'NEG' else 0
            
            return {
                'polaridad': sentiment_map.get(result['label'], 'neutral'),
                'score': round(score, 3)
            }
        except Exception as e:
            print(f"⚠️ Error en análisis de sentimiento: {e}")
            return {'polaridad': 'neutral', 'score': 0.0}
    
    def _detect_intensity_modifiers(self, text: str) -> float:
        """Detecta intensificadores y atenuadores"""
        
        text_lower = text.lower()
        words = text_lower.split()
        
        modifier = 1.0
        
        # Intensificadores
        for word in words:
            if word in self.intensifiers:
                modifier *= self.intensifiers[word]
        
        # Atenuadores
        for word in words:
            if word in self.diminishers:
                modifier *= self.diminishers[word]
        
        # Signos de exclamación múltiples
        exclamation_count = text.count('!')
        if exclamation_count > 1:
            modifier *= (1 + exclamation_count * 0.1)
        
        # Mayúsculas sostenidas (gritar)
        uppercase_ratio = sum(1 for c in text if c.isupper()) / len(text) if text else 0
        if uppercase_ratio > 0.5:
            modifier *= 1.3
        
        # Puntos suspensivos (duda/tristeza)
        if '...' in text or text.count('.') > 3:
            modifier *= 1.1
        
        return float(np.clip(modifier, 0.5, 2.0))
    
    def _analyze_with_context(self, current_text: str, context: str) -> float:
        """Ajuste basado en contexto previo"""
        
        context_words = set(context.lower().split())
        current_words = set(current_text.lower().split())
        
        if not context_words or not current_words:
            return 0.0
        
        # Similitud léxica
        overlap = len(context_words & current_words)
        union = len(context_words | current_words)
        similarity = overlap / union if union > 0 else 0
        
        # Si hay continuidad temática, puede indicar persistencia
        if similarity > 0.3:
            return 0.5
        
        return 0.0
    
    def _check_emotional_coherence(self,
                                   current_emotion: Dict,
                                   emotional_history: List[Dict]) -> float:
        """Verifica coherencia con historial emocional"""
        
        if not emotional_history or len(emotional_history) < 2:
            return 1.0
        
        recent = emotional_history[-3:] if len(emotional_history) >= 3 else emotional_history
        recent_emotions = [e.get('emotion', 'neutral') for e in recent]
        recent_intensities = [e.get('intensity', 5.0) for e in recent]
        
        current_type = current_emotion['emocion']
        current_intensity = current_emotion['intensidad']
        
        # Detectar cambio emocional drástico
        if recent_emotions and current_type != recent_emotions[-1]:
            # Cambio de alegría a tristeza/ansiedad = alerta
            if recent_emotions[-1] == 'alegría' and current_type in ['tristeza', 'ansiedad']:
                return 1.2
        
        # Detectar escalada de intensidad
        if recent_intensities:
            avg_recent = sum(recent_intensities) / len(recent_intensities)
            if current_intensity > avg_recent + 2.5:
                return 1.3  # Escalada emocional
        
        return 1.0
    
    def _advanced_crisis_detection(self,
                                  text: str,
                                  emotions: Dict,
                                  emotional_history: Optional[List[Dict]]) -> Dict:
        """Detección de crisis multi-nivel"""
        
        risk_score = 0.0
        indicators = []
        
        text_lower = text.lower()
        
        # NIVEL 1: Palabras clave críticas (peso máximo)
        critical_words = [
            ('suicidio', 3.5), ('suicidarme', 3.5), ('matarme', 3.0),
            ('quitarme la vida', 3.5), ('acabar con mi vida', 3.5),
            ('no quiero vivir', 3.0), ('mejor muerto', 2.5)
        ]
        
        for word, weight in critical_words:
            if word in text_lower:
                risk_score += weight
                indicators.append(f"🚨 Mención crítica: '{word}'")
        
        # NIVEL 2: Indicadores graves
        grave_indicators = [
            ('no aguanto más', 2.0), ('no tiene sentido', 1.8),
            ('ya no puedo', 1.5), ('quiero desaparecer', 2.0),
            ('no hay salida', 2.0), ('todo ha terminado', 1.8)
        ]
        
        for phrase, weight in grave_indicators:
            if phrase in text_lower:
                risk_score += weight
                indicators.append(f"⚠️ Indicador grave: '{phrase}'")
        
        # NIVEL 3: Desesperanza
        hopelessness = [
            ('sin esperanza', 1.5), ('nada tiene sentido', 1.5),
            ('perdido', 1.0), ('vacío', 1.0), ('solo y abandonado', 1.5)
        ]
        
        for phrase, weight in hopelessness:
            if phrase in text_lower:
                risk_score += weight
                indicators.append(f"💔 Desesperanza: '{phrase}'")
        
        # NIVEL 4: Intensidad emocional extrema
        intensity = emotions.get('intensidad', 0)
        if intensity >= 9.0:
            risk_score += 2.0
            indicators.append(f"📊 Intensidad extrema: {intensity}/10")
        elif intensity >= 8.0:
            risk_score += 1.0
            indicators.append(f"📊 Intensidad muy alta: {intensity}/10")
        
        # NIVEL 5: Patrón histórico de deterioro
        if emotional_history and len(emotional_history) >= 4:
            recent = [e.get('intensity', 5) for e in emotional_history[-4:]]
            if all(i >= 7.5 for i in recent):
                risk_score += 1.5
                indicators.append("📉 Patrón sostenido de alta intensidad negativa")
        
        # NIVEL 6: Menciones de autolesión
        self_harm = ['cortarme', 'lastimarme', 'hacerme daño', 'pegarme']
        for word in self_harm:
            if word in text_lower:
                risk_score += 2.5
                indicators.append(f"🩹 Mención de autolesión: '{word}'")
        
        # Determinar nivel de crisis
        if risk_score >= 5.0:
            nivel = 'crítico'
        elif risk_score >= 3.0:
            nivel = 'alto'
        elif risk_score >= 1.5:
            nivel = 'medio'
        else:
            nivel = 'bajo'
        
        return {
            'nivel': nivel,
            'score': round(risk_score, 2),
            'indicadores': indicators,
            'requiere_intervencion': risk_score >= 3.0,
            'requiere_atencion_inmediata': risk_score >= 5.0
        }
    
    def _detect_mixed_emotions(self, text: str) -> List[str]:
        """Detecta emociones mixtas presentes"""
        
        if not self.emotion_classifier:
            return []
        
        try:
            results = self.emotion_classifier(text)[0]
            
            emotion_map = {
                'joy': 'alegría',
                'sadness': 'tristeza',
                'anger': 'enojo',
                'fear': 'ansiedad',
                'disgust': 'disgusto',
                'surprise': 'sorpresa'
            }
            
            # Emociones con score > 0.20
            mixed = [
                emotion_map.get(r['label'], r['label'])
                for r in results
                if r['score'] > 0.20 and r['label'] in emotion_map
            ]
            
            return mixed if len(mixed) > 1 else []
        
        except Exception as e:
            print(f"⚠️ Error detectando emociones mixtas: {e}")
            return []
    
    def _default_analysis(self) -> Dict:
        """Análisis por defecto cuando hay error"""
        return {
            'emocion_principal': 'neutral',
            'intensidad_ajustada': 5.0,
            'intensidad_base': 5.0,
            'confianza': 0.5,
            'sentimiento': {'polaridad': 'neutral', 'score': 0.0},
            'emociones_mixtas': [],
            'distribucion_emociones': {},
            'modificadores': {
                'intensificador': 1.0,
                'contextual': 0.0,
                'coherencia': 1.0
            },
            'analisis_crisis': {
                'nivel': 'bajo',
                'score': 0.0,
                'indicadores': [],
                'requiere_intervencion': False,
                'requiere_atencion_inmediata': False
            },
            'metadatos': {
                'timestamp': datetime.now().isoformat(),
                'longitud_palabras': 0,
                'longitud_caracteres': 0,
                'tiene_contexto': False,
                'tiene_historial': False
            }
        }
    
    def _default_emotion(self) -> Dict:
        """Emoción por defecto"""
        return {
            'emocion': 'neutral',
            'intensidad': 5.0,
            'confianza': 0.5,
            'distribucion': {}
        }


# Instancia global
print("🚀 Creando instancia global del analizador...")
advanced_analyzer = AdvancedEmotionAnalyzer()
print("✅ Analizador emocional avanzado listo para usar")