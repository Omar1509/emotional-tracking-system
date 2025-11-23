# backend/routers/ejercicios.py
# CREAR ESTE ARCHIVO NUEVO

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, datetime
from typing import List
from pydantic import BaseModel
import jwt

from database import get_db
import models

router = APIRouter()

SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"
ALGORITHM = "HS256"

from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# Schemas
class EjercicioCreate(BaseModel):
    titulo: str
    descripcion: str
    tipo: str
    duracion_minutos: int
    nivel_dificultad: str
    instrucciones: str
    objetivo: str


class EjercicioAsignarCreate(BaseModel):
    id_ejercicio: int
    id_paciente: int
    fecha_inicio: date
    fecha_fin: date
    frecuencia: str
    veces_requeridas: int
    notas_psicologo: str = None


class EjercicioCompletarCreate(BaseModel):
    id_asignacion: int
    duracion_real_minutos: int
    calificacion: int
    comentarios: str = None
    dificultad_percibida: str


# ============================================================================
# ENDPOINTS PARA PSICÓLOGOS
# ============================================================================

@router.post("/ejercicios")
async def crear_ejercicio(
    ejercicio: EjercicioCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear un nuevo ejercicio (solo psicólogos)"""
    
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden crear ejercicios")
    
    nuevo_ejercicio = models.Ejercicio(
        titulo=ejercicio.titulo,
        descripcion=ejercicio.descripcion,
        tipo=ejercicio.tipo,
        duracion_minutos=ejercicio.duracion_minutos,
        nivel_dificultad=ejercicio.nivel_dificultad,
        instrucciones=ejercicio.instrucciones,
        objetivo=ejercicio.objetivo,
        id_psicologo_creador=current_user.id_usuario
    )
    
    db.add(nuevo_ejercicio)
    db.commit()
    db.refresh(nuevo_ejercicio)
    
    return {
        "mensaje": "Ejercicio creado exitosamente",
        "ejercicio": {
            "id": nuevo_ejercicio.id_ejercicio,
            "titulo": nuevo_ejercicio.titulo,
            "tipo": nuevo_ejercicio.tipo
        }
    }


@router.get("/ejercicios")
async def listar_ejercicios(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Listar todos los ejercicios activos"""
    
    ejercicios = db.query(models.Ejercicio).filter(
        models.Ejercicio.activo == True
    ).all()
    
    return {
        "ejercicios": [
            {
                "id_ejercicio": e.id_ejercicio,
                "titulo": e.titulo,
                "descripcion": e.descripcion,
                "tipo": e.tipo,
                "duracion_minutos": e.duracion_minutos,
                "nivel_dificultad": e.nivel_dificultad,
                "objetivo": e.objetivo
            }
            for e in ejercicios
        ],
        "total": len(ejercicios)
    }


@router.post("/ejercicios/asignar")
async def asignar_ejercicio(
    asignacion: EjercicioAsignarCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Asignar un ejercicio a un paciente"""
    
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos pueden asignar ejercicios")
    
    # Verificar que el paciente esté asignado al psicólogo
    asignacion_paciente = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == asignacion.id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion_paciente:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    nueva_asignacion = models.EjercicioAsignado(
        id_ejercicio=asignacion.id_ejercicio,
        id_paciente=asignacion.id_paciente,
        id_psicologo=current_user.id_usuario,
        fecha_inicio=asignacion.fecha_inicio,
        fecha_fin=asignacion.fecha_fin,
        frecuencia=asignacion.frecuencia,
        veces_requeridas=asignacion.veces_requeridas,
        notas_psicologo=asignacion.notas_psicologo
    )
    
    db.add(nueva_asignacion)
    db.commit()
    db.refresh(nueva_asignacion)
    
    return {
        "mensaje": "Ejercicio asignado exitosamente",
        "id_asignacion": nueva_asignacion.id_asignacion
    }


@router.get("/ejercicios/paciente/{paciente_id}")
async def obtener_ejercicios_paciente(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener ejercicios asignados a un paciente (para psicólogo)"""
    
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(status_code=403, detail="Solo psicólogos")
    
    # Verificar acceso
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=403, detail="Paciente no asignado")
    
    ejercicios_asignados = db.query(models.EjercicioAsignado).filter(
        models.EjercicioAsignado.id_paciente == paciente_id
    ).all()
    
    resultado = []
    for asig in ejercicios_asignados:
        ejercicio = asig.ejercicio
        resultado.append({
            "id_asignacion": asig.id_asignacion,
            "ejercicio": {
                "titulo": ejercicio.titulo,
                "descripcion": ejercicio.descripcion,
                "tipo": ejercicio.tipo,
                "duracion_minutos": ejercicio.duracion_minutos
            },
            "fecha_inicio": str(asig.fecha_inicio),
            "fecha_fin": str(asig.fecha_fin),
            "frecuencia": asig.frecuencia,
            "veces_requeridas": asig.veces_requeridas,
            "veces_completadas": asig.veces_completadas,
            "estado": asig.estado,
            "progreso_porcentaje": round((asig.veces_completadas / asig.veces_requeridas) * 100, 1) if asig.veces_requeridas > 0 else 0
        })
    
    return {
        "ejercicios_asignados": resultado,
        "total": len(resultado)
    }


# ============================================================================
# ENDPOINTS PARA PACIENTES
# ============================================================================

@router.get("/mis-ejercicios")
async def obtener_mis_ejercicios(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener ejercicios asignados al paciente actual"""
    
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(status_code=403, detail="Solo pacientes")
    
    ejercicios_asignados = db.query(models.EjercicioAsignado).filter(
        models.EjercicioAsignado.id_paciente == current_user.id_usuario
    ).all()
    
    resultado = []
    hoy = date.today()
    
    for asig in ejercicios_asignados:
        ejercicio = asig.ejercicio
        
        # Determinar si está activo (dentro del rango de fechas)
        esta_activo = asig.fecha_inicio <= hoy <= asig.fecha_fin
        
        resultado.append({
            "id_asignacion": asig.id_asignacion,
            "ejercicio": {
                "titulo": ejercicio.titulo,
                "descripcion": ejercicio.descripcion,
                "tipo": ejercicio.tipo,
                "duracion_minutos": ejercicio.duracion_minutos,
                "nivel_dificultad": ejercicio.nivel_dificultad,
                "instrucciones": ejercicio.instrucciones,
                "objetivo": ejercicio.objetivo
            },
            "fecha_inicio": str(asig.fecha_inicio),
            "fecha_fin": str(asig.fecha_fin),
            "frecuencia": asig.frecuencia,
            "veces_requeridas": asig.veces_requeridas,
            "veces_completadas": asig.veces_completadas,
            "estado": asig.estado,
            "progreso_porcentaje": round((asig.veces_completadas / asig.veces_requeridas) * 100, 1) if asig.veces_requeridas > 0 else 0,
            "esta_activo": esta_activo,
            "notas_psicologo": asig.notas_psicologo
        })
    
    return {
        "ejercicios_asignados": resultado,
        "total": len(resultado),
        "activos": len([e for e in resultado if e['esta_activo']])
    }


@router.post("/ejercicios/completar")
async def completar_ejercicio(
    completado: EjercicioCompletarCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Marcar un ejercicio como completado"""
    
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(status_code=403, detail="Solo pacientes")
    
    # Verificar que la asignación pertenece al paciente
    asignacion = db.query(models.EjercicioAsignado).filter(
        models.EjercicioAsignado.id_asignacion == completado.id_asignacion,
        models.EjercicioAsignado.id_paciente == current_user.id_usuario
    ).first()
    
    if not asignacion:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    # Crear registro de completado
    nuevo_completado = models.EjercicioCompletado(
        id_asignacion=completado.id_asignacion,
        duracion_real_minutos=completado.duracion_real_minutos,
        calificacion=completado.calificacion,
        comentarios=completado.comentarios,
        dificultad_percibida=completado.dificultad_percibida
    )
    
    db.add(nuevo_completado)
    
    # Actualizar contador de veces completadas
    asignacion.veces_completadas += 1
    
    # Actualizar estado si ya completó todas las veces
    if asignacion.veces_completadas >= asignacion.veces_requeridas:
        asignacion.estado = "completado"
    elif asignacion.veces_completadas > 0:
        asignacion.estado = "en_progreso"
    
    db.commit()
    
    return {
        "mensaje": "Ejercicio completado exitosamente",
        "veces_completadas": asignacion.veces_completadas,
        "veces_requeridas": asignacion.veces_requeridas,
        "estado": asignacion.estado
    }