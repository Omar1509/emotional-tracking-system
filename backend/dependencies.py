# backend/dependencies.py
# ✅ AUTENTICACIÓN CENTRALIZADA PARA TODOS LOS ROUTERS

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional

import models
from database import get_db

# ==================== CONFIGURACIÓN JWT ====================
SECRET_KEY = "tu-clave-secreta-cambiar-en-produccion"  # ⚠️ CAMBIAR EN PRODUCCIÓN
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 horas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ==================== FUNCIONES DE TOKEN ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Crea un token JWT"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decodifica y valida un token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ==================== DEPENDENCIA DE AUTENTICACIÓN ====================

async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: Session = Depends(get_db)
) -> models.Usuario:
    """
    Obtiene el usuario actual desde el token JWT
    ✅ ESTA ES LA ÚNICA FUNCIÓN QUE DEBEN USAR TODOS LOS ROUTERS
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = decode_token(token)
        email: str = payload.get("sub")
        
        if email is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Buscar usuario en la base de datos
    user = db.query(models.Usuario).filter(
        models.Usuario.email == email
    ).first()
    
    if user is None:
        raise credentials_exception
    
    # Verificar que el usuario esté activo
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    return user


# ==================== DEPENDENCIAS DE ROLES ====================

async def get_current_paciente(
    current_user: models.Usuario = Depends(get_current_user)
) -> models.Usuario:
    """Verifica que el usuario sea paciente"""
    if current_user.rol != models.UserRole.PACIENTE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo pacientes pueden acceder a este recurso"
        )
    return current_user


async def get_current_psicologo(
    current_user: models.Usuario = Depends(get_current_user)
) -> models.Usuario:
    """Verifica que el usuario sea psicólogo"""
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden acceder a este recurso"
        )
    return current_user


async def get_current_admin(
    current_user: models.Usuario = Depends(get_current_user)
) -> models.Usuario:
    """Verifica que el usuario sea administrador"""
    if current_user.rol != models.UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden acceder a este recurso"
        )
    return current_user


# ==================== VALIDACIÓN DE PERMISOS ====================

def verificar_acceso_paciente(
    psicologo: models.Usuario,
    paciente_id: int,
    db: Session
) -> bool:
    """
    Verifica que el psicólogo tenga acceso al paciente
    """
    asignacion = db.query(models.PacientePsicologo).filter(
        models.PacientePsicologo.id_paciente == paciente_id,
        models.PacientePsicologo.id_psicologo == psicologo.id_usuario,
        models.PacientePsicologo.activo == True
    ).first()
    
    return asignacion is not None


def require_paciente_access(
    paciente_id: int,
    current_user: models.Usuario = Depends(get_current_psicologo),
    db: Session = Depends(get_db)
):
    """
    Dependencia que verifica acceso del psicólogo al paciente
    Uso: @router.get("/paciente/{paciente_id}", dependencies=[Depends(require_paciente_access)])
    """
    if not verificar_acceso_paciente(current_user, paciente_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a este paciente"
        )
    
    return True