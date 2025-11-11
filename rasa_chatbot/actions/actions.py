# rasa_chatbot/actions/actions.py

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
from transformers import pipeline
from datetime import datetime
import requests
import os

# ============================================
# ANÁLISIS EMOCIONAL CON HUGGINGFACE
# ============================================

print("🤖 Cargando modelo de análisis emocional...")
emotion_classifier = pipeline(
    "text-classification",
    model="finiteautomata/beto-emotion-analysis",
    top_k=None
)
print("✅ Modelo cargado exitosamente")

def analizar_emocion_texto(texto: str) -> Dict:
    """
    Analiza el texto y devuelve la emoción principal y su intensidad
    """
    try:
        resultados = emotion_classifier(texto)[0]
        
        mapeo_emociones = {
            'joy': 'feliz',
            'sadness': 'triste',
            'anger': 'enojado',
            'fear': 'ansioso',
            'disgust': 'frustrado',
            'surprise': 'confundido',
            'others': 'neutral'
        }
        
        emocion_principal = max(resultados, key=lambda x: x['score'])
        
        return {
            'emocion': mapeo_emociones.get(emocion_principal['label'], 'neutral'),
            'intensidad': round(emocion_principal['score'] * 10, 1),
            'confianza': emocion_principal['score'],
            'todas_emociones': resultados
        }
    except Exception as e:
        print(f"❌ Error analizando emoción: {e}")
        return {
            'emocion': 'neutral',
            'intensidad': 5.0,
            'confianza': 0.5,
            'todas_emociones': []
        }


# ============================================
# DETECCIÓN DE CRISIS
# ============================================

PALABRAS_CRISIS = [
    'suicidio', 'suicidarme', 'matarme', 'acabar con todo', 'no quiero vivir',
    'hacerme daño', 'terminar con mi vida', 'no vale la pena vivir',
    'mejor muerto', 'no aguanto más vivir', 'quiero desaparecer',
    'plan para terminar', 'última vez', 'despedirme de todos',
    'no quiero estar aquí', 'quisiera no existir', 'morir', 'muerte'
]

def detectar_crisis(texto: str) -> bool:
    """
    Detecta si el mensaje indica una posible crisis
    """
    texto_lower = texto.lower()
    
    # Buscar palabras clave de crisis
    tiene_palabra_crisis = any(palabra in texto_lower for palabra in PALABRAS_CRISIS)
    
    # Patrones adicionales
    patrones_crisis = [
        'no quiero seguir',
        'ya no puedo más',
        'quiero acabar',
        'mejor no estar',
        'no tiene sentido seguir'
    ]
    
    tiene_patron = any(patron in texto_lower for patron in patrones_crisis)
    
    return tiene_palabra_crisis or tiene_patron


# ============================================
# COMUNICACIÓN CON BACKEND
# ============================================

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

def guardar_en_mongodb(paciente_id: int, emocion: str, intensidad: float, mensaje: str, contexto: str = "chat_rasa"):
    """
    Guarda el registro emocional en MongoDB a través del backend
    """
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/registros-emocionales",
            json={
                "paciente_id": paciente_id,
                "emocion_principal": emocion,
                "intensidad": intensidad,
                "mensaje": mensaje,
                "contexto": contexto,
                "timestamp": datetime.now().isoformat()
            },
            timeout=5
        )
        return response.json() if response.ok else None
    except Exception as e:
        print(f"❌ Error guardando en MongoDB: {e}")
        return None


# ============================================
# ACCIONES PERSONALIZADAS
# ============================================

class ActionAnalizarEmocion(Action):
    """
    Analiza la emoción del último mensaje del usuario con HuggingFace
    """
    
    def name(self) -> Text:
        return "action_analizar_emocion"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        ultimo_mensaje = tracker.latest_message.get('text', '')
        
        if not ultimo_mensaje:
            return []
        
        analisis = analizar_emocion_texto(ultimo_mensaje)
        
        print(f"🔍 Análisis - Emoción: {analisis['emocion']}, Intensidad: {analisis['intensidad']}/10, Confianza: {analisis['confianza']:.2f}")
        
        return [
            SlotSet("emocion_actual", analisis['emocion']),
            SlotSet("intensidad_emocional", str(analisis['intensidad']))
        ]


class ActionGuardarEmocion(Action):
    """
    Guarda la emoción detectada en MongoDB
    """
    
    def name(self) -> Text:
        return "action_guardar_emocion"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        ultimo_mensaje = tracker.latest_message.get('text', '')
        emocion = tracker.get_slot('emocion_actual') or 'neutral'
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        sender_id = tracker.sender_id
        
        # Extraer paciente_id del sender_id (formato: "paciente_123")
        try:
            if sender_id.startswith("paciente_"):
                paciente_id = int(sender_id.split("_")[1])
            else:
                paciente_id = 1  # Default para testing
        except:
            paciente_id = 1
        
        resultado = guardar_en_mongodb(
            paciente_id=paciente_id,
            emocion=emocion,
            intensidad=intensidad,
            mensaje=ultimo_mensaje,
            contexto="chat_rasa"
        )
        
        if resultado:
            print(f"✅ Emoción guardada en MongoDB: {emocion} ({intensidad}/10) - Paciente {paciente_id}")
        else:
            print(f"⚠️ No se pudo guardar en MongoDB (modo offline)")
        
        return []


class ActionDetectarCrisis(Action):
    """
    Detecta mensajes que indican crisis y alerta
    """
    
    def name(self) -> Text:
        return "action_detectar_crisis"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        ultimo_mensaje = tracker.latest_message.get('text', '')
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        # Detectar crisis por palabras clave o intensidad muy alta
        es_crisis = detectar_crisis(ultimo_mensaje) or intensidad >= 9.5
        
        if es_crisis:
            print("🚨 ⚠️ CRISIS DETECTADA ⚠️ 🚨")
            dispatcher.utter_message(response="utter_crisis")
            
            # Intentar notificar al backend
            try:
                sender_id = tracker.sender_id
                if sender_id.startswith("paciente_"):
                    paciente_id = int(sender_id.split("_")[1])
                else:
                    paciente_id = 1
                
                requests.post(
                    f"{BACKEND_URL}/api/alertas/crisis",
                    json={
                        "paciente_id": paciente_id,
                        "mensaje": ultimo_mensaje,
                        "intensidad": intensidad,
                        "timestamp": datetime.now().isoformat()
                    },
                    timeout=3
                )
                print(f"✅ Alerta de crisis enviada al backend para paciente {paciente_id}")
            except Exception as e:
                print(f"⚠️ No se pudo enviar alerta al backend: {e}")
        
        return []


class ActionSugerirTecnica(Action):
    """
    Sugiere técnicas de regulación emocional según la emoción
    """
    
    def name(self) -> Text:
        return "action_sugerir_tecnica"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        emocion = tracker.get_slot('emocion_actual') or 'neutral'
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        if emocion in ['ansioso', 'estresado'] and intensidad >= 6:
            dispatcher.utter_message(
                text="Cuando la ansiedad es intensa, la respiración puede ser tu mejor aliada 🌬️ "
                     "¿Te gustaría que te guíe en una técnica de respiración rápida?"
            )
        elif emocion in ['enojado', 'frustrado'] and intensidad >= 6:
            dispatcher.utter_message(
                text="El enojo puede nublar nuestra mente 💭 Una técnica que ayuda es el grounding: "
                     "enfocarte en tu cuerpo y el presente. ¿Quieres intentarlo?"
            )
        elif intensidad >= 8:
            dispatcher.utter_message(
                text="Noto que la intensidad de lo que sientes es muy alta 💙 "
                     "¿Te parece si probamos una técnica de regulación emocional? "
                     "Podría ayudarte a sentirte un poco más en control."
            )
        else:
            dispatcher.utter_message(
                text="Recuerda que siempre puedes usar técnicas de respiración consciente "
                     "o mindfulness cuando sientas que las emociones te sobrepasan 🌟"
            )
        
        return []


class ActionDarSeguimiento(Action):
    """
    Da seguimiento preguntando cómo se siente después de hablar
    """
    
    def name(self) -> Text:
        return "action_dar_seguimiento"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        dispatcher.utter_message(response="utter_seguimiento_como_te_sientes")
        return []


class ActionValidarIntensidad(Action):
    """
    Valida y responde según la intensidad emocional reportada
    """
    
    def name(self) -> Text:
        return "action_validar_intensidad"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        if intensidad >= 8:
            dispatcher.utter_message(response="utter_validar_intensidad_alta")
        elif intensidad >= 6:
            dispatcher.utter_message(
                text="Entiendo, es una intensidad considerable 💙 No es fácil cuando llega a ese nivel. "
                     "¿Hay algo específico que esté aumentando esta intensidad?"
            )
        else:
            dispatcher.utter_message(
                text="Entiendo 💚 Aunque no sea muy intenso, es importante que lo expreses."
            )
        
        return []


class ActionDefaultFallback(Action):
    """
    Respuesta empática cuando el bot no entiende
    """
    
    def name(self) -> Text:
        return "action_default_fallback"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        ultimo_mensaje = tracker.latest_message.get('text', '')
        
        # Analizar emoción incluso si no entendió la intención
        if ultimo_mensaje:
            analisis = analizar_emocion_texto(ultimo_mensaje)
            
            dispatcher.utter_message(
                text=f"Perdona, no estoy seguro de haber entendido del todo 😔 "
                     f"Pero puedo sentir en tus palabras que hay {analisis['emocion']}. "
                     f"¿Podrías contármelo de otra forma? Quiero entenderte mejor 💙"
            )
            
            return [
                SlotSet("emocion_actual", analisis['emocion']),
                SlotSet("intensidad_emocional", str(analisis['intensidad']))
            ]
        
        dispatcher.utter_message(response="utter_default")
        return []