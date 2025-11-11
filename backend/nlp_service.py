from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import torch
from typing import Dict, Tuple

class EmotionalAnalysisService:
    def __init__(self):
        # Modelo de análisis de sentimientos en español
        self.sentiment_model = "pysentimiento/robertuito-sentiment-analysis"
        self.sentiment_analyzer = pipeline(
            "sentiment-analysis",
            model=self.sentiment_model,
            tokenizer=self.sentiment_model
        )
        
        # Modelo de detección de emociones en español
        self.emotion_model = "pysentimiento/robertuito-emotion-analysis"
        self.emotion_analyzer = pipeline(
            "text-classification",
            model=self.emotion_model,
            tokenizer=self.emotion_model,
            top_k=None
        )
        
    def analyze_sentiment(self, text: str) -> Dict:
        """
        Analiza el sentimiento del texto
        Retorna: {'label': 'POS/NEU/NEG', 'score': float}
        """
        try:
            result = self.sentiment_analyzer(text)[0]
            
            # Convertir a escala -1 a 1
            sentiment_score = 0
            if result['label'] == 'POS':
                sentiment_score = result['score']
            elif result['label'] == 'NEG':
                sentiment_score = -result['score']
            
            return {
                'label': result['label'],
                'score': result['score'],
                'sentiment_score': sentiment_score
            }
        except Exception as e:
            print(f"Error en análisis de sentimiento: {e}")
            return {'label': 'NEU', 'score': 0.5, 'sentiment_score': 0}
    
    def analyze_emotions(self, text: str) -> Dict:
        """
        Detecta emociones en el texto
        Emociones: joy, sadness, anger, fear, surprise, disgust
        """
        try:
            results = self.emotion_analyzer(text)[0]
            
            # Obtener la emoción dominante
            dominant_emotion = max(results, key=lambda x: x['score'])
            
            # Mapeo a español
            emotion_map = {
                'joy': 'alegría',
                'sadness': 'tristeza',
                'anger': 'enojo',
                'fear': 'miedo',
                'surprise': 'sorpresa',
                'disgust': 'disgusto'
            }
            
            emotions_dict = {}
            for item in results:
                emotion_name = emotion_map.get(item['label'], item['label'])
                emotions_dict[emotion_name] = round(item['score'], 3)
            
            return {
                'dominant_emotion': emotion_map.get(dominant_emotion['label'], dominant_emotion['label']),
                'confidence': dominant_emotion['score'],
                'all_emotions': emotions_dict
            }
        except Exception as e:
            print(f"Error en análisis de emociones: {e}")
            return {
                'dominant_emotion': 'desconocida',
                'confidence': 0,
                'all_emotions': {}
            }
    
    def comprehensive_analysis(self, text: str) -> Dict:
        """
        Análisis completo: sentimiento + emociones
        """
        sentiment = self.analyze_sentiment(text)
        emotions = self.analyze_emotions(text)
        
        # Evaluación de riesgo basada en emociones negativas
        risk_score = 0
        if 'tristeza' in emotions['all_emotions']:
            risk_score += emotions['all_emotions']['tristeza'] * 0.4
        if 'miedo' in emotions['all_emotions']:
            risk_score += emotions['all_emotions']['miedo'] * 0.3
        if sentiment['sentiment_score'] < -0.5:
            risk_score += 0.3
        
        risk_level = "bajo"
        if risk_score > 0.7:
            risk_level = "alto"
        elif risk_score > 0.4:
            risk_level = "medio"
        
        return {
            'sentiment': sentiment,
            'emotions': emotions,
            'risk_assessment': {
                'score': round(risk_score, 3),
                'level': risk_level
            }
        }

# Instancia global del servicio
nlp_service = EmotionalAnalysisService()

def analyze_text(text: str) -> Dict:
    """Función auxiliar para análisis rápido"""
    return nlp_service.comprehensive_analysis(text)