from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import date, time, datetime
from typing import List, Optional
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


# ============= SCHEMAS =============

class CitaCreate(BaseModel):
    id_paciente: int
    fecha: date
    hora_inicio: time
    hora_fin: Optional[time] = None
    duracion_minutos: int = 60
    modalidad: str = "virtual"
    url_videollamada: Optional[str] = None
    notas_previas: Optional[str] = None
    objetivos: Optional[str] = None


class CitaUpdate(BaseModel):
    fecha: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    estado: Optional[str] = None
    notas_sesion: Optional[str] = None
    tareas_asignadas: Optional[str] = None
    modalidad: Optional[str] = None
    url_videollamada: Optional[str] = None


# ============= ENDPOINTS PARA PSICÓLOGOS =============

@router.post("/crear")
async def crear_cita(
    cita: CitaCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crear una nueva cita (solo psicólogos)
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden crear citas"
        )
    
    # Verificar que el paciente está asignado
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == cita.id_paciente,
        models.PacientePsicologo.id_psicologo == current_user.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    if not asignacion:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Paciente no asignado"
        )
    
    # Crear cita
    nueva_cita = models.Cita(
        id_paciente=cita.id_paciente,
        id_psicologo=current_user.id_usuario,
        fecha=cita.fecha,
        hora_inicio=cita.hora_inicio,
        hora_fin=cita.hora_fin,
        duracion_minutos=cita.duracion_minutos,
        modalidad=cita.modalidad,
        url_videollamada=cita.url_videollamada,
        notas_previas=cita.notas_previas,
        objetivos=cita.objetivos,
        estado=models.AppointmentStatus.PROGRAMADA
    )
    
    db.add(nueva_cita)
    db.commit()
    db.refresh(nueva_cita)
    
    return {
        "mensaje": "Cita creada exitosamente",
        "notificacion": {
            "tipo": "exito",
            "titulo": "¡Cita Creada!",
            "descripcion": f"Cita programada para el {cita.fecha.strftime('%d/%m/%Y')} a las {cita.hora_inicio.strftime('%H:%M')}"
        },
        "cita": {
            "id_cita": nueva_cita.id_cita,
            "fecha": str(nueva_cita.fecha),
            "hora_inicio": str(nueva_cita.hora_inicio),
            "modalidad": nueva_cita.modalidad,
            "estado": nueva_cita.estado.value
        }
    }


@router.get("/psicologo/mis-citas")
async def obtener_citas_psicologo(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener todas las citas del psicólogo
    """
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos"
        )
    
    citas = db.query(models.Cita).filter(
        models.Cita.id_psicologo == current_user.id_usuario
    ).order_by(models.Cita.fecha.desc(), models.Cita.hora_inicio.desc()).all()
    
    citas_formateadas = []
    for cita in citas:
        paciente = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == cita.id_paciente
        ).first()
        
        citas_formateadas.append({
            "id_cita": cita.id_cita,
            "fecha": str(cita.fecha),
            "hora_inicio": str(cita.hora_inicio),
            "hora_fin": str(cita.hora_fin) if cita.hora_fin else None,
            "duracion_minutos": cita.duracion_minutos,
            "modalidad": cita.modalidad,
            "estado": cita.estado.value,
            "paciente": {
                "id": cita.id_paciente,
                "nombre_completo": f"{paciente.nombre} {paciente.apellido}" if paciente else "Desconocido"
            },
            "notas_previas": cita.notas_previas,
            "notas_sesion": cita.notas_sesion,
            "objetivos": cita.objetivos
        })
    
    return {
        "total_citas": len(citas_formateadas),
        "citas": citas_formateadas
    }


# ============= ENDPOINTS PARA PACIENTES =============

@router.get("/paciente/mis-citas")
async def obtener_citas_paciente(
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener todas las citas del paciente con iconos de asistencia
    """
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes"
        )
    
    citas = db.query(models.Cita).filter(
        models.Cita.id_paciente == current_user.id_usuario
    ).order_by(models.Cita.fecha.desc()).all()
    
    citas_formateadas = []
    fecha_actual = datetime.now()
    
    for cita in citas:
        psicologo = db.query(models.Usuario).filter(
            models.Usuario.id_usuario == cita.id_psicologo
        ).first()
        
        # Determinar si la cita ya pasó
        fecha_hora_cita = datetime.combine(cita.fecha, cita.hora_inicio)
        cita_pasada = fecha_hora_cita < fecha_actual
        
        # Asignar iconos según estado
        if cita.estado == models.AppointmentStatus.PROGRAMADA:
            icono_asistencia = "⏳"
            texto_asistencia = "Pendiente"
        elif cita.estado == models.AppointmentStatus.COMPLETADA:
            icono_asistencia = "✓"
            texto_asistencia = "Asistió"
        elif cita.estado == models.AppointmentStatus.NO_ASISTIO:
            icono_asistencia = "✗"
            texto_asistencia = "No asistió"
        elif cita.estado == models.AppointmentStatus.CANCELADA:
            icono_asistencia = "⊗"
            texto_asistencia = "Cancelada"
        else:
            icono_asistencia = "?"
            texto_asistencia = "Sin información"
        
        citas_formateadas.append({
            "id_cita": cita.id_cita,
            "fecha": str(cita.fecha),
            "hora_inicio": str(cita.hora_inicio),
            "hora_fin": str(cita.hora_fin) if cita.hora_fin else None,
            "duracion_minutos": cita.duracion_minutos,
            "modalidad": cita.modalidad,
            "url_videollamada": cita.url_videollamada,
            "estado": cita.estado.value,
            "psicologo": {
                "nombre": f"Dr(a). {psicologo.nombre} {psicologo.apellido}" if psicologo else "Desconocido",
                "telefono": psicologo.telefono if psicologo else None
            },
            "notas_sesion": cita.notas_sesion,
            "tareas_asignadas": cita.tareas_asignadas,
            "icono_asistencia": icono_asistencia,
            "texto_asistencia": texto_asistencia,
            "ya_paso": cita_pasada
        })
    
    return {
        "total_citas": len(citas_formateadas),
        "citas": citas_formateadas
    }


@router.put("/{id_cita}")
async def actualizar_cita(
    id_cita: int,
    cita_update: CitaUpdate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualizar una cita existente
    """
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == id_cita
    ).first()
    
    if not cita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    # Verificar permisos
    if current_user.rol == models.UserRole.PSICOLOGO:
        if cita.id_psicologo != current_user.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar esta cita"
            )
    elif current_user.rol == models.UserRole.PACIENTE:
        if cita.id_paciente != current_user.id_usuario:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para modificar esta cita"
            )
    
    # Actualizar campos
    if cita_update.fecha is not None:
        cita.fecha = cita_update.fecha
    if cita_update.hora_inicio is not None:
        cita.hora_inicio = cita_update.hora_inicio
    if cita_update.hora_fin is not None:
        cita.hora_fin = cita_update.hora_fin
    if cita_update.estado is not None:
        cita.estado = models.AppointmentStatus(cita_update.estado)
    if cita_update.notas_sesion is not None:
        cita.notas_sesion = cita_update.notas_sesion
    if cita_update.tareas_asignadas is not None:
        cita.tareas_asignadas = cita_update.tareas_asignadas
    if cita_update.modalidad is not None:
        cita.modalidad = cita_update.modalidad
    if cita_update.url_videollamada is not None:
        cita.url_videollamada = cita_update.url_videollamada
    
    cita.fecha_modificacion = datetime.utcnow()
    
    db.commit()
    db.refresh(cita)
    
    return {
        "mensaje": "Cita actualizada exitosamente",
        "cita": {
            "id_cita": cita.id_cita,
            "fecha": str(cita.fecha),
            "hora_inicio": str(cita.hora_inicio),
            "estado": cita.estado.value
        }
    }


@router.delete("/{id_cita}")
async def cancelar_cita(
    id_cita: int,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cancelar una cita
    """
    cita = db.query(models.Cita).filter(
        models.Cita.id_cita == id_cita
    ).first()
    
    if not cita:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cita no encontrada"
        )
    
    # Verificar permisos
    if current_user.rol == models.UserRole.PSICOLOGO:
        if cita.id_psicologo != current_user.id_usuario:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    elif current_user.rol == models.UserRole.PACIENTE:
        if cita.id_paciente != current_user.id_usuario:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    
    cita.estado = models.AppointmentStatus.CANCELADA
    db.commit()
    
    return {
        "mensaje": "Cita cancelada exitosamente",
        "id_cita": id_cita
    }