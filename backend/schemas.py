from pydantic import BaseModel, EmailStr, Field, validator
from datetime import datetime, date, time
from typing import Optional, List
from models import UserRole, AppointmentStatus, NotificationType, RiskLevel

# Usuario Schemas
class UsuarioBase(BaseModel):
    email: EmailStr
    nombre: str
    apellido: str
    cedula: Optional[str] = None  # ✅ NUEVO CAMPO
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    direccion: Optional[str] = None
    rol: UserRole

class UsuarioCreate(UsuarioBase):
    password: str

class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cedula: Optional[str] = None  # ✅ NUEVO CAMPO
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None

class Usuario(UsuarioBase):
    id_usuario: int
    fecha_registro: datetime
    activo: bool
    ultimo_acceso: Optional[datetime] = None
    debe_cambiar_password: bool = False  # ✅ NUEVO CAMPO
    
    class Config:
        from_attributes = True

# ✅ NUEVO: Schema para registro de paciente por psicólogo
class PacienteRegistro(BaseModel):
    primer_nombre: str = Field(min_length=2, max_length=50)
    segundo_nombre: Optional[str] = Field(None, max_length=50)
    primer_apellido: str = Field(min_length=2, max_length=50)
    segundo_apellido: Optional[str] = Field(None, max_length=50)
    cedula: str = Field(min_length=10, max_length=20)  # ✅ NUEVO CAMPO OBLIGATORIO
    correo: EmailStr  # ✅ NUEVO CAMPO OBLIGATORIO
    telefono: str = Field(pattern=r'^\+?[0-9]{10,15}$')
    direccion: str = Field(min_length=10)
    fecha_nacimiento: date
    genero: Optional[str] = Field(None, pattern=r'^(masculino|femenino|otro|prefiero_no_decir)$')
    contacto_emergencia_nombre: str = Field(min_length=5)
    contacto_emergencia_telefono: str = Field(pattern=r'^\+?[0-9]{10,15}$')
    contacto_emergencia_relacion: str
    alergias: Optional[str] = None
    medicamentos_actuales: Optional[str] = None
    condiciones_medicas: Optional[str] = None
    motivo_consulta: str = Field(min_length=20)
    
    @validator('fecha_nacimiento')
    def validar_edad_minima(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 13:
            raise ValueError('El paciente debe tener al menos 13 años')
        if age > 120:
            raise ValueError('Fecha de nacimiento inválida')
        return v

# ✅ NUEVO: Schema para editar paciente
class PacienteEditar(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    cedula: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    activo: Optional[bool] = None

# Registro Emocional Schemas
class RegistroEmocionalBase(BaseModel):
    nivel_animo: int = Field(ge=1, le=10)
    emocion_principal: Optional[str] = None
    intensidad_emocion: Optional[float] = Field(None, ge=0, le=1)
    notas: Optional[str] = None
    contexto: Optional[str] = None
    ubicacion: Optional[str] = None
    clima: Optional[str] = None

class RegistroEmocionalCreate(RegistroEmocionalBase):
    pass

class RegistroEmocional(RegistroEmocionalBase):
    id_registro: int
    id_usuario: int
    fecha_hora: datetime
    sentimiento_score: Optional[float] = None
    sentimiento_label: Optional[str] = None
    emociones_detectadas: Optional[str] = None
    nivel_riesgo: Optional[RiskLevel] = None
    score_riesgo: Optional[float] = None
    alertas_activadas: bool
    
    class Config:
        from_attributes = True

# Factor de Influencia Schemas
class FactorInfluenciaBase(BaseModel):
    tipo_factor: str
    descripcion: Optional[str] = None
    impacto: int = Field(ge=-5, le=5)

class FactorInfluenciaCreate(FactorInfluenciaBase):
    id_registro: int

class FactorInfluencia(FactorInfluenciaBase):
    id_factor: int
    id_registro: int
    
    class Config:
        from_attributes = True

# Mensaje Chat Schemas
class MensajeChatBase(BaseModel):
    mensaje: str
    es_bot: bool = False

class MensajeChatCreate(MensajeChatBase):
    pass

class MensajeChat(MensajeChatBase):
    id_mensaje: int
    id_usuario: int
    fecha_hora: datetime
    intencion: Optional[str] = None
    confianza_intencion: Optional[float] = None
    sentimiento_mensaje: Optional[float] = None
    emocion_detectada: Optional[str] = None
    id_sesion_chat: Optional[str] = None
    
    class Config:
        from_attributes = True

# ✅ NUEVO: Schemas para Citas
class CitaBase(BaseModel):
    fecha: date
    hora_inicio: time
    hora_fin: Optional[time] = None
    duracion_minutos: int = 60
    modalidad: Optional[str] = "virtual"
    url_videollamada: Optional[str] = None
    notas_previas: Optional[str] = None
    objetivos: Optional[str] = None

class CitaCreate(CitaBase):
    id_paciente: int

class CitaUpdate(BaseModel):
    fecha: Optional[date] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    estado: Optional[AppointmentStatus] = None
    notas_sesion: Optional[str] = None
    tareas_asignadas: Optional[str] = None
    modalidad: Optional[str] = None
    url_videollamada: Optional[str] = None

class Cita(CitaBase):
    id_cita: int
    id_paciente: int
    id_psicologo: int
    estado: AppointmentStatus
    recordatorio_enviado: bool
    fecha_creacion: datetime
    fecha_modificacion: Optional[datetime] = None
    notas_sesion: Optional[str] = None
    tareas_asignadas: Optional[str] = None
    
    # ✅ NUEVO: Información del paciente y psicólogo
    paciente_nombre: Optional[str] = None
    psicologo_nombre: Optional[str] = None
    
    class Config:
        from_attributes = True

# Notificación Schemas
class NotificacionBase(BaseModel):
    tipo: NotificationType
    titulo: str
    mensaje: str
    prioridad: str = "normal"
    fecha_programada: Optional[datetime] = None

class NotificacionCreate(NotificacionBase):
    id_usuario: int

class Notificacion(NotificacionBase):
    id_notificacion: int
    id_usuario: int
    fecha_creacion: datetime
    fecha_enviada: Optional[datetime] = None
    fecha_leida: Optional[datetime] = None
    enviada: bool
    leida: bool
    datos_extra: Optional[str] = None
    
    class Config:
        from_attributes = True

# Dispositivo Schemas
class DispositivoBase(BaseModel):
    token_fcm: str
    tipo_dispositivo: Optional[str] = None
    modelo: Optional[str] = None
    sistema_operativo: Optional[str] = None
    version_app: Optional[str] = None

class DispositivoCreate(DispositivoBase):
    id_usuario: int

class Dispositivo(DispositivoBase):
    id_dispositivo: int
    id_usuario: int
    activo: bool
    fecha_registro: datetime
    ultimo_uso: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Asignación Paciente-Psicólogo Schemas
class PacientePsicologoBase(BaseModel):
    id_paciente: int
    id_psicologo: int
    notas: Optional[str] = None

class PacientePsicologoCreate(PacientePsicologoBase):
    pass

class PacientePsicologo(PacientePsicologoBase):
    id_asignacion: int
    fecha_asignacion: datetime
    activo: bool
    
    class Config:
        from_attributes = True

# Evaluación Psicológica Schemas
class EvaluacionPsicologicaBase(BaseModel):
    tipo_evaluacion: str
    puntaje: Optional[float] = None
    interpretacion: Optional[str] = None
    diagnostico: Optional[str] = None
    plan_tratamiento: Optional[str] = None
    observaciones: Optional[str] = None

class EvaluacionPsicologicaCreate(EvaluacionPsicologicaBase):
    id_paciente: int
    id_psicologo: int

class EvaluacionPsicologica(EvaluacionPsicologicaBase):
    id_evaluacion: int
    id_paciente: int
    id_psicologo: int
    fecha_evaluacion: datetime
    archivo_adjunto: Optional[str] = None
    
    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsEmocional(BaseModel):
    promedio_animo: float
    total_registros: int
    distribucion_emociones: dict
    tendencia: str
    registros_alto_riesgo: int
    nivel_riesgo_actual: Optional[str] = None

class AnalyticsPaciente(BaseModel):
    id_paciente: int
    nombre_completo: str
    total_registros: int
    promedio_animo_30dias: float
    ultima_cita: Optional[date] = None
    proxima_cita: Optional[date] = None
    nivel_riesgo_actual: Optional[str] = None
    alertas_activas: int

# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    nombre_completo: str
    debe_cambiar_password: bool = False  # ✅ NUEVO CAMPO

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# ✅ NUEVO: Schema para cambio de contraseña
class CambioPassword(BaseModel):
    password_actual: str
    password_nueva: str = Field(min_length=8)
    
    @validator('password_nueva')
    def validar_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not any(c.isdigit() for c in v):
            raise ValueError('La contraseña debe contener al menos un número')
        if not any(c.isupper() for c in v):
            raise ValueError('La contraseña debe contener al menos una mayúscula')
        return v

# Schemas de Registro Completo (compatibilidad)
class RegistroPacienteCompleto(BaseModel):
    primer_nombre: str = Field(min_length=2, max_length=50)
    segundo_nombre: Optional[str] = Field(None, max_length=50)
    primer_apellido: str = Field(min_length=2, max_length=50)
    segundo_apellido: Optional[str] = Field(None, max_length=50)
    telefono: str = Field(pattern=r'^\+?[0-9]{10,15}$')
    direccion: str = Field(min_length=10)
    fecha_nacimiento: date
    genero: Optional[str] = Field(None, pattern=r'^(masculino|femenino|otro|prefiero_no_decir)$')
    contacto_emergencia_nombre: str = Field(min_length=5)
    contacto_emergencia_telefono: str = Field(pattern=r'^\+?[0-9]{10,15}$')
    contacto_emergencia_relacion: str
    alergias: Optional[str] = None
    medicamentos_actuales: Optional[str] = None
    condiciones_medicas: Optional[str] = None
    motivo_consulta: str = Field(min_length=20)
    
    @validator('fecha_nacimiento')
    def validar_edad_minima(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 13:
            raise ValueError('El paciente debe tener al menos 13 años')
        if age > 120:
            raise ValueError('Fecha de nacimiento inválida')
        return v

class RegistroPsicologoCompleto(BaseModel):
    primer_nombre: str = Field(min_length=2, max_length=50)
    segundo_nombre: Optional[str] = Field(None, max_length=50)
    primer_apellido: str = Field(min_length=2, max_length=50)
    segundo_apellido: Optional[str] = Field(None, max_length=50)
    email_personal: EmailStr
    telefono: str = Field(pattern=r'^\+?[0-9]{10,15}$')
    direccion: str = Field(min_length=10)
    fecha_nacimiento: date
    numero_licencia: str = Field(min_length=5)
    titulo_profesional: str
    especialidad: Optional[str] = None
    años_experiencia: int = Field(ge=0, le=50)
    institucion_formacion: str
    
    @validator('fecha_nacimiento')
    def validar_edad_profesional(cls, v):
        today = date.today()
        age = today.year - v.year - ((today.month, today.day) < (v.month, v.day))
        if age < 23:
            raise ValueError('Edad mínima no cumplida para psicólogo profesional')
        return v

class RespuestaRegistro(BaseModel):
    mensaje: str
    usuario: Usuario
    credenciales: dict
    instrucciones: str