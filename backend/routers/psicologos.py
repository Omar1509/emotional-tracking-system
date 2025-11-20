# backend/routers/psicologos.py
# Asegúrate de que este endpoint existe:

@router.post("/psicologos/registrar-paciente")
def registrar_paciente(
    paciente_data: schemas.PacienteCreate,
    current_user: models.Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Registra un nuevo paciente y lo asigna al psicólogo actual
    """
    # Verificar que sea psicólogo
    if current_user.rol != models.UserRole.PSICOLOGO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo psicólogos pueden registrar pacientes"
        )
    
    # Verificar si el email ya existe
    existing_user = db.query(models.Usuario).filter(
        models.Usuario.email == paciente_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El email ya está registrado"
        )
    
    # Crear usuario paciente
    hashed_password = bcrypt.hashpw(
        paciente_data.password.encode('utf-8'),
        bcrypt.gensalt()
    )
    
    nuevo_paciente = models.Usuario(
        email=paciente_data.email,
        password=hashed_password.decode('utf-8'),
        nombre=paciente_data.nombre,
        apellido=paciente_data.apellido,
        fecha_nacimiento=paciente_data.fecha_nacimiento,
        telefono=paciente_data.telefono,
        direccion=paciente_data.direccion,
        rol=models.UserRole.PACIENTE
    )
    
    db.add(nuevo_paciente)
    db.commit()
    db.refresh(nuevo_paciente)
    
    # Asignar al psicólogo
    asignacion = models.PacientePsicologo(
        id_paciente=nuevo_paciente.id_usuario,
        id_psicologo=current_user.id_usuario,
        activo=True
    )
    
    db.add(asignacion)
    db.commit()
    
    return {
        "mensaje": "Paciente registrado exitosamente",
        "paciente": {
            "id": nuevo_paciente.id_usuario,
            "nombre": nuevo_paciente.nombre,
            "apellido": nuevo_paciente.apellido,
            "email": nuevo_paciente.email
        }
    }