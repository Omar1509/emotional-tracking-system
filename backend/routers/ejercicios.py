# backend/routers/ejercicios.py
# ✅ Router de ejercicios terapéuticos - CORREGIDO

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel

import models
from database import get_db
from dependencies import get_current_user, get_current_paciente, get_current_psicologo

router = APIRouter()

# ==================== SCHEMAS ====================

class EjercicioBase(BaseModel):
    titulo: str
    descripcion: str = None
    tipo: str = None
    duracion_minutos: int = None
    instrucciones: str = None
    url_recurso: str = None


class EjercicioResponse(BaseModel):
    id_ejercicio: int
    titulo: str
    descripcion: str = None
    tipo: str = None
    duracion_minutos: int = None
    instrucciones: str = None
    url_recurso: str = None
    activo: bool
    
    class Config:
        from_attributes = True


class AsignacionCreate(BaseModel):
    id_ejercicio: int
    id_paciente: int
    fecha_limite: str = None
    notas_psicologo: str = None


class AsignacionResponse(BaseModel):
    id_asignacion: int
    id_ejercicio: int
    ejercicio_titulo: str
    ejercicio_descripcion: str = None
    ejercicio_tipo: str = None
    duracion_minutos: int = None
    estado: str
    fecha_asignacion: str
    fecha_limite: str = None
    notas_psicologo: str = None
    fecha_completado: str = None
    calificacion_paciente: int = None
    comentario_paciente: str = None


class CompletarEjercicioRequest(BaseModel):
    calificacion: int
    comentario: str = None


# ==================== ENDPOINTS PARA PACIENTES ====================

@router.get("/mis-ejercicios", response_model=List[AsignacionResponse])
async def obtener_mis_ejercicios(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene los ejercicios asignados al paciente actual
    """
    asignaciones = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == current_user.id_usuario
    ).order_by(models.AsignacionEjercicio.fecha_asignacion.desc()).all()
    
    resultado = []
    for asig in asignaciones:
        ejercicio = db.query(models.EjercicioTerapeutico).filter(
            models.EjercicioTerapeutico.id_ejercicio == asig.id_ejercicio
        ).first()
        
        if ejercicio:
            resultado.append({
                "id_asignacion": asig.id_asignacion,
                "id_ejercicio": asig.id_ejercicio,
                "ejercicio_titulo": ejercicio.titulo,
                "ejercicio_descripcion": ejercicio.descripcion,
                "ejercicio_tipo": ejercicio.tipo,
                "duracion_minutos": ejercicio.duracion_minutos,
                "estado": asig.estado,
                "fecha_asignacion": asig.fecha_asignacion.isoformat() if asig.fecha_asignacion else None,
                "fecha_limite": asig.fecha_limite.isoformat() if asig.fecha_limite else None,
                "notas_psicologo": asig.notas_psicologo,
                "fecha_completado": asig.fecha_completado.isoformat() if asig.fecha_completado else None,
                "calificacion_paciente": asig.calificacion_paciente,
                "comentario_paciente": asig.comentario_paciente
            })
    
    return resultado


@router.post("/completar/{asignacion_id}")
async def completar_ejercicio(
    asignacion_id: int,
    datos: CompletarEjercicioRequest,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Marca un ejercicio como completado
    """
    asignacion = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_asignacion == asignacion_id,
        models.AsignacionEjercicio.id_paciente == current_user.id_usuario
    ).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ejercicio no encontrado"
        )
    
    # Actualizar estado
    asignacion.estado = "COMPLETADO"
    asignacion.fecha_completado = datetime.utcnow()
    asignacion.calificacion_paciente = datos.calificacion
    asignacion.comentario_paciente = datos.comentario
    
    db.commit()
    
    return {
        "mensaje": "Ejercicio completado exitosamente",
        "id_asignacion": asignacion_id
    }


# ==================== ENDPOINTS PARA PSICÓLOGOS ====================

@router.get("/catalogo", response_model=List[EjercicioResponse])
async def obtener_catalogo(
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene el catálogo de ejercicios disponibles
    """
    ejercicios = db.query(models.EjercicioTerapeutico).filter(
        models.EjercicioTerapeutico.activo == True
    ).all()
    
    return ejercicios


@router.post("/asignar")
async def asignar_ejercicio(
    datos: AsignacionCreate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Asigna un ejercicio a un paciente
    """
    # Verificar que el ejercicio existe
    ejercicio = db.query(models.EjercicioTerapeutico).filter(
        models.EjercicioTerapeutico.id_ejercicio == datos.id_ejercicio
    ).first()
    
    if not ejercicio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ejercicio no encontrado"
        )
    
    # Verificar que el paciente existe y está asignado al psicólogo
    asignacion_pp = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == datos.id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion_pp:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Crear asignación
    nueva_asignacion = models.AsignacionEjercicio(
        id_paciente=datos.id_paciente,
        id_psicologo=current_user.id_usuario,
        id_ejercicio=datos.id_ejercicio,
        fecha_asignacion=datetime.utcnow(),
        fecha_limite=datetime.fromisoformat(datos.fecha_limite) if datos.fecha_limite else None,
        estado="PENDIENTE",
        notas_psicologo=datos.notas_psicologo
    )
    
    db.add(nueva_asignacion)
    db.commit()
    db.refresh(nueva_asignacion)
    
    return {
        "mensaje": "Ejercicio asignado exitosamente",
        "id_asignacion": nueva_asignacion.id_asignacion,
        "ejercicio": ejercicio.titulo
    }


@router.get("/paciente/{paciente_id}/asignados", response_model=List[AsignacionResponse])
async def obtener_ejercicios_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene los ejercicios asignados a un paciente específico
    """
    # Verificar acceso al paciente
    asignacion_pp = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion_pp:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener asignaciones
    asignaciones = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == paciente_id
    ).order_by(models.AsignacionEjercicio.fecha_asignacion.desc()).all()
    
    resultado = []
    for asig in asignaciones:
        ejercicio = db.query(models.EjercicioTerapeutico).filter(
            models.EjercicioTerapeutico.id_ejercicio == asig.id_ejercicio
        ).first()
        
        if ejercicio:
            resultado.append({
                "id_asignacion": asig.id_asignacion,
                "id_ejercicio": asig.id_ejercicio,
                "ejercicio_titulo": ejercicio.titulo,
                "ejercicio_descripcion": ejercicio.descripcion,
                "ejercicio_tipo": ejercicio.tipo,
                "duracion_minutos": ejercicio.duracion_minutos,
                "estado": asig.estado,
                "fecha_asignacion": asig.fecha_asignacion.isoformat() if asig.fecha_asignacion else None,
                "fecha_limite": asig.fecha_limite.isoformat() if asig.fecha_limite else None,
                "notas_psicologo": asig.notas_psicologo,
                "fecha_completado": asig.fecha_completado.isoformat() if asig.fecha_completado else None,
                "calificacion_paciente": asig.calificacion_paciente,
                "comentario_paciente": asig.comentario_paciente
            })
    
    return resultado


@router.get("/estadisticas/paciente/{paciente_id}")
async def obtener_estadisticas_ejercicios(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtiene estadísticas de ejercicios de un paciente
    """
    # Verificar acceso
    asignacion_pp = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion_pp:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    # Obtener estadísticas
    total = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == paciente_id
    ).count()
    
    completados = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == paciente_id,
        models.AsignacionEjercicio.estado == "COMPLETADO"
    ).count()
    
    pendientes = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == paciente_id,
        models.AsignacionEjercicio.estado == "PENDIENTE"
    ).count()
    
    # Calificación promedio
    asignaciones_completadas = db.query(models.AsignacionEjercicio).filter(
        models.AsignacionEjercicio.id_paciente == paciente_id,
        models.AsignacionEjercicio.estado == "COMPLETADO",
        models.AsignacionEjercicio.calificacion_paciente.isnot(None)
    ).all()
    
    calificacion_promedio = None
    if asignaciones_completadas:
        suma = sum(a.calificacion_paciente for a in asignaciones_completadas)
        calificacion_promedio = suma / len(asignaciones_completadas)
    
    return {
        "total_asignados": total,
        "completados": completados,
        "pendientes": pendientes,
        "tasa_completacion": (completados / total * 100) if total > 0 else 0,
        "calificacion_promedio": round(calificacion_promedio, 2) if calificacion_promedio else None
    }