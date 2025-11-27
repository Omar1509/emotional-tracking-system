# backend/routers/pacientes.py
# ✅ ROUTER DE PACIENTES - VERSIÓN CORREGIDA CON CAMPOS CORRECTOS

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date

import models
from database import get_db
from dependencies import get_current_user, get_current_paciente

# ✅ DEFINIR ROUTER PRIMERO
router = APIRouter()

# ==================== PERFIL DEL PACIENTE ====================

@router.get("/perfil")
async def obtener_perfil_paciente(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener perfil del paciente autenticado
    """
    try:
        return {
            "id_usuario": current_user.id_usuario,
            "nombre": current_user.nombre,
            "apellido": current_user.apellido,
            "email": current_user.email,
            "telefono": current_user.telefono,
            "fecha_nacimiento": current_user.fecha_nacimiento.isoformat() if current_user.fecha_nacimiento else None,
            "genero": current_user.genero,
            "edad": current_user.edad,
            "activo": current_user.activo
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo perfil: {str(e)}"
        )


@router.put("/perfil")
async def actualizar_perfil_paciente(
    telefono: Optional[str] = None,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Actualizar perfil del paciente
    """
    try:
        if telefono:
            current_user.telefono = telefono
        
        db.commit()
        db.refresh(current_user)

        return {
            "mensaje": "Perfil actualizado exitosamente",
            "usuario": {
                "id_usuario": current_user.id_usuario,
                "nombre": current_user.nombre,
                "apellido": current_user.apellido,
                "email": current_user.email,
                "telefono": current_user.telefono
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error actualizando perfil: {str(e)}"
        )


# ==================== REGISTROS EMOCIONALES ====================

@router.get("/{id_paciente}/registros-emocionales")
async def obtener_registros_emocionales(
    id_paciente: int,
    limite: int = 50,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener registros emocionales de un paciente
    - Paciente: solo puede ver sus propios registros
    - Psicólogo: puede ver registros de sus pacientes asignados
    """
    try:
        # Verificar permisos
        if current_user.rol == 'paciente':
            if current_user.id_usuario != id_paciente:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No tienes permiso para ver estos registros"
                )
        elif current_user.rol == 'psicologo':
            # Verificar que el paciente está asignado a este psicólogo
            asignacion = db.query(models.PacientePsicologo).filter(
                models.PacientePsicologo.id_paciente == id_paciente,
                models.PacientePsicologo.id_psicologo == current_user.id_usuario,
                models.PacientePsicologo.activo == True
            ).first()

            if not asignacion:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="El paciente no está asignado a este psicólogo"
                )

        # Obtener registros
        registros = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == id_paciente
        ).order_by(
            models.RegistroEmocional.fecha_hora.desc()
        ).limit(limite).all()

        # ✅ FIX CRÍTICO: Usar los nombres de campos correctos del modelo
        registros_dict = [
            {
                "id_registro": reg.id_registro,
                "fecha_hora": reg.fecha_hora.isoformat(),
                "emocion_principal": reg.emocion_principal,
                "nivel_animo": reg.nivel_animo,
                "intensidad_emocion": reg.intensidad_emocion,  # ✅ CORREGIDO: era intensidad_emocional
                "notas": reg.notas,
                "contexto": reg.contexto,
                "sentimiento_score": getattr(reg, 'sentimiento_score', None),
                "nivel_riesgo": reg.nivel_riesgo.value if reg.nivel_riesgo else None
            }
            for reg in registros
        ]

        return {
            "registros": registros_dict,
            "total": len(registros_dict)
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo registros: {str(e)}"
        )


# ==================== ESTADÍSTICAS ====================

@router.get("/estadisticas")
async def obtener_estadisticas_paciente(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener estadísticas del paciente
    """
    try:
        # Contar registros totales
        total_registros = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == current_user.id_usuario
        ).count()

        # Calcular promedio de ánimo
        registros = db.query(models.RegistroEmocional).filter(
            models.RegistroEmocional.id_usuario == current_user.id_usuario
        ).all()

        promedio_animo = 0
        if registros:
            suma_animo = sum(r.nivel_animo for r in registros if r.nivel_animo)
            promedio_animo = round(suma_animo / len(registros), 1) if registros else 0

        return {
            "total_registros": total_registros,
            "promedio_animo": promedio_animo,
            "registros_ultima_semana": len([
                r for r in registros 
                if (datetime.utcnow() - r.fecha_hora).days <= 7
            ])
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo estadísticas: {str(e)}"
        )


# ==================== MI PSICÓLOGO ====================

@router.get("/mi-psicologo")
async def obtener_mi_psicologo(
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener información del psicólogo asignado
    """
    try:
        asignacion = db.query(models.PacientePsicologo).filter(
            models.PacientePsicologo.id_paciente == current_user.id_usuario,
            models.PacientePsicologo.activo == True
        ).first()

        if not asignacion:
            return {
                "tiene_psicologo": False,
                "mensaje": "No tienes un psicólogo asignado"
            }

        psicologo = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == asignacion.id_psicologo
        ).first()

        return {
            "tiene_psicologo": True,
            "psicologo": {
                "id_usuario": psicologo.id_usuario,
                "nombre": psicologo.nombre,
                "apellido": psicologo.apellido,
                "email": psicologo.email,
                "telefono": psicologo.telefono,
                "fecha_asignacion": asignacion.fecha_asignacion.isoformat()
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error obteniendo psicólogo: {str(e)}"
        )