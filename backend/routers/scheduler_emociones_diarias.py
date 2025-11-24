# backend/scheduler_emociones_diarias.py
# ✅ CÁLCULO AUTOMÁTICO DE EMOCIONES DIARIAS DESDE CHAT
# Ejecutar con APScheduler a las 23:59 todos los días

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import Dict, List
import models
from database import SessionLocal, get_db
from mongodb_config import mongodb_service

def calcular_emociones_diarias():
    """
    Calcula las emociones del día desde las 00:00 hasta las 23:59
    Promedia todas las emociones detectadas en el chat
    Guarda en la tabla emociones_diarias en PostgreSQL
    """
    print(f"🕐 [{datetime.now()}] Iniciando cálculo de emociones diarias...")
    
    db = SessionLocal()
    
    try:
        # Obtener todos los pacientes activos
        pacientes = db.query(models.Usuario).filter(
            models.Usuario.rol == models.UserRole.PACIENTE,
            models.Usuario.activo == True
        ).all()
        
        print(f"📊 Procesando {len(pacientes)} pacientes...")
        
        fecha_hoy = date.today()
        
        for paciente in pacientes:
            try:
                # Obtener mensajes del chat de hoy desde MongoDB
                inicio_dia = datetime.combine(fecha_hoy, datetime.min.time())
                fin_dia = datetime.combine(fecha_hoy, datetime.max.time())
                
                mensajes_hoy = list(mongodb_service.emotional_texts.find({
                    "user_id": paciente.id_usuario,
                    "timestamp": {
                        "$gte": inicio_dia,
                        "$lte": fin_dia
                    },
                    "source": "chat"
                }))
                
                if not mensajes_hoy:
                    print(f"  ⏭️  Paciente {paciente.id_usuario} ({paciente.nombre}) - Sin mensajes hoy")
                    continue
                
                # Calcular promedios de emociones
                emociones_suma = {
                    'alegria': 0.0,
                    'tristeza': 0.0,
                    'ansiedad': 0.0,
                    'enojo': 0.0,
                    'miedo': 0.0
                }
                
                nivel_riesgo_suma = 0.0
                total_mensajes = len(mensajes_hoy)
                
                for mensaje in mensajes_hoy:
                    try:
                        emotions = mensaje.get('emotions', {})
                        all_emotions = emotions.get('all_emotions', {})
                        
                        # Mapeo de emociones en español
                        emotion_mapping = {
                            'alegría': 'alegria',
                            'alegria': 'alegria',
                            'joy': 'alegria',
                            'tristeza': 'tristeza',
                            'sadness': 'tristeza',
                            'ansiedad': 'ansiedad',
                            'anxiety': 'ansiedad',
                            'miedo': 'miedo',
                            'fear': 'miedo',
                            'enojo': 'enojo',
                            'anger': 'enojo',
                            'ira': 'enojo'
                        }
                        
                        for emocion_original, valor in all_emotions.items():
                            emocion_normalizada = emotion_mapping.get(emocion_original.lower())
                            if emocion_normalizada and emocion_normalizada in emociones_suma:
                                emociones_suma[emocion_normalizada] += float(valor)
                        
                        # Acumular nivel de riesgo
                        risk_assessment = mensaje.get('risk_assessment', {})
                        risk_score = risk_assessment.get('score', 0)
                        nivel_riesgo_suma += float(risk_score)
                        
                    except Exception as e:
                        print(f"    ⚠️  Error procesando mensaje: {e}")
                        continue
                
                # Calcular promedios
                emociones_promedio = {
                    emocion: round(suma / total_mensajes, 2)
                    for emocion, suma in emociones_suma.items()
                }
                
                nivel_riesgo_promedio = round(nivel_riesgo_suma / total_mensajes, 2)
                
                # Determinar emoción dominante
                emocion_dominante = max(emociones_promedio.items(), key=lambda x: x[1])[0]
                
                # Verificar si ya existe un registro para hoy
                registro_existente = db.query(models.EmocionDiaria).filter(
                    models.EmocionDiaria.id_usuario == paciente.id_usuario,
                    models.EmocionDiaria.fecha == fecha_hoy
                ).first()
                
                if registro_existente:
                    # Actualizar registro existente
                    registro_existente.alegria_promedio = emociones_promedio['alegria']
                    registro_existente.tristeza_promedio = emociones_promedio['tristeza']
                    registro_existente.ansiedad_promedio = emociones_promedio['ansiedad']
                    registro_existente.enojo_promedio = emociones_promedio['enojo']
                    registro_existente.miedo_promedio = emociones_promedio['miedo']
                    registro_existente.emocion_dominante = emocion_dominante
                    registro_existente.nivel_riesgo_promedio = nivel_riesgo_promedio
                    registro_existente.total_interacciones = total_mensajes
                    registro_existente.fecha_calculo = datetime.utcnow()
                    
                    print(f"  ✅ Paciente {paciente.id_usuario} ({paciente.nombre}) - Actualizado: {emocion_dominante} ({total_mensajes} interacciones)")
                else:
                    # Crear nuevo registro
                    nuevo_registro = models.EmocionDiaria(
                        id_usuario=paciente.id_usuario,
                        fecha=fecha_hoy,
                        alegria_promedio=emociones_promedio['alegria'],
                        tristeza_promedio=emociones_promedio['tristeza'],
                        ansiedad_promedio=emociones_promedio['ansiedad'],
                        enojo_promedio=emociones_promedio['enojo'],
                        miedo_promedio=emociones_promedio['miedo'],
                        emocion_dominante=emocion_dominante,
                        nivel_riesgo_promedio=nivel_riesgo_promedio,
                        total_interacciones=total_mensajes,
                        fecha_calculo=datetime.utcnow()
                    )
                    db.add(nuevo_registro)
                    
                    print(f"  ✅ Paciente {paciente.id_usuario} ({paciente.nombre}) - Creado: {emocion_dominante} ({total_mensajes} interacciones)")
                
                db.commit()
                
            except Exception as e:
                print(f"  ❌ Error procesando paciente {paciente.id_usuario}: {e}")
                db.rollback()
                continue
        
        print(f"✅ Cálculo de emociones diarias completado exitosamente")
        
    except Exception as e:
        print(f"❌ Error general en cálculo de emociones: {e}")
        db.rollback()
    finally:
        db.close()


def iniciar_scheduler():
    """
    Inicia el scheduler para ejecutar el cálculo de emociones diarias
    """
    scheduler = BackgroundScheduler()
    
    # Ejecutar todos los días a las 23:59
    scheduler.add_job(
        calcular_emociones_diarias,
        'cron',
        hour=23,
        minute=59,
        id='calcular_emociones_diarias',
        replace_existing=True
    )
    
    # OPCIONAL: Ejecutar también al inicio para calcular el día actual
    # scheduler.add_job(
    #     calcular_emociones_diarias,
    #     'date',
    #     run_date=datetime.now(),
    #     id='calcular_emociones_inicial'
    # )
    
    scheduler.start()
    print("🕐 Scheduler iniciado - Cálculo de emociones diarias a las 23:59")
    
    return scheduler


# ==================== ENDPOINT MANUAL PARA TESTING ====================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/emociones-diarias", tags=["Emociones Diarias"])

@router.post("/calcular-ahora")
async def calcular_emociones_ahora(
    db: Session = Depends(get_db)
):
    """
    ✅ Endpoint para ejecutar el cálculo de emociones manualmente
    Útil para testing y debugging
    """
    try:
        calcular_emociones_diarias()
        return {
            "mensaje": "Cálculo de emociones ejecutado exitosamente",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "mensaje": "Error al calcular emociones"
        }


@router.get("/emociones-diarias/{id_usuario}")
async def obtener_emociones_diarias(
    id_usuario: int,
    dias: int = 30,
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene las emociones diarias de un usuario
    """
    from datetime import timedelta
    
    fecha_inicio = date.today() - timedelta(days=dias)
    
    emociones = db.query(models.EmocionDiaria).filter(
        models.EmocionDiaria.id_usuario == id_usuario,
        models.EmocionDiaria.fecha >= fecha_inicio
    ).order_by(models.EmocionDiaria.fecha.desc()).all()
    
    return {
        "emociones_diarias": [
            {
                "fecha": emocion.fecha.isoformat(),
                "emocion_dominante": emocion.emocion_dominante,
                "alegria_promedio": emocion.alegria_promedio,
                "tristeza_promedio": emocion.tristeza_promedio,
                "ansiedad_promedio": emocion.ansiedad_promedio,
                "enojo_promedio": emocion.enojo_promedio,
                "miedo_promedio": emocion.miedo_promedio,
                "nivel_riesgo_promedio": emocion.nivel_riesgo_promedio,
                "total_interacciones": emocion.total_interacciones
            }
            for emocion in emociones
        ],
        "total_dias": len(emociones)
    }