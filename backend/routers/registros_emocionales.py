# backend/routers/registros_emocionales.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

import models
from database import get_db
from dependencies import get_current_paciente, get_current_user

router = APIRouter()

@router.get("/")
async def obtener_mis_registros(
    limite: int = 50,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Obtener registros emocionales del paciente autenticado
    """
    registros = db.query(models.RegistroEmocional).filter(
        models.RegistroEmocional.id_usuario == current_user.id_usuario
    ).order_by(
        models.RegistroEmocional.fecha_hora.desc()
    ).limit(limite).all()

    return {
        "registros": [
            {
                "id_registro": r.id_registro,
                "fecha_hora": r.fecha_hora.isoformat(),
                "nivel_animo": r.nivel_animo,
                "emocion_principal": r.emocion_principal,
                "intensidad_emocion": r.intensidad_emocion,
                "notas": r.notas,
                "contexto": r.contexto,
                "sentimiento_score": r.sentimiento_score,
                "nivel_riesgo": r.nivel_riesgo.value if r.nivel_riesgo else None
            }
            for r in registros
        ],
        "total": len(registros)
    }

@router.post("/")
async def crear_registro_emocional(
    nivel_animo: int,
    emocion_principal: str,
    intensidad_emocion: float = None,
    notas: str = None,
    contexto: str = None,
    current_user: models.Usuario = Depends(get_current_paciente),
    db: Session = Depends(get_db)
):
    """
    ✅ Crear nuevo registro emocional
    """
    nuevo_registro = models.RegistroEmocional(
        id_usuario=current_user.id_usuario,
        nivel_animo=nivel_animo,
        emocion_principal=emocion_principal,
        intensidad_emocion=intensidad_emocion,
        notas=notas,
        contexto=contexto,
        fecha_hora=datetime.utcnow()
    )
    
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    
    return {
        "mensaje": "Registro creado exitosamente",
        "id_registro": nuevo_registro.id_registro
    }