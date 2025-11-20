# rasa_chatbot/actions/actions.py
# REEMPLAZAR TODO EL ARCHIVO

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
import datetime
import numpy as np
from transformers import pipeline
import torch
from groq import Groq
import os
from dotenv import load_dotenv
import random

# Cargar variables de entorno
load_dotenv()

# ============================================================================
# CONFIGURACIÓN INICIAL
# ============================================================================

print("🔄 Cargando modelos de análisis emocional...")

try:
    emotion_classifier = pipeline(
        "text-classification",
        model="finiteautomata/beto-emotion-analysis",
        top_k=None,
        device=0 if torch.cuda.is_available() else -1
    )
    print("✅ Modelo de emociones cargado")
except Exception as e:
    print(f"⚠️ Error cargando modelo de emociones: {e}")
    emotion_classifier = None

try:
    sentiment_classifier = pipeline(
        "sentiment-analysis",
        model="nlptown/bert-base-multilingual-uncased-sentiment",
        device=0 if torch.cuda.is_available() else -1
    )
    print("✅ Modelo de sentimiento cargado")
except Exception as e:
    print(f"⚠️ Error cargando modelo de sentimiento: {e}")
    sentiment_classifier = None

print("🎉 Analizador emocional listo\n")

# ============================================================================
# ACTION: ANÁLISIS EMOCIONAL AVANZADO
# ============================================================================

class ActionAnalizarEmocionAvanzado(Action):
    """Analiza las emociones del usuario usando modelos de IA"""
    
    def name(self) -> Text:
        return "action_analizar_emocion_avanzado"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        texto = tracker.latest_message.get('text', '')
        user_id = tracker.sender_id
        
        if not texto:
            return []
        
        print(f"\n{'='*70}")
        print(f"🔍 ANÁLISIS EMOCIONAL AVANZADO")
        print(f"{'='*70}")
        print(f"👤 Usuario: {user_id}")
        print(f"💬 Mensaje: {texto}")
        
        emocion_principal = "neutral"
        intensidad = 5.0
        confianza = 0.0
        
        if emotion_classifier:
            try:
                resultados = emotion_classifier(texto)[0]
                emocion_principal = resultados[0]['label']
                confianza = resultados[0]['score']
                
                mapeo_emociones = {
                    'joy': 'alegría',
                    'sadness': 'tristeza',
                    'anger': 'enojo',
                    'fear': 'miedo',
                    'surprise': 'sorpresa',
                    'others': 'neutral'
                }
                
                emocion_principal = mapeo_emociones.get(emocion_principal, emocion_principal)
                
                print(f"😊 Emoción principal: {emocion_principal}")
                print(f"✅ Confianza: {confianza*100:.2f}%")
                
            except Exception as e:
                print(f"⚠️ Error en análisis de emoción: {e}")
        
        if sentiment_classifier:
            try:
                sent_result = sentiment_classifier(texto)[0]
                estrellas = int(sent_result['label'].split()[0])
                intensidad = (estrellas / 5.0) * 10.0
                print(f"📊 Intensidad base: {intensidad:.2f}/10")
            except Exception as e:
                print(f"⚠️ Error en análisis de sentimiento: {e}")
        
        # DETECCIÓN DE CRISIS MEJORADA
        texto_lower = texto.lower()
        nivel_crisis = "bajo"
        score_crisis = 0
        
        # Palabras críticas (cada una suma 3 puntos)
        palabras_criticas = [
            'suicidio', 'suicidarme', 'matarme', 'matar me',
            'acabar con mi vida', 'terminar con todo',
            'no quiero vivir', 'no quiero seguir viviendo',
            'quiero morir', 'quiero morirme',
            'mejor muerto', 'mejor muerta',
            'no vale la pena vivir', 'no vale la pena seguir',
            'quiero desaparecer',
            'prefiero estar muerto', 'prefiero estar muerta'
        ]
        
        # Palabras de riesgo moderado (cada una suma 2 puntos)
        palabras_riesgo = [
            'morir', 'muerte', 'desaparecer', 'acabar',
            'terminar', 'ya no puedo', 'no puedo más',
            'no aguanto más', 'no soporto más'
        ]
        
        # Palabras de contexto negativo (cada una suma 1 punto)
        palabras_negativas = [
            'dolor', 'sufrimiento', 'solo', 'sola',
            'desesperado', 'desesperada', 'sin salida',
            'sin esperanza', 'perdido', 'perdida'
        ]
        
        # Contar palabras críticas
        for palabra in palabras_criticas:
            if palabra in texto_lower:
                score_crisis += 3
                print(f"🚨 Palabra crítica detectada: '{palabra}' (+3 puntos)")
        
        # Contar palabras de riesgo
        for palabra in palabras_riesgo:
            if palabra in texto_lower:
                score_crisis += 2
                print(f"⚠️ Palabra de riesgo detectada: '{palabra}' (+2 puntos)")
        
        # Contar palabras negativas
        for palabra in palabras_negativas:
            if palabra in texto_lower:
                score_crisis += 1
                print(f"⚡ Palabra negativa detectada: '{palabra}' (+1 punto)")
        
        # Determinar nivel de crisis
        if score_crisis >= 5:
            nivel_crisis = "crítico"
            intensidad = 10.0
        elif score_crisis >= 3:
            nivel_crisis = "alto"
            intensidad = max(intensidad, 8.0)
        elif score_crisis >= 2:
            nivel_crisis = "moderado"
            intensidad = max(intensidad, 6.0)
        else:
            nivel_crisis = "bajo"
        
        print(f"📊 Score de crisis: {score_crisis} puntos")
        print(f"📈 Intensidad ajustada: {intensidad:.2f}/10")
        print(f"⚠️ Análisis de Crisis:")
        print(f"   • Nivel: {nivel_crisis.upper()}")
        print(f"   • Score: {score_crisis}/10")
        print(f"   • Requiere intervención: {'SÍ ⚠️⚠️⚠️' if nivel_crisis in ['crítico', 'alto'] else 'NO'}")
        print(f"{'='*70}\n")
        
        return [
            SlotSet("emocion_detectada", emocion_principal),
            SlotSet("intensidad_emocional", intensidad),
            SlotSet("nivel_crisis", nivel_crisis),
            SlotSet("emocion_actual", emocion_principal),
            SlotSet("confianza_analisis", confianza)
        ]


# ============================================================================
# ACTION: RESPUESTA CON GROQ (LLAMA 3.3 70B)
# ============================================================================

class ActionRespuestaConGroq(Action):
    """
    Genera respuestas naturales con Groq (Llama 3.3 70B)
    """
    
    def name(self) -> Text:
        return "action_respuesta_con_ia"
    
    def __init__(self):
        super().__init__()
        api_key = os.getenv('GROQ_API_KEY', '')
        
        if not api_key:
            print("⚠️⚠️⚠️ ERROR: GROQ_API_KEY no encontrada ⚠️⚠️⚠️")
            print("Crea el archivo rasa_chatbot/.env con:")
            print("GROQ_API_KEY=tu_key_aqui")
        else:
            print(f"✅ Groq configurado correctamente")
            print(f"🔑 API Key: {api_key[:20]}...{api_key[-10:]}")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"
        
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        print(f"\n{'='*70}")
        print(f"🚀 GENERANDO RESPUESTA CON GROQ (LLAMA 3.3 70B)")
        print(f"{'='*70}")
        
        emocion = tracker.get_slot("emocion_detectada") or "neutral"
        intensidad = tracker.get_slot("intensidad_emocional") or 5.0
        nivel_crisis = tracker.get_slot("nivel_crisis") or "bajo"
        ultimo_mensaje = tracker.latest_message.get('text', '')
        
        print(f"💬 Mensaje: {ultimo_mensaje}")
        print(f"😊 Emoción: {emocion} (intensidad: {intensidad}/10)")
        print(f"⚠️ Nivel crisis: {nivel_crisis}")
        
        # Construir historial
        eventos = tracker.events
        historial = []
        contador = 0
        
        for evento in reversed(eventos):
            if contador >= 6:
                break
                
            if evento.get('event') == 'user':
                texto = evento.get('text', '')
                if texto and texto != ultimo_mensaje:
                    historial.insert(0, {"role": "user", "content": texto})
                    contador += 1
            elif evento.get('event') == 'bot':
                texto = evento.get('text', '')
                if texto and not texto.startswith('¡Hola!'):  # Ignorar saludo inicial
                    historial.insert(0, {"role": "assistant", "content": texto})
        
        # System prompt
        system_prompt = f"""Eres un psicólogo empático y profesional especializado en apoyo emocional.

CONTEXTO EMOCIONAL DEL PACIENTE:
- Emoción actual: {emocion}
- Intensidad emocional: {intensidad}/10
- Nivel de crisis: {nivel_crisis}

INSTRUCCIONES IMPORTANTES:
1. Responde SIEMPRE en español
2. Sé breve y conciso (máximo 3 oraciones)
3. Usa máximo 1 emoji por respuesta
4. Valida las emociones del paciente genuinamente
5. Haz preguntas abiertas que inviten a profundizar
6. Mantén un tono cálido, cercano y profesional
7. NO des diagnósticos médicos ni consejos específicos
8. Enfócate en escuchar y comprender

{"⚠️ ALERTA DE CRISIS: El paciente puede estar en riesgo. Muestra preocupación inmediata, valida sus sentimientos y sugiere buscar ayuda profesional urgente." if nivel_crisis in ['crítico', 'alto'] else ""}

Responde con empatía genuina al mensaje del paciente."""

        try:
            # Construir mensajes
            mensajes = [{"role": "system", "content": system_prompt}]
            mensajes.extend(historial)
            mensajes.append({"role": "user", "content": ultimo_mensaje})
            
            print(f"📨 Enviando {len(mensajes)} mensajes a Groq...")
            
            # Llamar a Groq
            chat_completion = self.client.chat.completions.create(
                messages=mensajes,
                model=self.model,
                temperature=0.8,
                max_tokens=150,
                top_p=0.9,
                stream=False
            )
            
            respuesta = chat_completion.choices[0].message.content.strip()
            
            print(f"✅ Respuesta generada: {respuesta}")
            print(f"🔢 Tokens usados: {chat_completion.usage.total_tokens}")
            print(f"{'='*70}\n")
            
            dispatcher.utter_message(text=respuesta)
            
        except Exception as e:
            print(f"❌ Error con Groq: {e}")
            print(f"Tipo de error: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            
            # Fallback inteligente
            if nivel_crisis in ['crítico', 'alto']:
                fallback = [
                    "Noto que estás pasando por un momento extremadamente difícil. 💙 Tu seguridad es lo más importante. Por favor, contacta inmediatamente a un profesional o llama al 911. ¿Hay alguien de confianza que pueda estar contigo ahora?",
                    "Me preocupa mucho cómo te sientes. 💚 Es crucial que busques ayuda profesional inmediata. ¿Puedo ayudarte a encontrar recursos de emergencia?"
                ]
            else:
                fallback = [
                    f"Entiendo que te sientas {emocion}. 💙 Es importante validar lo que sientes. ¿Puedes contarme más sobre lo que está pasando?",
                    f"Te escucho con atención. 💚 ¿Qué más te gustaría compartir sobre cómo te sientes en este momento?",
                    f"Gracias por confiar en mí. 😊 ¿Hay algo específico que te esté afectando más?"
                ]
            
            dispatcher.utter_message(text=random.choice(fallback))
        
        return []


# ============================================================================
# ACTION: GUARDAR CONVERSACIÓN
# ============================================================================

class ActionGuardarConversacion(Action):
    """Guarda la conversación"""
    
    def name(self) -> Text:
        return "action_guardar_conversacion"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        sender_id = tracker.sender_id
        emocion = tracker.get_slot("emocion_detectada")
        intensidad = tracker.get_slot("intensidad_emocional")
        nivel_crisis = tracker.get_slot("nivel_crisis")
        
        try:
            user_id = sender_id.replace("paciente_", "")
            print(f"💾 Guardando: Usuario={user_id}, Emoción={emocion}, Intensidad={intensidad}, Crisis={nivel_crisis}")
        except Exception as e:
            print(f"⚠️ Error guardando: {e}")
        
        return []