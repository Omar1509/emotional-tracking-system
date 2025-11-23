# backend/auth.py
# Agregar/actualizar estas funciones en tu archivo auth.py

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
import bcrypt

import models
import schemas
from database import get_db
from email_service import send_password_changed

router = APIRouter(tags=["Autenticación"])

# Configuración JWT
SECRET_KEY = "your-secret-key-change-this-in-production"  # ⚠️ CAMBIAR EN PRODUCCIÓN
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    """Crea un token JWT"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica una contraseña"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def hash_password(password: str) -> str:
    """Hashea una contraseña"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> models.Usuario:
    """Obtiene el usuario actual desde el token"""
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
    except JWTError:
        raise credentials_exception
    
    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise credentials_exception
    
    if not user.activo:
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    
    return user

@router.post("/token", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    ✅ Login con verificación de cambio de contraseña obligatorio
    """
    user = db.query(models.Usuario).filter(
        models.Usuario.email == form_data.username
    ).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado"
        )
    
    # Actualizar último acceso
    user.ultimo_acceso = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.rol,
        "user_id": user.id_usuario,
        "nombre_completo": f"{user.nombre} {user.apellido}",
        "requiere_cambio_password": user.requiere_cambio_password  # ✅ IMPORTANTE
    }

@router.post("/cambiar-password")
async def cambiar_password(
    password_data: schemas.PasswordChange,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    ✅ Cambia la contraseña del usuario
    """
    # Verificar contraseña actual
    if not verify_password(password_data.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta"
        )
    
    # Validar que la nueva contraseña sea diferente
    if password_data.password_actual == password_data.password_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual"
        )
    
    # Actualizar contraseña
    current_user.password_hash = hash_password(password_data.password_nueva)
    current_user.requiere_cambio_password = False  # ✅ Ya no requiere cambio
    
    db.commit()
    
    # Enviar notificación por correo
    try:
        send_password_changed(
            to_email=current_user.email,
            nombre=f"{current_user.nombre} {current_user.apellido}"
        )
    except Exception as e:
        print(f"Error enviando notificación de cambio de contraseña: {e}")
    
    return {
        "mensaje": "Contraseña actualizada exitosamente",
        "requiere_cambio_password": False
    }

@router.post("/verificar-token")
async def verificar_token(current_user: models.Usuario = Depends(get_current_user)):
    """
    ✅ Verifica si el token es válido y devuelve info del usuario
    """
    return {
        "user_id": current_user.id_usuario,
        "email": current_user.email,
        "nombre": f"{current_user.nombre} {current_user.apellido}",
        "rol": current_user.rol,
        "requiere_cambio_password": current_user.requiere_cambio_password
    }