# backend/procesar_emociones_daemon.py
# ✅ PROCESADOR DE EMOCIONES CON MODO DAEMON
# Puede correr continuamente en background chequeando cada X minutos

import sys
import os
import time
import signal
from datetime import datetime, timedelta

# Agregar el directorio raíz al path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from mongodb_config import mongodb_service
import models

# Configuración
INTERVALO_MINUTOS = 5  # Cada cuántos minutos procesar
MODO_DAEMON = False  # Cambiar a True para correr continuamente

# Variable global para control
running = True

def signal_handler(sig, frame):
    """Maneja señal de interrupción (Ctrl+C)"""
    global running
    print("\n\n🛑 Deteniendo procesador...")
    running = False

# Registrar handler para Ctrl+C
signal.signal(signal.SIGINT, signal_handler)

def procesar_emociones():
    """
    Lee emotional_texts de MongoDB y crea registros en PostgreSQL
    """
    db = SessionLocal()
    
    try:
        # Obtener documentos de MongoDB de las últimas 24 horas
        hace_24h = datetime.utcnow() - timedelta(hours=24)
        
        documentos = list(mongodb_service.emotional_texts.find({
            "timestamp": {"$gte": hace_24h},
            "source": "chat"
        }).sort("timestamp", -1))
        
        if not documentos:
            print(f"⏰ {datetime.now().strftime('%H:%M:%S')} - No hay documentos nuevos")
            return
        
        print(f"\n{'='*70}")
        print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📊 Encontrados {len(documentos)} documentos en MongoDB")
        print(f"{'='*70}")
        
        procesados = 0
        creados = 0
        existentes = 0
        
        for doc in documentos:
            try:
                user_id = doc.get('user_id')
                timestamp = doc.get('timestamp')
                
                if not user_id or not timestamp:
                    continue
                
                # Verificar si ya existe un registro para este timestamp
                registro_existente = db.query(models.RegistroEmocional).filter(
                    models.RegistroEmocional.id_usuario == user_id,
                    models.RegistroEmocional.fecha_hora == timestamp,
                    models.RegistroEmocional.origen == "chat"
                ).first()
                
                if registro_existente:
                    existentes += 1
                    continue
                
                # Extraer datos del análisis
                emotions = doc.get('emotions', {})
                sentiment = doc.get('sentiment', {})
                risk = doc.get('risk_assessment', {})
                
                # Mapear intensidad a nivel_animo (1-10)
                intensidad = emotions.get('intensity', 5)
                nivel_animo = int(intensidad) if intensidad else 5
                
                # Mapear nivel_riesgo a enum
                nivel_riesgo_str = risk.get('level', 'bajo').lower()
                nivel_riesgo_enum = {
                    'bajo': models.RiskLevel.BAJO,
                    'medio': models.RiskLevel.MODERADO,
                    'moderado': models.RiskLevel.MODERADO,
                    'alto': models.RiskLevel.ALTO
                }.get(nivel_riesgo_str, models.RiskLevel.BAJO)
                
                # Crear registro emocional
                nuevo_registro = models.RegistroEmocional(
                    id_usuario=user_id,
                    nivel_animo=nivel_animo,
                    emocion_principal=emotions.get('dominant_emotion', 'neutral'),
                    sentimiento_score=sentiment.get('sentiment_score', 0),
                    nivel_riesgo=nivel_riesgo_enum,
                    notas=f"Auto-procesado desde chat - Confianza: {emotions.get('confidence', 0):.2%}",
                    origen="chat",
                    fecha_hora=timestamp
                )
                
                db.add(nuevo_registro)
                db.commit()
                
                creados += 1
                
                # Emoji según emoción
                emoji_emocion = {
                    'alegría': '😊', 'tristeza': '😢', 'enojo': '😠',
                    'miedo': '😨', 'sorpresa': '😲', 'neutral': '😐',
                    'ansiedad': '😰', 'calma': '😌'
                }.get(emotions.get('dominant_emotion', 'neutral'), '💭')
                
                print(f"{emoji_emocion} Usuario {user_id}: {emotions.get('dominant_emotion')} ({nivel_animo}/10) - Riesgo: {nivel_riesgo_str}")
                
                # Si es alto riesgo, crear notificación
                if nivel_riesgo_enum == models.RiskLevel.ALTO:
                    asignacion = db.query(models.PacientePsicologo).filter(
                        models.PacientePsicologo.id_paciente == user_id,
                        models.PacientePsicologo.activo == True
                    ).first()
                    
                    if asignacion:
                        hace_2h = datetime.utcnow() - timedelta(hours=2)
                        notif_existente = db.query(models.Notificacion).filter(
                            models.Notificacion.id_usuario == asignacion.id_psicologo,
                            models.Notificacion.tipo == models.NotificationType.ALERTA,
                            models.Notificacion.fecha_creacion >= hace_2h
                        ).first()
                        
                        if not notif_existente:
                            paciente = db.query(models.Usuario).filter(
                                models.Usuario.id_usuario == user_id
                            ).first()
                            
                            notificacion = models.Notificacion(
                                id_usuario=asignacion.id_psicologo,
                                tipo=models.NotificationType.ALERTA,
                                titulo="⚠️ Alerta de Alto Riesgo Emocional",
                                mensaje=f"El paciente {paciente.nombre} {paciente.apellido} mostró alto riesgo en el chat",
                                prioridad="critica",
                                enviada=False,
                                leida=False
                            )
                            db.add(notificacion)
                            db.commit()
                            print(f"   ⚠️ Alerta enviada al psicólogo")
                
                procesados += 1
                
            except Exception as e:
                print(f"❌ Error procesando documento: {e}")
                db.rollback()
                continue
        
        # Resumen
        print(f"{'─'*70}")
        print(f"✅ Creados: {creados} | ℹ️ Existentes: {existentes} | ❌ Errores: {len(documentos) - procesados}")
        print(f"{'='*70}\n")
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def modo_continuo():
    """
    Ejecuta el procesador continuamente cada X minutos
    """
    global running
    
    print("\n" + "="*70)
    print("🔄 PROCESADOR DE EMOCIONES - MODO DAEMON")
    print("="*70)
    print(f"⏰ Intervalo: {INTERVALO_MINUTOS} minutos")
    print(f"🛑 Presiona Ctrl+C para detener")
    print("="*70 + "\n")
    
    while running:
        try:
            procesar_emociones()
            
            if running:  # Solo esperar si no se detuvo
                print(f"😴 Esperando {INTERVALO_MINUTOS} minutos...")
                print(f"🕐 Próxima ejecución: {(datetime.now() + timedelta(minutes=INTERVALO_MINUTOS)).strftime('%H:%M:%S')}\n")
                
                # Esperar con check cada segundo para responder rápido a Ctrl+C
                for _ in range(INTERVALO_MINUTOS * 60):
                    if not running:
                        break
                    time.sleep(1)
        
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"❌ Error en modo continuo: {e}")
            if running:
                print(f"⏳ Reintentando en 60 segundos...")
                time.sleep(60)
    
    print("\n✅ Procesador detenido correctamente\n")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Procesador de emociones MongoDB → PostgreSQL')
    parser.add_argument('--daemon', action='store_true', help='Ejecutar en modo continuo')
    parser.add_argument('--interval', type=int, default=5, help='Intervalo en minutos (default: 5)')
    
    args = parser.parse_args()
    
    INTERVALO_MINUTOS = args.interval
    
    if args.daemon:
        print("🚀 Iniciando en modo DAEMON...")
        modo_continuo()
    else:
        print("🚀 Ejecutando procesamiento único...")
        procesar_emociones()
        print("✅ Procesamiento completado\n")