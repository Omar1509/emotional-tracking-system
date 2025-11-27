# backend/app/routes/usuarios.py
# Rutas para gestión de usuarios

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext

from app.database import get_db
from app.models import Usuario
from app.auth import get_current_user

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class CambiarContrasenaRequest(BaseModel):
    contrasena_actual: str
    contrasena_nueva: str


@router.get("/me")
async def obtener_perfil(
    current_user: Usuario = Depends(get_current_user)
):
    """Obtener información del perfil del usuario autenticado"""
    return {
        "id_usuario": current_user.id_usuario,
        "nombre_completo": f"{current_user.nombre} {current_user.apellido}",
        "nombre": current_user.nombre,
        "apellido": current_user.apellido,
        "correo": current_user.correo,
        "telefono": current_user.telefono,
        "direccion": current_user.direccion,
        "rol": current_user.rol,
        "activo": current_user.activo,
        "fecha_registro": current_user.fecha_registro
    }


@router.put("/cambiar-contrasena")
async def cambiar_contrasena(
    data: CambiarContrasenaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """Cambiar la contraseña del usuario autenticado"""
    try:
        print(f"🔐 Intento de cambio de contraseña para: {current_user.correo}")
        
        # Verificar contraseña actual
        if not pwd_context.verify(data.contrasena_actual, current_user.password):
            print(f"❌ Contraseña actual incorrecta")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña actual es incorrecta"
            )
        
        print("✅ Contraseña actual verificada")
        
        # Verificar que sea diferente
        if pwd_context.verify(data.contrasena_nueva, current_user.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La nueva contraseña debe ser diferente a la actual"
            )
        
        # Validar longitud
        if len(data.contrasena_nueva) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La contraseña debe tener al menos 8 caracteres"
            )
        
        # Actualizar contraseña
        hashed_password = pwd_context.hash(data.contrasena_nueva)
        current_user.password = hashed_password
        db.commit()
        
        print(f"✅ Contraseña actualizada exitosamente")
        
        return {
            "message": "Contraseña actualizada exitosamente",
            "success": True
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al cambiar la contraseña"
        )