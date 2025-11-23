from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, time, timedelta
import bcrypt

import models
import schemas
from database import get_db
from auth import get_current_user
from email_service import send_credentials, generate_temp_password, send_appointment_reminder
from mongodb_config import get_database

router = APIRouter(prefix="/psicologos", tags=["Psicólogos"])

# ==================== GESTIÓN DE PACIENTES ====================

@router.post("/registrar-paciente")
def registrar_paciente(
    paciente_data: schemas.PacienteCreateByPsicologo,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Registra un nuevo paciente y envía credenciales por correo
    """
    # Verificar que sea psicólogo
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden registrar pacientes"
        )
    
    # Verificar si el email ya existe
    existing_user = db.query(models.Usuario).filter(
        models.Usuario.email == paciente_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado en el sistema"
        )
    
    # Verificar si la cédula ya existe
    if paciente_data.cedula:
        existing_cedula = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula
        ).first()
        
        if existing_cedula:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada en el sistema"
            )
    
    # ✅ Generar contraseña temporal
    password_temporal = generate_temp_password(12)
    
    # Hashear contraseña
    hashed_password = bcrypt.hashpw(
        password_temporal.encode('utf-8'),
        bcrypt.gensalt()
    )
    
    # Crear usuario paciente
    nuevo_paciente = models.Usuario(
        email=paciente_data.email,
        password_hash=hashed_password.decode('utf-8'),
        nombre=paciente_data.nombre,
        apellido=paciente_data.apellido,
        cedula=paciente_data.cedula,
        fecha_nacimiento=paciente_data.fecha_nacimiento,
        telefono=paciente_data.telefono,
        direccion=paciente_data.direccion,
        rol=models.UserRole.PACIENTE,
        requiere_cambio_password=True  # ✅ Forzar cambio de contraseña
    )
    
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)
    
    # Asignar al psicólogo
    asignacion = models.PacientePsicologo(
        id_paciente=nuevo_paciente.id_usuario,
        id_psicologo=current_user.id_usuario,
        activo=True
    )
    
    db.add(asignacion)
    db.commit()
    
    # ✅ Enviar credenciales por correo
    nombre_completo = f"{nuevo_paciente.nombre} {nuevo_paciente.apellido}"
    nombre_psicologo = f"{current_user.nombre} {current_user.apellido}"
    
    try:
        email_sent = send_credentials(
            to_email=nuevo_paciente.email,
            nombre=nombre_completo,
            email_login=nuevo_paciente.email,
            password=password_temporal,
            psicologo=nombre_psicologo
        )
        
        if not email_sent:
            print(f"⚠️ No se pudo enviar el correo a {nuevo_paciente.email}")
    except Exception as e:
        print(f"❌ Error enviando correo: {e}")
    
    return {
        "mensaje": "Paciente registrado exitosamente. Se han enviado las credenciales por correo.",
        "paciente": {
            "id": nuevo_paciente.id_usuario,
            "nombre": nombre_completo,
            "cedula": nuevo_paciente.cedula,
            "email": nuevo_paciente.email,
            "telefono": nuevo_paciente.telefono
        }
    }

@router.get("/mis-pacientes")
def obtener_mis_pacientes(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene todos los pacientes asignados al psicólogo
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    # Obtener asignaciones activas
    asignaciones = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).all()
    
    pacientes_info = []
    
    for asignacion in asignaciones:
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == asignacion.id_paciente
        ).first()
        
        if not paciente:
            continue
        
        # Calcular estadísticas
        fecha_limite = datetime.utcnow() - timedelta(days=7)
        
        registros_semana = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == paciente.id_usuario,
            models.RegistroEmocional.fecha_hora >= fecha_limite
        ).all()
        
        promedio_animo = 0
        if registros_semana:
            promedio_animo = sum(r.nivel_animo for r in registros_semana) / len(registros_semana)
        
        alertas_activas = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == paciente.id_usuario,
            models.RegistroEmocional.alertas_activadas == True,
            models.RegistroEmocional.fecha_hora >= fecha_limite
        ).count()
        
        pacientes_info.append({
            "id_paciente": paciente.id_usuario,
            "nombre_completo": f"{paciente.nombre} {paciente.apellido}",
            "email": paciente.email,
            "cedula": paciente.cedula,
            "telefono": paciente.telefono,
            "fecha_nacimiento": paciente.fecha_nacimiento,
            "direccion": paciente.direccion,
            "fecha_registro": paciente.fecha_registro,
            "registros_ultima_semana": len(registros_semana),
            "promedio_animo_7dias": round(promedio_animo, 1),
            "alertas_activas": alertas_activas
        })
    
    return {"pacientes": pacientes_info}

@router.get("/paciente/{id_paciente}")
def obtener_paciente(
    id_paciente: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene información detallada de un paciente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    # Verificar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == id_paciente
    ).first()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    return {
        "id_paciente": paciente.id_usuario,
        "nombre": paciente.nombre,
        "apellido": paciente.apellido,
        "cedula": paciente.cedula,
        "email": paciente.email,
        "telefono": paciente.telefono,
        "fecha_nacimiento": paciente.fecha_nacimiento,
        "direccion": paciente.direccion,
        "fecha_registro": paciente.fecha_registro,
        "activo": paciente.activo
    }

@router.put("/paciente/{id_paciente}")
def actualizar_paciente(
    id_paciente: int,
    paciente_data: schemas.PacienteUpdate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Actualiza la información de un paciente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden editar pacientes")
    
    # Verificar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == id_paciente
    ).first()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Verificar email único
    if paciente_data.email and paciente_data.email != paciente.email:
        existing = db.query(models.Usuario).filter(
            models.Usuario.email == paciente_data.email
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
    
    # Verificar cédula única
    if paciente_data.cedula and paciente_data.cedula != paciente.cedula:
        existing = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="La cédula ya está en uso")
    
    # Actualizar campos
    if paciente_data.nombre:
        paciente.nombre = paciente_data.nombre
    if paciente_data.apellido:
        paciente.apellido = paciente_data.apellido
    if paciente_data.cedula:
        paciente.cedula = paciente_data.cedula
    if paciente_data.email:
        paciente.email = paciente_data.email
    if paciente_data.telefono:
        paciente.telefono = paciente_data.telefono
    if paciente_data.fecha_nacimiento:
        paciente.fecha_nacimiento = paciente_data.fecha_nacimiento
    if paciente_data.direccion:
        paciente.direccion = paciente_data.direccion
    
    db.commit()
    db.refresh(paciente)
    
    return {
        "mensaje": "Paciente actualizado exitosamente",
        "paciente": {
            "id": paciente.id_usuario,
            "nombre": f"{paciente.nombre} {paciente.apellido}",
            "cedula": paciente.cedula,
            "email": paciente.email,
            "telefono": paciente.telefono
        }
    }

@router.delete("/paciente/{id_paciente}")
def eliminar_paciente(
    id_paciente: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Elimina (desactiva) un paciente del sistema
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden eliminar pacientes")
    
    # Verificar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == id_paciente
    ).first()
    
    if not paciente:
        raise HTTPException(status_code=404, detail="Paciente no encontrado")
    
    # Desactivar paciente (soft delete)
    paciente.activo = False
    asignacion.activo = False
    
    db.commit()
    
    return {
        "mensaje": f"Paciente {paciente.nombre} {paciente.apellido} eliminado exitosamente",
        "id_paciente": id_paciente
    }

# ==================== HISTORIAL DE CHAT ====================

@router.get("/paciente/{id_paciente}/historial-chat")
def obtener_historial_chat(
    id_paciente: int,
    limit: int = 50,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene el historial de chat del paciente con el bot
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    # Verificar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    # Obtener de PostgreSQL
    mensajes_pg = db.query(models.MensajeChat).filter(
        models.MensajeChat.id_usuario == id_paciente
    ).order_by(models.MensajeChat.fecha_hora.desc()).limit(limit).all()
    
    # Obtener de MongoDB si está disponible
    try:
        mongo_db = get_database()
        mensajes_mongo = list(mongo_db.chat_logs.find({
            "user_id": id_paciente
        }).sort("timestamp", -1).limit(limit))
    except Exception as e:
        print(f"Error obteniendo de MongoDB: {e}")
        mensajes_mongo = []
    
    # Combinar y formatear mensajes
    historial = []
    
    for msg in mensajes_pg:
        historial.append({
            "id": msg.id_mensaje,
            "mensaje": msg.mensaje,
            "es_bot": msg.es_bot,
            "fecha_hora": msg.fecha_hora.isoformat(),
            "emocion_detectada": msg.emocion_detectada,
            "sentimiento": msg.sentimiento_mensaje,
            "fuente": "postgresql"
        })
    
    for msg in mensajes_mongo:
        historial.append({
            "id": str(msg.get("_id")),
            "mensaje": msg.get("message"),
            "es_bot": msg.get("is_bot", False),
            "fecha_hora": msg.get("timestamp").isoformat() if msg.get("timestamp") else None,
            "emocion_detectada": msg.get("emotional_analysis", {}).get("emotions", {}).get("dominant_emotion"),
            "sentimiento": msg.get("emotional_analysis", {}).get("sentiment", {}).get("sentiment_score"),
            "fuente": "mongodb"
        })
    
    # Ordenar por fecha
    historial.sort(key=lambda x: x["fecha_hora"] if x["fecha_hora"] else "", reverse=True)
    
    return {
        "total_mensajes": len(historial),
        "mensajes": historial[:limit]
    }

# ==================== GESTIÓN DE CITAS ====================

@router.post("/citas")
def crear_cita(
    cita_data: schemas.CitaCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Crea una nueva cita para un paciente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden crear citas")
    
    # Verificar que el paciente esté asignado
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == cita_data.id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    # Verificar disponibilidad (opcional)
    conflicto = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario,
        models.Cita.fecha == cita_data.fecha,
        models.Cita.hora_inicio == cita_data.hora_inicio,
        models.Cita.estado != models.AppointmentStatus.CANCELADA
    ).first()
    
    if conflicto:
        raise HTTPException(status_code=400, detail="Ya tienes una cita programada a esa hora")
    
    # Crear cita
    nueva_cita = models.Cita(
        id_paciente=cita_data.id_paciente,
        id_psicologo=current_user.id_usuario,
        fecha=cita_data.fecha,
        hora_inicio=cita_data.hora_inicio,
        hora_fin=cita_data.hora_fin,
        duracion_minutos=cita_data.duracion_minutos,
        modalidad=cita_data.modalidad,
        url_videollamada=cita_data.url_videollamada,
        notas_previas=cita_data.notas_previas,
        objetivos=cita_data.objetivos,
        estado=models.AppointmentStatus.PROGRAMADA
    )
    
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    
    return {
        "mensaje": "Cita creada exitosamente",
        "cita": {
            "id_cita": nueva_cita.id_cita,
            "fecha": str(nueva_cita.fecha),
            "hora": str(nueva_cita.hora_inicio),
            "modalidad": nueva_cita.modalidad
        }
    }

@router.get("/citas")
def obtener_mis_citas(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene todas las citas del psicólogo
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    query = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario
    )
    
    if fecha_inicio:
        query = query.filter(models.Cita.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(models.Cita.fecha <= fecha_fin)
    
    citas = query.order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()
    
    citas_info = []
    for cita in citas:
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == cita.id_paciente
        ).first()
        
        citas_info.append({
            "id_cita": cita.id_cita,
            "paciente": {
                "id": paciente.id_usuario,
                "nombre": f"{paciente.nombre} {paciente.apellido}"
            },
            "fecha": str(cita.fecha),
            "hora_inicio": str(cita.hora_inicio),
            "hora_fin": str(cita.hora_fin) if cita.hora_fin else None,
            "duracion_minutos": cita.duracion_minutos,
            "estado": cita.estado,
            "modalidad": cita.modalidad,
            "url_videollamada": cita.url_videollamada,
            "notas_previas": cita.notas_previas,
            "notas_sesion": cita.notas_sesion,
            "fecha_creacion": cita.fecha_creacion.isoformat()
        })
    
    return {"citas": citas_info}

@router.put("/citas/{id_cita}")
def actualizar_cita(
    id_cita: int,
    cita_data: schemas.CitaUpdate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Actualiza una cita existente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden editar citas")
    
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == id_cita,
        models.Cita.id_psicologo == current_user.id_usuario
    ).first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    # Actualizar campos
    if cita_data.fecha:
        cita.fecha = cita_data.fecha
    if cita_data.hora_inicio:
        cita.hora_inicio = cita_data.hora_inicio
    if cita_data.hora_fin:
        cita.hora_fin = cita_data.hora_fin
    if cita_data.estado:
        cita.estado = cita_data.estado
    if cita_data.notas_sesion:
        cita.notas_sesion = cita_data.notas_sesion
    if cita_data.tareas_asignadas:
        cita.tareas_asignadas = cita_data.tareas_asignadas
    if cita_data.url_videollamada:
        cita.url_videollamada = cita_data.url_videollamada
    
    cita.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(cita)
    
    return {
        "mensaje": "Cita actualizada exitosamente",
        "cita": {
            "id_cita": cita.id_cita,
            "fecha": str(cita.fecha),
            "hora": str(cita.hora_inicio),
            "estado": cita.estado
        }
    }

@router.delete("/citas/{id_cita}")
def cancelar_cita(
    id_cita: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Cancela una cita
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden cancelar citas")
    
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == id_cita,
        models.Cita.id_psicologo == current_user.id_usuario
    ).first()
    
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    
    cita.estado = models.AppointmentStatus.CANCELADA
    cita.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    
    return {
        "mensaje": "Cita cancelada exitosamente",
        "id_cita": id_cita
    }

# ==================== REGISTROS EMOCIONALES DEL PACIENTE ====================

@router.get("/paciente/{id_paciente}/registros-emocionales")
def obtener_registros_emocionales(
    id_paciente: int,
    dias: int = 30,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene los registros emocionales de un paciente
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden acceder")
    
    # Verificar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)
    
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == id_paciente,
        models.RegistroEmocional.fecha_hora >= fecha_inicio
    ).order_by(models.RegistroEmocional.fecha_hora.desc()).all()
    
    registros_info = []
    for registro in registros:
        registros_info.append({
            "id_registro": registro.id_registro,
            "fecha_hora": registro.fecha_hora.isoformat(),
            "nivel_animo": registro.nivel_animo,
            "emocion_principal": registro.emocion_principal,
            "intensidad_emocion": registro.intensidad_emocion,
            "notas": registro.notas,
            "nivel_riesgo": registro.nivel_riesgo,
            "score_riesgo": registro.score_riesgo,
            "alertas_activadas": registro.alertas_activadas
        })
    
    return {
        "total_registros": len(registros_info),
        "registros": registros_info
    }