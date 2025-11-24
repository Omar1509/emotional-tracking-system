# backend/routers/psicologos.py
# ✅ VERSIÓN CORREGIDA - Usa id_usuario consistentemente

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional
from datetime import datetime, date, timedelta
import secrets
import string

import models
import schemas
from database import get_db
from dependencies import get_current_psicologo, verificar_acceso_paciente
from email_service import send_credentials, generate_temp_password

router = APIRouter()

# ==================== GESTIÓN DE PACIENTES ====================

@router.post("/registrar-paciente", status_code=status.HTTP_201_CREATED)
async def registrar_paciente(
    paciente_data: schemas.PacienteRegistro,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Registrar nuevo paciente (solo psicólogos)
    - Crea usuario con contraseña temporal
    - Asigna al psicólogo actual
    - Envía credenciales por correo
    """
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Verificar si el email ya existe
    email_existente = db.query(models.Usuario).filter(
        models.Usuario.email == paciente_data.correo
    ).first()
    
    if email_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado"
        )
    
    # Verificar si la cédula ya existe
    if paciente_data.cedula:
        cedula_existente = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula
        ).first()
        
        if cedula_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada"
            )
    
    # Generar contraseña temporal
    password_temporal = generate_temp_password(12)
    
    # Construir nombre completo
    nombre_completo = f"{paciente_data.primer_nombre}"
    if paciente_data.segundo_nombre:
        nombre_completo += f" {paciente_data.segundo_nombre}"
    
    apellido_completo = f"{paciente_data.primer_apellido}"
    if paciente_data.segundo_apellido:
        apellido_completo += f" {paciente_data.segundo_apellido}"
    
    # Crear usuario paciente
    nuevo_paciente = models.Usuario(
        nombre=nombre_completo,
        apellido=apellido_completo,
        cedula=paciente_data.cedula,
        email=paciente_data.correo,
        password_hash=pwd_context.hash(password_temporal),
        telefono=paciente_data.telefono,
        direccion=paciente_data.direccion,
        fecha_nacimiento=paciente_data.fecha_nacimiento,
        rol=models.UserRole.PACIENTE,
        activo=True,
        debe_cambiar_password=True  # Obligar cambio de contraseña
    )
    
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)
    
    # Asignar paciente al psicólogo
    asignacion = models.PacientePsicologo(
        id_paciente=nuevo_paciente.id_usuario,
        id_psicologo=current_user.id_usuario,
        activo=True,
        notas=paciente_data.motivo_consulta
    )
    
    db.add(asignacion)
    db.commit()
    
    # Enviar credenciales por correo
    try:
        send_credentials(
            to_email=paciente_data.correo,
            nombre=nombre_completo,
            email_login=paciente_data.correo,
            password=password_temporal,
            psicologo=f"{current_user.nombre} {current_user.apellido}"
        )
        correo_enviado = True
    except Exception as e:
        print(f"Error enviando correo: {e}")
        correo_enviado = False
    
    return {
        "mensaje": "Paciente registrado exitosamente",
        "paciente": {
            "id_usuario": nuevo_paciente.id_usuario,  # ✅ CORREGIDO: Usar id_usuario
            "nombre": f"{nombre_completo} {apellido_completo}",
            "email": nuevo_paciente.email,
            "cedula": nuevo_paciente.cedula
        },
        "credenciales": {
            "email": paciente_data.correo,
            "password_temporal": password_temporal,
            "correo_enviado": correo_enviado
        },
        "instrucciones": "El paciente debe cambiar su contraseña en el primer inicio de sesión"
    }


@router.get("/mis-pacientes")
async def obtener_mis_pacientes(
    activo: Optional[bool] = None,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener lista de pacientes del psicólogo actual
    """
    query = db.query(models.Usuario, models.PacientePsicologo).join(
        models.PacientePsicologo,
        models.Usuario.id_usuario == models.PacientePsicologo.id_paciente
    ).filter(
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    )
    
    if activo is not None:
        query = query.filter(models.Usuario.activo == activo)
    
    resultados = query.all()
    
    pacientes = []
    for usuario, asignacion in resultados:
        # Obtener registros emocionales
        registros_emocionales = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == usuario.id_usuario
        ).order_by(models.RegistroEmocional.fecha_hora.desc()).all()
        
        # Formatear registros
        registros_dict = [{
            "id_registro": reg.id_registro,
            "fecha_hora": reg.fecha_hora.isoformat(),
            "nivel_animo": reg.nivel_animo,
            "emocion_principal": reg.emocion_principal,
            "sentimiento_score": reg.sentimiento_score,
            "nivel_riesgo": reg.nivel_riesgo.value if reg.nivel_riesgo else None,
            "notas": reg.notas
        } for reg in registros_emocionales]
        
        # Próxima cita
        proxima_cita = db.query(models.Cita).filter(
            models.Cita.id_paciente == usuario.id_usuario,
            models.Cita.id_psicologo == current_user.id_usuario,
            models.Cita.fecha >= date.today(),
            models.Cita.estado == models.AppointmentStatus.PROGRAMADA
        ).order_by(models.Cita.fecha, models.Cita.hora_inicio).first()
        
        pacientes.append({
            "id_usuario": usuario.id_usuario,  # ✅ CORREGIDO: Usar id_usuario
            "nombre": usuario.nombre,  # ✅ CORREGIDO: Separado nombre y apellido
            "apellido": usuario.apellido,  # ✅ CORREGIDO: Separado
            "email": usuario.email,
            "cedula": usuario.cedula,
            "telefono": usuario.telefono,
            "edad": usuario.edad if hasattr(usuario, 'edad') else None,
            "activo": usuario.activo,
            "fecha_registro": usuario.fecha_registro.isoformat() if usuario.fecha_registro else None,
            "fecha_asignacion": asignacion.fecha_asignacion.isoformat() if asignacion.fecha_asignacion else None,
            "registros_emocionales": registros_dict,  # ✅ AGREGADO: Incluir registros
            "proxima_cita": {
                "fecha": proxima_cita.fecha.isoformat(),
                "hora": proxima_cita.hora_inicio.isoformat()
            } if proxima_cita else None
        })
    
    print(f"✅ Retornando {len(pacientes)} pacientes con id_usuario")  # ✅ LOG
    
    return {
        "total": len(pacientes),
        "pacientes": pacientes
    }


@router.get("/paciente/{paciente_id}")
async def obtener_detalle_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener detalle completo de un paciente
    """
    # Verificar acceso
    if not verificar_acceso_paciente(current_user, paciente_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Obtener asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario
    ).first()
    
    # Estadísticas
    total_registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == paciente_id
    ).count()
    
    # Registros últimos 30 días
    hace_30_dias = datetime.utcnow() - timedelta(days=30)
    registros_30d = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == paciente_id,
        models.RegistroEmocional.fecha_hora >= hace_30_dias
    ).all()
    
    promedio_animo_30d = 0
    if registros_30d:
        promedio_animo_30d = sum(r.nivel_animo or 5 for r in registros_30d) / len(registros_30d)
    
    # Registros de alto riesgo
    registros_alto_riesgo = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == paciente_id,
        models.RegistroEmocional.nivel_riesgo == models.RiskLevel.ALTO
    ).count()
    
    # Citas programadas y pasadas
    total_citas = db.query(models.Cita).filter(
        models.Cita.id_paciente == paciente_id,
        models.Cita.id_psicologo == current_user.id_usuario
    ).count()
    
    citas_completadas = db.query(models.Cita).filter(
        models.Cita.id_paciente == paciente_id,
        models.Cita.id_psicologo == current_user.id_usuario,
        models.Cita.estado == models.AppointmentStatus.COMPLETADA
    ).count()
    
    return {
        "paciente": {
            "id_usuario": paciente.id_usuario,  # ✅ CORREGIDO: Usar id_usuario
            "nombre": paciente.nombre,
            "apellido": paciente.apellido,
            "email": paciente.email,
            "cedula": paciente.cedula,
            "telefono": paciente.telefono,
            "direccion": paciente.direccion,
            "fecha_nacimiento": paciente.fecha_nacimiento.isoformat() if paciente.fecha_nacimiento else None,
            "activo": paciente.activo,
            "fecha_registro": paciente.fecha_registro.isoformat(),
            "ultimo_acceso": paciente.ultimo_acceso.isoformat() if paciente.ultimo_acceso else None
        },
        "asignacion": {
            "fecha_asignacion": asignacion.fecha_asignacion.isoformat(),
            "notas": asignacion.notas
        },
        "estadisticas": {
            "total_registros": total_registros,
            "registros_ultimos_30_dias": len(registros_30d),
            "promedio_animo_30_dias": round(promedio_animo_30d, 1),
            "registros_alto_riesgo": registros_alto_riesgo,
            "total_citas": total_citas,
            "citas_completadas": citas_completadas
        }
    }


@router.put("/paciente/{paciente_id}")
async def editar_paciente(
    paciente_id: int,
    paciente_data: schemas.PacienteEditar,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Editar información de un paciente
    """
    # Verificar acceso
    if not verificar_acceso_paciente(current_user, paciente_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Actualizar campos
    if paciente_data.nombre:
        paciente.nombre = paciente_data.nombre
    if paciente_data.apellido:
        paciente.apellido = paciente_data.apellido
    if paciente_data.cedula:
        # Verificar que no exista otra cédula
        cedula_existente = db.query(models.Usuario).filter(
            models.Usuario.cedula == paciente_data.cedula,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if cedula_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada"
            )
        paciente.cedula = paciente_data.cedula
    if paciente_data.email:
        # Verificar que no exista otro email
        email_existente = db.query(models.Usuario).filter(
            models.Usuario.email == paciente_data.email,
            models.Usuario.id_usuario != paciente_id
        ).first()
        if email_existente:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El correo electrónico ya está registrado"
            )
        paciente.email = paciente_data.email
    if paciente_data.telefono:
        paciente.telefono = paciente_data.telefono
    if paciente_data.direccion:
        paciente.direccion = paciente_data.direccion
    if paciente_data.fecha_nacimiento:
        paciente.fecha_nacimiento = paciente_data.fecha_nacimiento
    if paciente_data.activo is not None:
        paciente.activo = paciente_data.activo
    
    db.commit()
    
    return {
        "mensaje": "Paciente actualizado exitosamente",
        "paciente": {
            "id_usuario": paciente.id_usuario,  # ✅ CORREGIDO: Usar id_usuario
            "nombre": f"{paciente.nombre} {paciente.apellido}",
            "email": paciente.email,
            "activo": paciente.activo
        }
    }


@router.delete("/paciente/{paciente_id}")
async def desactivar_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Desactivar un paciente (no lo elimina, solo lo desactiva)
    """
    # Verificar acceso
    if not verificar_acceso_paciente(current_user, paciente_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener paciente
    paciente = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == paciente_id,
        models.Usuario.rol == models.UserRole.PACIENTE
    ).first()
    
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado"
        )
    
    # Desactivar
    paciente.activo = False
    
    # Desactivar asignación
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario
    ).first()
    
    if asignacion:
        asignacion.activo = False
    
    db.commit()
    
    return {
        "mensaje": "Paciente desactivado exitosamente",
        "paciente_id": paciente_id
    }


# ==================== ESTADÍSTICAS DEL PSICÓLOGO ====================

@router.get("/estadisticas")
async def obtener_estadisticas_psicologo(
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener estadísticas generales del psicólogo
    """
    # Total de pacientes activos
    total_pacientes = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).count()
    
    # Citas de hoy
    citas_hoy = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario,
        models.Cita.fecha == date.today(),
        models.Cita.estado == models.AppointmentStatus.PROGRAMADA
    ).count()
    
    # Citas de esta semana
    inicio_semana = date.today() - timedelta(days=date.today().weekday())
    fin_semana = inicio_semana + timedelta(days=6)
    
    citas_semana = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario,
        models.Cita.fecha >= inicio_semana,
        models.Cita.fecha <= fin_semana,
        models.Cita.estado == models.AppointmentStatus.PROGRAMADA
    ).count()
    
    # Pacientes de alto riesgo
    pacientes_ids = db.query(models.PacientePsicologo.id_paciente).filter(
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).subquery()
    
    pacientes_alto_riesgo = db.query(models.RegistroEmocional.id_usuario).filter(
        models.RegistroEmocional.id_usuario.in_(pacientes_ids),
        models.RegistroEmocional.nivel_riesgo == models.RiskLevel.ALTO,
        models.RegistroEmocional.fecha_hora >= datetime.utcnow() - timedelta(days=7)
    ).distinct().count()
    
    return {
        "total_pacientes_activos": total_pacientes,
        "citas_hoy": citas_hoy,
        "citas_esta_semana": citas_semana,
        "pacientes_alto_riesgo_ultimos_7_dias": pacientes_alto_riesgo
    }