# rasa_chatbot/actions/actions.py

from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet, FollowupAction
from datetime import datetime

# Importar módulos personalizados
from actions.memory_manager import get_user_memory
from actions.advanced_emotion_analyzer import advanced_analyzer
from actions.database_connector import backend_connector

# ============================================
# ACTIONS PRINCIPALES
# ============================================

class ActionAnalizarEmocionAvanzado(Action):
    """
    Análisis emocional avanzado con contexto completo
    """
    
    def name(self) -> Text:
        return "action_analizar_emocion_avanzado"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Obtener mensaje actual
        current_message = tracker.latest_message.get('text', '')
        
        if not current_message or len(current_message.strip()) < 2:
            return []
        
        # Obtener memoria del usuario
        user_id = tracker.sender_id
        memory = get_user_memory(user_id)
        
        # Obtener contexto conversacional
        context = memory.get_conversation_context(last_n=5)
        
        # Obtener historial emocional
        emotional_history = memory.emotional_timeline[-10:] if memory.emotional_timeline else None
        
        # Análisis emocional completo
        analysis = advanced_analyzer.comprehensive_analysis(
            text=current_message,
            context=context,
            emotional_history=emotional_history
        )
        
        # Guardar en memoria
        memory.add_message(
            sender='user',
            text=current_message,
            emotion={
                'emocion': analysis['emocion_principal'],
                'intensidad': analysis['intensidad_ajustada']
            }
        )
        
        # Guardar en backend (MongoDB)
        backend_connector.save_emotional_analysis(user_id, current_message, analysis)
        
        # Log detallado en consola
        self._print_analysis_log(user_id, current_message, analysis)
        
        # Preparar eventos para Rasa
        events = [
            SlotSet("emocion_actual", analysis['emocion_principal']),
            SlotSet("intensidad_emocional", str(analysis['intensidad_ajustada'])),
            SlotSet("nivel_crisis", analysis['analisis_crisis']['nivel']),
            SlotSet("confianza_analisis", str(analysis['confianza']))
        ]
        
        # Si hay crisis crítica, activar protocolo inmediatamente
        if analysis['analisis_crisis']['requiere_atencion_inmediata']:
            events.append(FollowupAction("action_protocolo_crisis"))
        
        return events
    
    def _print_analysis_log(self, user_id: str, message: str, analysis: Dict):
        """Imprime log detallado del análisis"""
        
        print(f"\n{'='*70}")
        print(f"🔍 ANÁLISIS EMOCIONAL AVANZADO")
        print(f"{'='*70}")
        print(f"👤 Usuario: {user_id}")
        print(f"💬 Mensaje: {message[:100]}{'...' if len(message) > 100 else ''}")
        print(f"")
        print(f"😊 Emoción principal: {analysis['emocion_principal']}")
        print(f"📊 Intensidad base: {analysis['intensidad_base']}/10")
        print(f"📈 Intensidad ajustada: {analysis['intensidad_ajustada']}/10")
        print(f"✅ Confianza: {analysis['confianza']:.2%}")
        
        if analysis['emociones_mixtas']:
            print(f"🎭 Emociones mixtas: {', '.join(analysis['emociones_mixtas'])}")
        
        print(f"")
        print(f"🎚️ Modificadores:")
        print(f"   • Intensificador: {analysis['modificadores']['intensificador']:.2f}x")
        print(f"   • Contextual: +{analysis['modificadores']['contextual']:.2f}")
        print(f"   • Coherencia: {analysis['modificadores']['coherencia']:.2f}x")
        
        print(f"")
        crisis = analysis['analisis_crisis']
        print(f"⚠️ Análisis de Crisis:")
        print(f"   • Nivel: {crisis['nivel'].upper()}")
        print(f"   • Score: {crisis['score']:.2f}")
        print(f"   • Requiere intervención: {'SÍ' if crisis['requiere_intervencion'] else 'NO'}")
        
        if crisis['indicadores']:
            print(f"   • Indicadores detectados:")
            for ind in crisis['indicadores']:
                print(f"     {ind}")
        
        print(f"{'='*70}\n")


class ActionRespuestaContextual(Action):
    """
    Genera respuestas personalizadas considerando todo el contexto
    """
    
    def name(self) -> Text:
        return "action_respuesta_contextual"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        user_id = tracker.sender_id
        memory = get_user_memory(user_id)
        
        # Obtener estado emocional actual
        emocion = tracker.get_slot('emocion_actual') or 'neutral'
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        nivel_crisis = tracker.get_slot('nivel_crisis') or 'bajo'
        
        # Obtener trayectoria emocional
        trajectory = memory.get_emotional_trajectory()
        
        # Obtener patrones de comportamiento
        patterns = memory.get_behavioral_patterns()
        
        # Generar respuesta personalizada
        response = self._generate_personalized_response(
            emocion, intensidad, nivel_crisis, trajectory, patterns
        )
        
        dispatcher.utter_message(text=response)
        
        # Guardar respuesta del bot en memoria
        memory.add_message(
            sender='bot',
            text=response
        )
        
        return []
    
    def _generate_personalized_response(self,
                                       emocion: str,
                                       intensidad: float,
                                       nivel_crisis: str,
                                       trajectory: Dict,
                                       patterns: Dict) -> str:
        """
        Genera respuesta personalizada basada en contexto completo
        """
        
        # Respuestas base por emoción
        emotion_responses = {
            'tristeza': [
                "Puedo sentir que la tristeza está siendo muy pesada para ti. ",
                "Noto que estás atravesando un momento difícil emocionalmente. ",
                "Percibo profunda tristeza en lo que compartes. "
            ],
            'ansiedad': [
                "Siento la ansiedad en tus palabras. ",
                "Puedo notar que los nervios están siendo intensos ahora. ",
                "Percibo mucha inquietud en lo que me cuentas. "
            ],
            'enojo': [
                "Noto frustración y enojo en lo que expresas. ",
                "Puedo sentir que algo te está molestando profundamente. ",
                "Percibo irritación en tus palabras. "
            ],
            'alegría': [
                "Me alegra notar esa energía positiva. ",
                "Es maravilloso percibir esa alegría en ti. ",
                "Qué bueno sentir ese ánimo positivo. "
            ],
            'neutral': [
                "Te escucho con atención. ",
                "Estoy aquí para ti. ",
                "Gracias por compartir esto conmigo. "
            ]
        }
        
        # Seleccionar respuesta base
        import random
        base = random.choice(emotion_responses.get(emocion, emotion_responses['neutral']))
        
        # Ajustar según intensidad
        if intensidad >= 9.0:
            intensity_note = "Y puedo ver que es realmente intenso lo que estás experimentando. "
        elif intensidad >= 7.5:
            intensity_note = "Veo que esto no es algo leve para ti. "
        elif intensidad >= 6.0:
            intensity_note = "Noto que tiene un peso considerable. "
        else:
            intensity_note = ""
        
        # Considerar trayectoria emocional
        trend = trajectory.get('trend', 'estable')
        if trend == 'empeorando':
            trend_note = "Además, noto que las cosas han ido intensificándose últimamente. "
        elif trend == 'mejorando':
            trend_note = "Por otro lado, veo señales de que has ido mejorando gradualmente. "
        else:
            trend_note = ""
        
        # Pregunta de seguimiento empática
        if intensidad >= 8.0:
            followup = "¿Qué es lo que más te está pesando en este preciso momento? Estoy aquí para escucharte sin juzgar."
        elif intensidad >= 6.0:
            followup = "¿Hay algo específico que esté contribuyendo a que te sientas así?"
        else:
            followup = "¿Quieres contarme un poco más sobre esto?"
        
        return (base + intensity_note + trend_note + followup).strip()


class ActionProtocoloCrisis(Action):
    """
    Protocolo de intervención para situaciones de crisis
    """
    
    def name(self) -> Text:
        return "action_protocolo_crisis"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        nivel_crisis = tracker.get_slot('nivel_crisis') or 'bajo'
        user_id = tracker.sender_id
        current_message = tracker.latest_message.get('text', '')
        
        # Obtener análisis de crisis del contexto
        memory = get_user_memory(user_id)
        
        if nivel_crisis in ['crítico', 'alto']:
            # Enviar alerta al backend
            crisis_info = {
                'nivel': nivel_crisis,
                'score': 5.0 if nivel_crisis == 'crítico' else 3.5,
                'indicadores': ['Detección automática de crisis']
            }
            backend_connector.send_crisis_alert(user_id, current_message, crisis_info)
            
            # Respuesta de crisis inmediata
            response = """⚠️ ⚠️ ⚠️ LO QUE ME COMPARTES ME PREOCUPA PROFUNDAMENTE ⚠️ ⚠️ ⚠️

Tu seguridad es LA PRIORIDAD AHORA MISMO.

🆘 SI ESTÁS EN PELIGRO INMEDIATO:
   ▪ Llama YA al 911 (Emergencias)
   ▪ Ve a la sala de emergencias más cercana

📞 LÍNEAS DE AYUDA DISPONIBLES 24/7:
   ▪ Línea Nacional de Prevención del Suicidio: 1-800-273-8255
   ▪ Crisis Text Line: Envía "HOLA" al 741741
   ▪ Ecuador - Ministerio de Salud: 171

👨‍⚕️ CONTACTA A TU PSICÓLOGO AHORA:
   Es fundamental que hables con tu terapeuta lo antes posible.

👥 BUSCA COMPAÑÍA:
   ¿Hay alguien de confianza cerca de ti? No te quedes solo/a.

💙 TU VIDA TIENE VALOR. No estás solo/a en esto.

¿Hay alguien contigo ahora mismo? ¿Puedes hacer una de estas llamadas AHORA?"""
            
        elif nivel_crisis == 'medio':
            response = """💙 Noto que estás pasando por un momento muy difícil.

Es muy importante que:

📞 Contactes a tu psicólogo pronto
   - No dejes pasar mucho tiempo para hablar de esto

👥 No te quedes solo/a con estos pensamientos
   - Busca a alguien de confianza con quien hablar

📝 Considera escribir lo que sientes
   - A veces ayuda sacar los pensamientos

Si en algún momento sientes que las cosas empeoran, por favor contacta ayuda profesional inmediatamente.

¿Cuándo es tu próxima sesión con tu psicólogo? ¿Crees que necesitas adelantarla?"""
        
        else:
            # No debería llegar aquí, pero por seguridad
            response = """Entiendo que estás pasando por un momento complicado 💙

Recuerda que tu psicólogo está para ayudarte a procesar esto.
¿Te gustaría hablar un poco más sobre lo que sientes?"""
        
        dispatcher.utter_message(text=response)
        
        return []


class ActionResumenConversacion(Action):
    """
    Genera un resumen de la conversación cuando es apropiado
    """
    
    def name(self) -> Text:
        return "action_resumen_conversacion"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        user_id = tracker.sender_id
        memory = get_user_memory(user_id)
        
        # Solo hacer resumen si hay suficiente conversación
        if not memory.should_summarize():
            return []
        
        # Generar resumen
        summary = memory.generate_summary()
        
        response = f"""💭 Hagamos una pausa para recapitular un momento 💙

{summary}

Este resumen me ayuda a entender mejor tu situación. ¿Hay algo de lo que hemos hablado que quieras profundizar más? ¿O quizás hay algo importante que no hayamos tocado aún?"""
        
        dispatcher.utter_message(text=response.strip())
        
        return []


class ActionSugerirTecnica(Action):
    """
    Sugiere técnicas de regulación emocional según el contexto
    """
    
    def name(self) -> Text:
        return "action_sugerir_tecnica"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        emocion = tracker.get_slot('emocion_actual') or 'neutral'
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        if emocion == 'ansiedad' and intensidad >= 7.0:
            response = """🌬️ La ansiedad puede ser abrumadora. Te propongo algo que puede ayudarte AHORA MISMO:

**RESPIRACIÓN 4-7-8** (muy efectiva para ansiedad):

1️⃣ Inhala por la nariz contando hasta 4
2️⃣ Sostén el aire contando hasta 7
3️⃣ Exhala completamente por la boca contando hasta 8

Repítelo 4 veces seguidas.

¿Puedes intentarlo ahora? Te espero. Tómate tu tiempo."""

        elif emocion == 'enojo' and intensidad >= 6.5:
            response = """🧘 El enojo puede nublar nuestra mente. Te sugiero esta técnica:

**GROUNDING 5-4-3-2-1** (te trae al presente):

Mira a tu alrededor y nombra:
5️⃣ cosas que VES
4️⃣ cosas que TOCAS
3️⃣ cosas que ESCUCHAS
2️⃣ cosas que HUELES
1️⃣ cosa que SABOREAS

Hazlo lentamente, con atención plena en cada cosa.

¿Quieres intentarlo?"""

        elif intensidad >= 8.5:
            response = """💙 Cuando la intensidad emocional es tan alta, tu cuerpo necesita regulación.

**TÉCNICA RÁPIDA** (2 minutos):

1. Pon tus pies firmemente en el suelo
2. Presiona tus manos una contra otra
3. Respira profundo 5 veces
4. Di en voz alta: "Estoy aquí, estoy seguro/a, esto va a pasar"

Esta técnica ayuda a tu sistema nervioso a calmarse.

¿Puedes hacerlo ahora? No es magia, pero sí ayuda."""

        else:
            response = """💚 Recuerda que siempre tienes herramientas disponibles:

- **Respiración consciente** cuando sientas ansiedad
- **Caminar** cuando necesites despejar la mente
- **Escribir** cuando los pensamientos te abrumen
- **Hablar con alguien** cuando te sientas solo/a

¿Alguna de estas te ha funcionado antes?"""
        
        dispatcher.utter_message(text=response)
        
        return []


class ActionGuardarEmocion(Action):
    """
    Guarda el análisis emocional completo en el backend
    """
    
    def name(self) -> Text:
        return "action_guardar_emocion"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        # Esta acción ya se ejecuta dentro de ActionAnalizarEmocionAvanzado
        # La dejamos por compatibilidad con las stories existentes
        return []


class ActionDarSeguimiento(Action):
    """
    Hace seguimiento preguntando cómo se siente después de una técnica
    """
    
    def name(self) -> Text:
        return "action_dar_seguimiento"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        intensidad_actual = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        if intensidad_actual >= 8.0:
            response = "¿Cómo te sientes después de intentar eso? Incluso un pequeño cambio es importante. 💙"
        else:
            response = "¿Cómo te sientes ahora? ¿Hubo algún cambio? 🌟"
        
        dispatcher.utter_message(text=response)
        
        return []


class ActionDefaultFallback(Action):
    """
    Respuesta empática cuando el bot no entiende la intención
    """
    
    def name(self) -> Text:
        return "action_default_fallback"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        ultimo_mensaje = tracker.latest_message.get('text', '')
        
        if ultimo_mensaje and len(ultimo_mensaje) > 3:
            # Analizar emoción aunque no se haya entendido la intención
            user_id = tracker.sender_id
            memory = get_user_memory(user_id)
            context = memory.get_conversation_context(last_n=3)
            
            analysis = advanced_analyzer.comprehensive_analysis(
                text=ultimo_mensaje,
                context=context
            )
            
            emocion = analysis['emocion_principal']
            
            response = f"""Disculpa, no estoy seguro de haber entendido completamente 😔

Pero puedo sentir {emocion} en tus palabras. ¿Podrías explicármelo de otra forma? Quiero entenderte bien. 💙

A veces ayuda si lo dices con tus propias palabras, sin preocuparte por cómo suena."""
            
            dispatcher.utter_message(text=response)
            
            return [
                SlotSet("emocion_actual", emocion),
                SlotSet("intensidad_emocional", str(analysis['intensidad_ajustada']))
            ]
        
        dispatcher.utter_message(response="utter_default")
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
        
        if intensidad >= 9.0:
            response = """Eso es un nivel MUY alto 💙 

Cuando algo llega a 9 o 10, es señal de que realmente necesitas apoyo. No tienes que manejarlo solo/a.

¿Hay algo que podamos hacer AHORA para ayudarte a sentirte aunque sea un poco más seguro/a?"""

        elif intensidad >= 7.5:
            response = """Entiendo, eso es una intensidad considerable 💙

No es fácil cuando llega a ese nivel. Es valiente de tu parte reconocerlo y compartirlo.

¿Qué crees que está haciendo que sea tan intenso en este momento?"""

        elif intensidad >= 6.0:
            response = """Comprendo 💚 

Aunque no esté en el nivel más alto, sigue siendo significativo y merece atención.

¿Cómo has estado manejándolo hasta ahora?"""
        
        else:
            response = """Entiendo 💚

Gracias por ser honesto/a sobre cómo te sientes. Cada emoción es importante, sin importar su intensidad."""
        
        dispatcher.utter_message(text=response)
        
        return []

# Agregar al final de actions/actions.py

class ActionValidarAnsiedad(Action):
    """
    Valida y responde específicamente a ansiedad
    """
    
    def name(self) -> Text:
        return "action_validar_ansiedad"
    
    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:
        
        intensidad = float(tracker.get_slot('intensidad_emocional') or 5.0)
        
        if intensidad >= 8.0:
            response = """La ansiedad a ese nivel puede ser muy abrumadora 💙

Es como si tu mente no pudiera detenerse, ¿verdad? Tu cuerpo también lo siente.

¿Hay algo específico que esté disparando esta ansiedad ahora mismo?"""
        
        elif intensidad >= 6.0:
            response = """Entiendo perfectamente esa sensación de ansiedad 💚

Muchas personas la experimentan. Es incómoda pero manejable.

¿Has notado si hay momentos del día donde se intensifica más?"""
        
        else:
            response = """La ansiedad puede manifestarse de muchas formas 🌟

Incluso a nivel moderado, es importante atenderla.

¿Cuándo comenzaste a sentirte así?"""
        
        dispatcher.utter_message(text=response)
        
        return []