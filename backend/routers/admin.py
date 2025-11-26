# backend/routers/admin.py
"""
✅ ROUTER ADMIN COMPLETO Y CORREGIDO
Incluye todos los endpoints necesarios para el dashboard de administrador
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, timedelta
from typing import List, Dict, Optional

import models
import schemas
from database import get_db
from dependencies import get_current_admin
from email_service import send_credentials, generate_temp_password
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== ESTADÍSTICAS GENERALES ====================

@router.get("/estadisticas")
async def obtener_estadisticas_generales(
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Estadísticas generales del sistema"""
    
    # Total de pacientes activos
    total_pacientes_activos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PACIENTE,
        models.Usuario.activo == True
    ).count()
    
    # Total de psicólogos activos
    total_psicologos_activos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO,
        models.Usuario.activo == True
    ).count()
    
    # Total de registros emocionales
    total_registros_emocionales = db.query(models.RegistroEmocional).count()
    
    # Registros del último mes
    fecha_hace_mes = datetime.utcnow() - timedelta(days=30)
    registros_ultimo_mes = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.fecha_hora >= fecha_hace_mes
    ).count()
    
    # Citas programadas
    citas_programadas = db.query(models.Cita).filter(
        models.Cita.estado == models.AppointmentStatus.PROGRAMADA
    ).count()
    
    return {
        "total_pacientes_activos": total_pacientes_activos,
        "total_psicologos_activos": total_psicologos_activos,
        "total_registros_emocionales": total_registros_emocionales,
        "registros_ultimo_mes": registros_ultimo_mes,
        "citas_programadas": citas_programadas,
        "fecha_consulta": datetime.utcnow().isoformat()
    }


# ==================== GESTIÓN DE PSICÓLOGOS ====================

@router.get("/psicologos")
async def listar_psicologos(
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Lista todos los psicólogos con su contador de pacientes"""
    
    # Query mejorado con JOIN para contar pacientes
    psicologos = db.query(
        models.Usuario,
        func.count(models.PacientePsicologo.id_paciente).label('total_pacientes')
    ).outerjoin(
        models.PacientePsicologo,
        and_(
            models.PacientePsicologo.id_psicologo == models.Usuario.id_usuario,
            models.PacientePsicologo.activo == True
        )
    ).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).group_by(
        models.Usuario.id_usuario
    ).order_by(
        desc(models.Usuario.activo),
        models.Usuario.nombre
    ).all()
    
    psicologos_list = []
    for psicologo, total_pacientes in psicologos:
        psicologos_list.append({
            "id": psicologo.id_usuario,
            "nombre_completo": f"{psicologo.nombre} {psicologo.apellido}",
            "nombre": psicologo.nombre,
            "apellido": psicologo.apellido,
            "cedula": psicologo.cedula,
            "email": psicologo.email,
            "telefono": psicologo.telefono,
            "fecha_nacimiento": psicologo.fecha_nacimiento.isoformat() if psicologo.fecha_nacimiento else None,
            "direccion": psicologo.direccion,
            "activo": psicologo.activo,
            "fecha_registro": psicologo.fecha_registro.isoformat(),
            "ultimo_acceso": psicologo.ultimo_acceso.isoformat() if psicologo.ultimo_acceso else None,
            "total_pacientes": total_pacientes,  # ✅ CONTADOR CORRECTO
            "especialidad": "Psicología General",  # Si tienes este campo en la BD, ajústalo
        })
    
    return {
        "psicologos": psicologos_list,
        "total": len(psicologos_list)
    }


@router.get("/psicologos/{psicologo_id}")
async def obtener_detalle_psicologo(
    psicologo_id: int,
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Detalle completo de un psicólogo específico"""
    
    psicologo = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == psicologo_id,
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).first()
    
    if not psicologo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Psicólogo no encontrado"
        )
    
    # Contar pacientes activos
    total_pacientes = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_psicologo == psicologo_id,
        models.PacientePsicologo.activo == True
    ).count()
    
    # Contar citas completadas
    citas_completadas = db.query(models.Cita).filter(
        models.Cita.id_psicologo == psicologo_id,
        models.Cita.estado == models.AppointmentStatus.COMPLETADA
    ).count()
    
    # Citas este mes
    inicio_mes = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    citas_este_mes = db.query(models.Cita).filter(
        models.Cita.id_psicologo == psicologo_id,
        models.Cita.fecha >= inicio_mes.date()
    ).count()
    
    return {
        "id": psicologo.id_usuario,
        "nombre_completo": f"{psicologo.nombre} {psicologo.apellido}",
        "nombre": psicologo.nombre,
        "apellido": psicologo.apellido,
        "cedula": psicologo.cedula,
        "email": psicologo.email,
        "telefono": psicologo.telefono,
        "direccion": psicologo.direccion,
        "fecha_nacimiento": psicologo.fecha_nacimiento.isoformat() if psicologo.fecha_nacimiento else None,
        "fecha_registro": psicologo.fecha_registro.isoformat(),
        "activo": psicologo.activo,
        "ultimo_acceso": psicologo.ultimo_acceso.isoformat() if psicologo.ultimo_acceso else None,
        "total_pacientes": total_pacientes,
        "citas_completadas": citas_completadas,
        "citas_este_mes": citas_este_mes,
        "especialidad": "Psicología General",
        "numero_licencia": None,
        "titulo_profesional": None,
        "años_experiencia": None,
        "institucion_formacion": None
    }


@router.put("/psicologos/{psicologo_id}/toggle-estado")
async def cambiar_estado_psicologo(
    psicologo_id: int,
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Activa o desactiva un psicólogo"""
    
    psicologo = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == psicologo_id,
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).first()
    
    if not psicologo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Psicólogo no encontrado"
        )
    
    # Cambiar estado
    psicologo.activo = not psicologo.activo
    db.commit()
    
    return {
        "mensaje": f"Psicólogo {'activado' if psicologo.activo else 'desactivado'} exitosamente",
        "nuevo_estado": psicologo.activo
    }


# ==================== REGISTRO DE PSICÓLOGO ====================

@router.post("/register/psicologo")
async def registrar_psicologo(
    psicologo_data: schemas.RegistroPsicologoCompleto,
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Registra un nuevo psicólogo"""
    
    # Verificar si el email ya existe
    email_existe = db.query(models.Usuario).filter(
        models.Usuario.email == psicologo_data.correo
    ).first()
    
    if email_existe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado en el sistema"
        )
    
    # Verificar si la cédula ya existe
    if psicologo_data.cedula:
        cedula_existe = db.query(models.Usuario).filter(
            models.Usuario.cedula == psicologo_data.cedula
        ).first()
        
        if cedula_existe:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cédula ya está registrada en el sistema"
            )
    
    # Generar contraseña temporal
    password_temporal = generate_temp_password(12)
    password_hash = pwd_context.hash(password_temporal)
    
    # Construir nombre completo
    nombre_completo = f"{psicologo_data.primer_nombre}"
    if psicologo_data.segundo_nombre:
        nombre_completo += f" {psicologo_data.segundo_nombre}"
    nombre_completo += f" {psicologo_data.primer_apellido}"
    if psicologo_data.segundo_apellido:
        nombre_completo += f" {psicologo_data.segundo_apellido}"
    
    # Crear usuario psicólogo
    nuevo_psicologo = models.Usuario(
        nombre=psicologo_data.primer_nombre + (f" {psicologo_data.segundo_nombre}" if psicologo_data.segundo_nombre else ""),
        apellido=psicologo_data.primer_apellido + (f" {psicologo_data.segundo_apellido}" if psicologo_data.segundo_apellido else ""),
        cedula=psicologo_data.cedula,
        email=psicologo_data.correo,
        password_hash=password_hash,
        telefono=psicologo_data.telefono,
        fecha_nacimiento=psicologo_data.fecha_nacimiento,
        direccion=psicologo_data.direccion,
        rol=models.UserRole.PSICOLOGO,
        activo=True,
        debe_cambiar_password=True  # ✅ Debe cambiar password en primer login
    )
    
    db.add(nuevo_psicologo)
    db.commit()
    db.refresh(nuevo_psicologo)
    
    # Enviar credenciales por correo
    correo_enviado = False
    try:
        correo_enviado = send_credentials(
            to_email=psicologo_data.correo,
            nombre=nombre_completo,
            email_login=psicologo_data.correo,
            password=password_temporal,
            psicologo=f"{current_admin.nombre} {current_admin.apellido}"
        )
    except Exception as e:
        print(f"⚠️ Error enviando correo: {e}")
    
    return {
        "mensaje": "Psicólogo registrado exitosamente",
        "usuario": {
            "id": nuevo_psicologo.id_usuario,
            "nombre_completo": nombre_completo,
            "email": nuevo_psicologo.email,
            "rol": nuevo_psicologo.rol.value
        },
        "credenciales": {
            "email": psicologo_data.correo,
            "password_temporal": password_temporal,
            "correo_enviado": correo_enviado
        },
        "instrucciones": "El psicólogo debe cambiar su contraseña en el primer inicio de sesión"
    }


# ==================== REPORTES ====================

@router.get("/reportes/general")
async def obtener_reporte_general(
    dias: int = 30,
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Reporte general del sistema"""
    
    fecha_inicio = datetime.utcnow() - timedelta(days=dias)
    
    # Total de registros en el período
    total_registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.fecha_hora >= fecha_inicio
    ).count()
    
    # Distribución de emociones
    emociones = db.query(
        models.RegistroEmocional.emocion_principal,
        func.count(models.RegistroEmocional.id_registro)
    ).filter(
        models.RegistroEmocional.fecha_hora >= fecha_inicio,
        models.RegistroEmocional.emocion_principal.isnot(None)
    ).group_by(
        models.RegistroEmocional.emocion_principal
    ).all()
    
    distribucion_emociones = {emocion: count for emocion, count in emociones}
    
    # Distribución de riesgos
    riesgos = db.query(
        models.RegistroEmocional.nivel_riesgo,
        func.count(models.RegistroEmocional.id_registro)
    ).filter(
        models.RegistroEmocional.fecha_hora >= fecha_inicio,
        models.RegistroEmocional.nivel_riesgo.isnot(None)
    ).group_by(
        models.RegistroEmocional.nivel_riesgo
    ).all()
    
    distribucion_riesgos = {str(riesgo): count for riesgo, count in riesgos if riesgo}
    
    # Registros por día (últimos 30 días)
    registros_por_dia = []
    for i in range(dias):
        fecha = (datetime.utcnow() - timedelta(days=i)).date()
        total = db.query(models.RegistroEmocional).filter(
            func.date(models.RegistroEmocional.fecha_hora) == fecha
        ).count()
        
        registros_por_dia.append({
            "fecha": fecha.isoformat(),
            "total": total
        })
    
    registros_por_dia.reverse()
    
    return {
        "periodo_dias": dias,
        "total_registros": total_registros,
        "distribucion_emociones": distribucion_emociones,
        "distribucion_riesgos": distribucion_riesgos,
        "registros_por_dia": registros_por_dia
    }


@router.get("/reportes/psicologos")
async def obtener_reporte_psicologos(
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Reporte de actividad de psicólogos"""
    
    inicio_mes = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    psicologos = db.query(models.Usuario).filter(
        models.Usuario.rol == models.UserRole.PSICOLOGO
    ).all()
    
    reporte = []
    for psicologo in psicologos:
        # Pacientes activos
        pacientes_activos = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_psicologo == psicologo.id_usuario,
            models.PacientePsicologo.activo == True
        ).count()
        
        # Citas este mes
        citas_este_mes = db.query(models.Cita).filter(
            models.Cita.id_psicologo == psicologo.id_usuario,
            models.Cita.fecha >= inicio_mes.date()
        ).count()
        
        # Citas completadas total
        citas_completadas = db.query(models.Cita).filter(
            models.Cita.id_psicologo == psicologo.id_usuario,
            models.Cita.estado == models.AppointmentStatus.COMPLETADA
        ).count()
        
        reporte.append({
            "id": psicologo.id_usuario,
            "nombre": f"{psicologo.nombre} {psicologo.apellido}",
            "email": psicologo.email,
            "pacientes_activos": pacientes_activos,
            "citas_este_mes": citas_este_mes,
            "citas_completadas_total": citas_completadas,
            "ultimo_acceso": psicologo.ultimo_acceso.isoformat() if psicologo.ultimo_acceso else None
        })
    
    return {
        "reporte": reporte,
        "total_psicologos": len(reporte)
    }


@router.get("/usuarios/resumen")
async def obtener_resumen_usuarios(
    current_admin: models.Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """✅ Resumen de usuarios por rol y estado"""
    
    # Por rol
    por_rol = {}
    for rol in models.UserRole:
        count = db.query(models.Usuario).filter(
            models.Usuario.rol == rol
        ).count()
        por_rol[rol.value] = count
    
    # Por estado
    activos = db.query(models.Usuario).filter(
        models.Usuario.activo == True
    ).count()
    
    inactivos = db.query(models.Usuario).filter(
        models.Usuario.activo == False
    ).count()
    
    return {
        "por_rol": por_rol,
        "por_estado": {
            "activos": activos,
            "inactivos": inactivos
        },
        "total": activos + inactivos
    }