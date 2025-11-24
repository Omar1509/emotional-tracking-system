# backend/routers/citas.py
# ✅ ROUTER COMPLETO DE CITAS PARA PSICÓLOGOS Y PACIENTES

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import Optional, List
from datetime import datetime, date, time
from pydantic import BaseModel

import models
from database import get_db
from dependencies import get_current_user, get_current_psicologo, get_current_paciente

router = APIRouter()

# ==================== SCHEMAS ====================

class CitaCreate(BaseModel):
    id_paciente: int
    fecha: date
    hora_inicio: time
    hora_fin: Optional[time] = None
    modalidad: str = "virtual"  # virtual, presencial
    notas_previas: Optional[str] = None
    url_videollamada: Optional[str] = None

class CitaUpdate(BaseModel):
    fecha: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    modalidad: Optional[str] = None
    notas_previas: Optional[str] = None
    url_videollamada: Optional[str] = None
    estado: Optional[str] = None

class AsistenciaUpdate(BaseModel):
    asistio: bool

# ==================== ENDPOINTS PSICÓLOGO ====================

@router.post("/", response_model=dict)
async def crear_cita(
    cita_data: CitaCreate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Crear nueva cita (solo psicólogos)
    """
    try:
        # Verificar que el paciente existe y está asignado a este psicólogo
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == cita_data.id_paciente,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()

        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El paciente no está asignado a este psicólogo"
            )

        # Crear cita
        nueva_cita = models.Cita(
            id_paciente=cita_data.id_paciente,
            id_psicologo=current_user.id_usuario,
            fecha=cita_data.fecha,
            hora_inicio=cita_data.hora_inicio,
            hora_fin=cita_data.hora_fin,
            modalidad=cita_data.modalidad,
            estado="programada",
            notas_previas=cita_data.notas_previas,
            url_videollamada=cita_data.url_videollamada
        )

        db.add(nueva_cita)
        db.commit()
        db.refresh(nueva_cita)

        return {
            "mensaje": "Cita creada exitosamente",
            "id_cita": nueva_cita.id_cita
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando cita: {str(e)}"
        )


@router.get("/psicologo/mis-citas", response_model=dict)
async def obtener_citas_psicologo(
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener todas las citas del psicólogo
    """
    try:
        citas = db.query(models.Cita).filter(
            models.Cita.id_psicologo == current_user.id_usuario
        ).order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()

        citas_dict = []
        for cita in citas:
            paciente = db.query(models.Usuario).filter(
                models.Usuario.id_usuario == cita.id_paciente
            ).first()

            citas_dict.append({
                "id_cita": cita.id_cita,
                "id_paciente": cita.id_paciente,
                "paciente": {
                    "nombre": paciente.nombre if paciente else None,
                    "apellido": paciente.apellido if paciente else None
                },
                "fecha": cita.fecha.isoformat(),
                "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
                "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
                "modalidad": cita.modalidad,
                "estado": cita.estado,
                "notas_previas": cita.notas_previas,
                "url_videollamada": cita.url_videollamada,
                "asistio": cita.asistio,
                "fecha_creacion": cita.fecha_creacion.isoformat()
            })

        return {
            "citas": citas_dict,
            "total": len(citas_dict)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo citas: {str(e)}"
        )


@router.put("/{id_cita}", response_model=dict)
async def actualizar_cita(
    id_cita: int,
    cita_data: CitaUpdate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Actualizar cita existente (solo psicólogos)
    """
    try:
        cita = db.query(models.Cita).filter(
            models.Cita.id_cita == id_cita,
            models.Cita.id_psicologo == current_user.id_usuario
        ).first()

        if not cita:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )

        # Actualizar campos
        if cita_data.fecha is not None:
            cita.fecha = cita_data.fecha
        if cita_data.hora_inicio is not None:
            cita.hora_inicio = cita_data.hora_inicio
        if cita_data.hora_fin is not None:
            cita.hora_fin = cita_data.hora_fin
        if cita_data.modalidad is not None:
            cita.modalidad = cita_data.modalidad
        if cita_data.notas_previas is not None:
            cita.notas_previas = cita_data.notas_previas
        if cita_data.url_videollamada is not None:
            cita.url_videollamada = cita_data.url_videollamada
        if cita_data.estado is not None:
            cita.estado = cita_data.estado

        db.commit()

        return {
            "mensaje": "Cita actualizada exitosamente",
            "id_cita": cita.id_cita
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando cita: {str(e)}"
        )


@router.put("/{id_cita}/asistencia", response_model=dict)
async def registrar_asistencia(
    id_cita: int,
    asistencia_data: AsistenciaUpdate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Registrar si el paciente asistió o no (solo psicólogos)
    """
    try:
        cita = db.query(models.Cita).filter(
            models.Cita.id_cita == id_cita,
            models.Cita.id_psicologo == current_user.id_usuario
        ).first()

        if not cita:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )

        cita.asistio = asistencia_data.asistio
        
        if asistencia_data.asistio:
            cita.estado = "completada"
        else:
            cita.estado = "no_asistio"

        db.commit()

        return {
            "mensaje": "Asistencia registrada exitosamente",
            "asistio": cita.asistio,
            "estado": cita.estado
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error registrando asistencia: {str(e)}"
        )


@router.delete("/{id_cita}", response_model=dict)
async def eliminar_cita(
    id_cita: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Eliminar cita (solo psicólogos)
    """
    try:
        cita = db.query(models.Cita).filter(
            models.Cita.id_cita == id_cita,
            models.Cita.id_psicologo == current_user.id_usuario
        ).first()

        if not cita:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )

        db.delete(cita)
        db.commit()

        return {
            "mensaje": "Cita eliminada exitosamente"
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error eliminando cita: {str(e)}"
        )


# ==================== ENDPOINTS PACIENTE ====================

@router.get("/paciente/mis-citas", response_model=dict)
async def obtener_citas_paciente(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener todas las citas del paciente
    """
    try:
        citas = db.query(models.Cita).filter(
            models.Cita.id_paciente == current_user.id_usuario
        ).order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()

        citas_dict = []
        for cita in citas:
            psicologo = db.query(models.Usuario).filter(
                models.Usuario.id_usuario == cita.id_psicologo
            ).first()

            # Determinar si la cita ya pasó
            hoy = date.today()
            ya_paso = cita.fecha < hoy

            citas_dict.append({
                "id_cita": cita.id_cita,
                "psicologo": {
                    "nombre": f"Dr(a). {psicologo.nombre} {psicologo.apellido}" if psicologo else "Psicólogo"
                },
                "fecha": cita.fecha.isoformat(),
                "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
                "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
                "modalidad": cita.modalidad,
                "estado": cita.estado,
                "notas_previas": cita.notas_previas,
                "url_videollamada": cita.url_videollamada,
                "asistio": cita.asistio,
                "ya_paso": ya_paso,
                "fecha_creacion": cita.fecha_creacion.isoformat()
            })

        return {
            "citas": citas_dict,
            "total": len(citas_dict)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo citas: {str(e)}"
        )


@router.get("/{id_cita}", response_model=dict)
async def obtener_cita_detalle(
    id_cita: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener detalle de una cita específica
    """
    try:
        cita = db.query(models.Cita).filter(
            models.Cita.id_cita == id_cita
        ).first()

        if not cita:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cita no encontrada"
            )

        # Verificar permisos
        if current_user.rol == models.UserRole.PACIENTE:
            if cita.id_paciente != current_user.id_usuario:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para ver esta cita"
                )
        elif current_user.rol == models.UserRole.PSICOLOGO:
            if cita.id_psicologo != current_user.id_usuario:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para ver esta cita"
                )

        return {
            "id_cita": cita.id_cita,
            "id_paciente": cita.id_paciente,
            "id_psicologo": cita.id_psicologo,
            "fecha": cita.fecha.isoformat(),
            "hora_inicio": cita.hora_inicio.isoformat() if cita.hora_inicio else None,
            "hora_fin": cita.hora_fin.isoformat() if cita.hora_fin else None,
            "modalidad": cita.modalidad,
            "estado": cita.estado,
            "notas_previas": cita.notas_previas,
            "url_videollamada": cita.url_videollamada,
            "asistio": cita.asistio,
            "fecha_creacion": cita.fecha_creacion.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo detalle de cita: {str(e)}"
        )