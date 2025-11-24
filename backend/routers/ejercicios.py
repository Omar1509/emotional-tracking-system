# backend/routers/ejercicios.py
# ✅ ROUTER COMPLETO DE EJERCICIOS TERAPÉUTICOS

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, List
from datetime import datetime, date, timedelta
from pydantic import BaseModel

import models
from database import get_db
from dependencies import get_current_user, get_current_psicologo, get_current_paciente

router = APIRouter()

# ==================== SCHEMAS ====================

class EjercicioCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    tipo: str  # respiracion, meditacion, escritura, actividad_fisica, mindfulness, etc.
    duracion_minutos: int
    nivel_dificultad: str = "principiante"  # principiante, intermedio, avanzado
    instrucciones: str
    beneficios: Optional[str] = None

class AsignacionEjercicioCreate(BaseModel):
    id_ejercicio: int
    id_paciente: int
    fecha_inicio: date
    fecha_fin: date
    veces_requeridas: int = 1
    frecuencia: Optional[str] = "diaria"  # diaria, semanal, quincenal
    notas_psicologo: Optional[str] = None

class CompletarEjercicioRequest(BaseModel):
    duracion_real_minutos: Optional[int] = None
    calificacion: Optional[int] = None  # 1-5
    comentarios: Optional[str] = None

# ==================== EJERCICIOS BASE (PSICÓLOGO) ====================

@router.post("/", response_model=dict)
async def crear_ejercicio(
    ejercicio_data: EjercicioCreate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Crear nuevo ejercicio terapéutico (solo psicólogos)
    """
    try:
        nuevo_ejercicio = models.EjercicioTerapeutico(
            titulo=ejercicio_data.titulo,
            descripcion=ejercicio_data.descripcion,
            tipo=ejercicio_data.tipo,
            duracion_minutos=ejercicio_data.duracion_minutos,
            nivel_dificultad=ejercicio_data.nivel_dificultad,
            instrucciones=ejercicio_data.instrucciones,
            beneficios=ejercicio_data.beneficios,
            creado_por=current_user.id_usuario
        )

        db.add(nuevo_ejercicio)
        db.commit()
        db.refresh(nuevo_ejercicio)

        return {
            "mensaje": "Ejercicio creado exitosamente",
            "id_ejercicio": nuevo_ejercicio.id_ejercicio
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creando ejercicio: {str(e)}"
        )


@router.get("/catalogo", response_model=dict)
async def obtener_catalogo_ejercicios(
    tipo: Optional[str] = None,
    nivel: Optional[str] = None,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener catálogo de ejercicios disponibles
    """
    try:
        query = db.query(models.EjercicioTerapeutico).filter(
            models.EjercicioTerapeutico.activo == True
        )

        if tipo:
            query = query.filter(models.EjercicioTerapeutico.tipo == tipo)
        if nivel:
            query = query.filter(models.EjercicioTerapeutico.nivel_dificultad == nivel)

        ejercicios = query.all()

        ejercicios_dict = [
            {
                "id_ejercicio": ej.id_ejercicio,
                "titulo": ej.titulo,
                "descripcion": ej.descripcion,
                "tipo": ej.tipo,
                "duracion_minutos": ej.duracion_minutos,
                "nivel_dificultad": ej.nivel_dificultad,
                "instrucciones": ej.instrucciones,
                "beneficios": ej.beneficios
            }
            for ej in ejercicios
        ]

        return {
            "ejercicios": ejercicios_dict,
            "total": len(ejercicios_dict)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo catálogo: {str(e)}"
        )


# ==================== ASIGNACIÓN DE EJERCICIOS (PSICÓLOGO) ====================

@router.post("/asignar", response_model=dict)
async def asignar_ejercicio(
    asignacion_data: AsignacionEjercicioCreate,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Asignar ejercicio a un paciente (solo psicólogos)
    """
    try:
        # Verificar que el ejercicio existe
        ejercicio = db.query(models.EjercicioTerapeutico).filter(
            models.EjercicioTerapeutico.id_ejercicio == asignacion_data.id_ejercicio,
            models.EjercicioTerapeutico.activo == True
        ).first()

        if not ejercicio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ejercicio no encontrado"
            )

        # Verificar que el paciente está asignado a este psicólogo
        asignacion_paciente = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == asignacion_data.id_paciente,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()

        if not asignacion_paciente:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El paciente no está asignado a este psicólogo"
            )

        # Crear asignación
        nueva_asignacion = models.AsignacionEjercicio(
            id_ejercicio=asignacion_data.id_ejercicio,
            id_paciente=asignacion_data.id_paciente,
            id_psicologo=current_user.id_usuario,
            fecha_inicio=asignacion_data.fecha_inicio,
            fecha_fin=asignacion_data.fecha_fin,
            veces_requeridas=asignacion_data.veces_requeridas,
            veces_completadas=0,
            frecuencia=asignacion_data.frecuencia,
            notas_psicologo=asignacion_data.notas_psicologo,
            estado="pendiente",
            esta_activo=True
        )

        db.add(nueva_asignacion)
        db.commit()
        db.refresh(nueva_asignacion)

        return {
            "mensaje": "Ejercicio asignado exitosamente",
            "id_asignacion": nueva_asignacion.id_asignacion
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error asignando ejercicio: {str(e)}"
        )


@router.get("/paciente/{id_paciente}/asignados", response_model=dict)
async def obtener_ejercicios_paciente(
    id_paciente: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener ejercicios asignados a un paciente (psicólogo)
    """
    try:
        # Verificar permisos
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == id_paciente,
            models.PacientePsicologo.id_psicologo == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()

        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes acceso a este paciente"
            )

        # Obtener asignaciones
        asignaciones = db.query(models.AsignacionEjercicio).filter(
            models.AsignacionEjercicio.id_paciente == id_paciente
        ).all()

        asignaciones_dict = []
        for asig in asignaciones:
            ejercicio = db.query(models.EjercicioTerapeutico).filter(
                models.EjercicioTerapeutico.id_ejercicio == asig.id_ejercicio
            ).first()

            asignaciones_dict.append({
                "id_asignacion": asig.id_asignacion,
                "ejercicio": {
                    "id_ejercicio": ejercicio.id_ejercicio,
                    "titulo": ejercicio.titulo,
                    "tipo": ejercicio.tipo,
                    "duracion_minutos": ejercicio.duracion_minutos
                },
                "fecha_inicio": asig.fecha_inicio.isoformat(),
                "fecha_fin": asig.fecha_fin.isoformat(),
                "veces_requeridas": asig.veces_requeridas,
                "veces_completadas": asig.veces_completadas,
                "estado": asig.estado,
                "progreso": (asig.veces_completadas / asig.veces_requeridas * 100) if asig.veces_requeridas > 0 else 0
            })

        return {
            "ejercicios_asignados": asignaciones_dict,
            "total": len(asignaciones_dict)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo ejercicios: {str(e)}"
        )


# ==================== EJERCICIOS DEL PACIENTE ====================

@router.get("/mis-ejercicios", response_model=dict)
async def obtener_mis_ejercicios(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener ejercicios asignados al paciente autenticado
    """
    try:
        asignaciones = db.query(models.AsignacionEjercicio).filter(
            models.AsignacionEjercicio.id_paciente == current_user.id_usuario,
            models.AsignacionEjercicio.esta_activo == True
        ).all()

        ejercicios_asignados = []
        for asig in asignaciones:
            ejercicio = db.query(models.EjercicioTerapeutico).filter(
                models.EjercicioTerapeutico.id_ejercicio == asig.id_ejercicio
            ).first()

            if not ejercicio:
                continue

            # Determinar estado
            hoy = date.today()
            if asig.fecha_fin < hoy and asig.veces_completadas < asig.veces_requeridas:
                estado = "vencido"
            elif asig.veces_completadas >= asig.veces_requeridas:
                estado = "completado"
            elif asig.fecha_inicio <= hoy <= asig.fecha_fin:
                estado = "en_progreso"
            else:
                estado = "pendiente"

            ejercicios_asignados.append({
                "id_asignacion": asig.id_asignacion,
                "ejercicio": {
                    "id_ejercicio": ejercicio.id_ejercicio,
                    "titulo": ejercicio.titulo,
                    "descripcion": ejercicio.descripcion,
                    "tipo": ejercicio.tipo,
                    "duracion_minutos": ejercicio.duracion_minutos,
                    "nivel_dificultad": ejercicio.nivel_dificultad,
                    "instrucciones": ejercicio.instrucciones,
                    "beneficios": ejercicio.beneficios
                },
                "fecha_inicio": asig.fecha_inicio.isoformat(),
                "fecha_fin": asig.fecha_fin.isoformat(),
                "veces_requeridas": asig.veces_requeridas,
                "veces_completadas": asig.veces_completadas,
                "frecuencia": asig.frecuencia,
                "notas_psicologo": asig.notas_psicologo,
                "estado": estado,
                "esta_activo": asig.esta_activo
            })

        return {
            "ejercicios_asignados": ejercicios_asignados,
            "total": len(ejercicios_asignados)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo ejercicios: {str(e)}"
        )


@router.post("/{id_asignacion}/completar", response_model=dict)
async def completar_ejercicio(
    id_asignacion: int,
    completar_data: CompletarEjercicioRequest,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Marcar ejercicio como completado
    """
    try:
        asignacion = db.query(models.AsignacionEjercicio).filter(
            models.AsignacionEjercicio.id_asignacion == id_asignacion,
            models.AsignacionEjercicio.id_paciente == current_user.id_usuario
        ).first()

        if not asignacion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asignación no encontrada"
            )

        # Incrementar contador
        asignacion.veces_completadas += 1

        # Actualizar estado si completó todas las veces requeridas
        if asignacion.veces_completadas >= asignacion.veces_requeridas:
            asignacion.estado = "completado"

        # Crear registro de completación
        registro_completacion = models.RegistroCompletacionEjercicio(
            id_asignacion=id_asignacion,
            fecha_completacion=datetime.utcnow(),
            duracion_real_minutos=completar_data.duracion_real_minutos,
            calificacion=completar_data.calificacion,
            comentarios=completar_data.comentarios
        )

        db.add(registro_completacion)
        db.commit()

        return {
            "mensaje": "Ejercicio completado exitosamente",
            "veces_completadas": asignacion.veces_completadas,
            "veces_requeridas": asignacion.veces_requeridas,
            "estado": asignacion.estado
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error completando ejercicio: {str(e)}"
        )


# ==================== ESTADÍSTICAS ====================

@router.get("/estadisticas", response_model=dict)
async def obtener_estadisticas_ejercicios(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener estadísticas de ejercicios del paciente
    """
    try:
        asignaciones = db.query(models.AsignacionEjercicio).filter(
            models.AsignacionEjercicio.id_paciente == current_user.id_usuario
        ).all()

        total = len(asignaciones)
        completados = len([a for a in asignaciones if a.estado == "completado"])
        en_progreso = len([a for a in asignaciones if a.estado == "en_progreso"])
        pendientes = len([a for a in asignaciones if a.estado == "pendiente"])

        return {
            "total_asignados": total,
            "completados": completados,
            "en_progreso": en_progreso,
            "pendientes": pendientes,
            "tasa_completacion": round((completados / total * 100) if total > 0 else 0, 1)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )