from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean, Date, Time, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import enum

# Enums
class UserRole(str, enum.Enum):
    PACIENTE = "paciente"
    PSICOLOGO = "psicologo"
    ADMIN = "admin"

class AppointmentStatus(str, enum.Enum):
    PROGRAMADA = "programada"
    COMPLETADA = "completada"
    CANCELADA = "cancelada"
    NO_ASISTIO = "no_asistio"

class NotificationType(str, enum.Enum):
    RECORDATORIO = "recordatorio"
    ALERTA = "alerta"
    MENSAJE = "mensaje"

class RiskLevel(str, enum.Enum):
    BAJO = "bajo"
    MEDIO = "medio"
    ALTO = "alto"
    CRITICO = "critico"

# Tablas principales
class Usuario(Base):
    __tablename__ = "usuarios"
    
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    cedula = Column(String(20), unique=True, index=True)  # ✅ NUEVO CAMPO
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    telefono = Column(String(20))
    fecha_nacimiento = Column(Date)
    direccion = Column(Text)
    rol = Column(Enum(UserRole), nullable=False)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True)
    ultimo_acceso = Column(DateTime)
    debe_cambiar_password = Column(Boolean, default=False)  # ✅ NUEVO: para contraseñas temporales
    
    # Relaciones
    registros_emocionales = relationship("RegistroEmocional", back_populates="usuario", foreign_keys="RegistroEmocional.id_usuario")
    mensajes_chat = relationship("MensajeChat", back_populates="usuario")
    citas_como_paciente = relationship("Cita", back_populates="paciente", foreign_keys="Cita.id_paciente")
    citas_como_psicologo = relationship("Cita", back_populates="psicologo", foreign_keys="Cita.id_psicologo")
    notificaciones = relationship("Notificacion", back_populates="usuario")
    dispositivos = relationship("Dispositivo", back_populates="usuario")
    asignaciones_como_paciente = relationship("PacientePsicologo", back_populates="paciente", foreign_keys="PacientePsicologo.id_paciente")
    asignaciones_como_psicologo = relationship("PacientePsicologo", back_populates="psicologo", foreign_keys="PacientePsicologo.id_psicologo")

class PacientePsicologo(Base):
    __tablename__ = "paciente_psicologo"
    
    id_asignacion = Column(Integer, primary_key=True, index=True)
    id_paciente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_psicologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_asignacion = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True)
    notas = Column(Text)
    
    # Relaciones
    paciente = relationship("Usuario", back_populates="asignaciones_como_paciente", foreign_keys=[id_paciente])
    psicologo = relationship("Usuario", back_populates="asignaciones_como_psicologo", foreign_keys=[id_psicologo])

class RegistroEmocional(Base):
    __tablename__ = "registros_emocionales"
    
    id_registro = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow, index=True)
    nivel_animo = Column(Integer, nullable=False)  # 1-10
    emocion_principal = Column(String(50))
    intensidad_emocion = Column(Float)  # 0-1
    notas = Column(Text)
    contexto = Column(Text)
    
    # Análisis NLP
    sentimiento_score = Column(Float)  # -1 a 1
    sentimiento_label = Column(String(20))  # POS, NEU, NEG
    emociones_detectadas = Column(Text)  # JSON string
    
    # Evaluación de riesgo
    nivel_riesgo = Column(Enum(RiskLevel))
    score_riesgo = Column(Float)
    alertas_activadas = Column(Boolean, default=False)
    
    # Metadatos
    ubicacion = Column(String(200))
    clima = Column(String(50))
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="registros_emocionales")
    factores = relationship("FactorInfluencia", back_populates="registro")

class FactorInfluencia(Base):
    __tablename__ = "factores_influencia"
    
    id_factor = Column(Integer, primary_key=True, index=True)
    id_registro = Column(Integer, ForeignKey("registros_emocionales.id_registro"), nullable=False)
    tipo_factor = Column(String(50), nullable=False)  # sueño, ejercicio, alimentación, social, trabajo
    descripcion = Column(Text)
    impacto = Column(Integer)  # -5 a 5
    
    # Relaciones
    registro = relationship("RegistroEmocional", back_populates="factores")

class MensajeChat(Base):
    __tablename__ = "mensajes_chat"
    
    id_mensaje = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_hora = Column(DateTime, default=datetime.utcnow, index=True)
    mensaje = Column(Text, nullable=False)
    es_bot = Column(Boolean, default=False)
    
    # Análisis NLP del mensaje
    intencion = Column(String(100))
    confianza_intencion = Column(Float)
    sentimiento_mensaje = Column(Float)
    emocion_detectada = Column(String(50))
    
    # Contexto
    id_sesion_chat = Column(String(100))
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="mensajes_chat")

class Cita(Base):
    __tablename__ = "citas"
    
    id_cita = Column(Integer, primary_key=True, index=True)
    id_paciente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_psicologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_fin = Column(Time)
    duracion_minutos = Column(Integer, default=60)
    
    estado = Column(Enum(AppointmentStatus), default=AppointmentStatus.PROGRAMADA)
    modalidad = Column(String(20))  # presencial, virtual, telefonica
    url_videollamada = Column(String(500))
    
    notas_previas = Column(Text)
    notas_sesion = Column(Text)
    objetivos = Column(Text)
    tareas_asignadas = Column(Text)
    
    recordatorio_enviado = Column(Boolean, default=False)
    
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_modificacion = Column(DateTime, onupdate=datetime.utcnow)
    asistio = Column(Boolean, default=None)  

    # Relaciones
    paciente = relationship("Usuario", back_populates="citas_como_paciente", foreign_keys=[id_paciente])
    psicologo = relationship("Usuario", back_populates="citas_como_psicologo", foreign_keys=[id_psicologo])

class Notificacion(Base):
    __tablename__ = "notificaciones"
    
    id_notificacion = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    tipo = Column(Enum(NotificationType), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensaje = Column(Text, nullable=False)
    
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    fecha_programada = Column(DateTime)
    fecha_enviada = Column(DateTime)
    fecha_leida = Column(DateTime)
    
    enviada = Column(Boolean, default=False)
    leida = Column(Boolean, default=False)
    
    prioridad = Column(String(20), default="normal")  # baja, normal, alta, critica
    
    # Datos adicionales en JSON
    datos_extra = Column(Text)  # JSON string
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="notificaciones")

class Dispositivo(Base):
    __tablename__ = "dispositivos"
    
    id_dispositivo = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    token_fcm = Column(String(500), nullable=False, unique=True)
    tipo_dispositivo = Column(String(20))  # android, ios, web
    modelo = Column(String(100))
    sistema_operativo = Column(String(50))
    version_app = Column(String(20))
    
    activo = Column(Boolean, default=True)
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    ultimo_uso = Column(DateTime)
    
    # Relaciones
    usuario = relationship("Usuario", back_populates="dispositivos")

class EvaluacionPsicologica(Base):
    __tablename__ = "evaluaciones_psicologicas"
    
    id_evaluacion = Column(Integer, primary_key=True, index=True)
    id_paciente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_psicologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha_evaluacion = Column(DateTime, default=datetime.utcnow)
    
    tipo_evaluacion = Column(String(100))  # PHQ-9, GAD-7, Beck, etc.
    puntaje = Column(Float)
    interpretacion = Column(Text)
    
    diagnostico = Column(Text)
    plan_tratamiento = Column(Text)
    observaciones = Column(Text)
    
    archivo_adjunto = Column(String(500))  # URL o path del archivo

class HistorialCambios(Base):
    __tablename__ = "historial_cambios"
    
    id_cambio = Column(Integer, primary_key=True, index=True)
    tabla_afectada = Column(String(100), nullable=False)
    id_registro_afectado = Column(Integer, nullable=False)
    tipo_operacion = Column(String(20), nullable=False)  # INSERT, UPDATE, DELETE
    usuario_responsable = Column(Integer, ForeignKey("usuarios.id_usuario"))
    fecha_hora = Column(DateTime, default=datetime.utcnow)
    datos_anteriores = Column(Text)  # JSON
    datos_nuevos = Column(Text)  # JSON
    ip_address = Column(String(50))

class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"
    
    id_config = Column(Integer, primary_key=True, index=True)
    clave = Column(String(100), unique=True, nullable=False)
    valor = Column(Text)
    descripcion = Column(Text)
    tipo_dato = Column(String(20))  # string, integer, boolean, json
    fecha_modificacion = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    modificado_por = Column(Integer, ForeignKey("usuarios.id_usuario"))

class EmocionDiaria(Base):
    __tablename__ = "emociones_diarias"
    
    id_emocion_diaria = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha = Column(Date, nullable=False, index=True)
    
    # Promedios de emociones
    alegria_promedio = Column(Float, default=0.0)
    tristeza_promedio = Column(Float, default=0.0)
    ansiedad_promedio = Column(Float, default=0.0)
    enojo_promedio = Column(Float, default=0.0)
    miedo_promedio = Column(Float, default=0.0)
    
    # Emoción dominante del día
    emocion_dominante = Column(String(50))
    
    # Nivel de riesgo promedio
    nivel_riesgo_promedio = Column(Float, default=0.0)
    
    # Metadata
    total_interacciones = Column(Integer, default=0)
    fecha_calculo = Column(DateTime, default=datetime.utcnow)
    
    # Relación
    usuario = relationship("Usuario", foreign_keys=[id_usuario])


class Ejercicio(Base):
    __tablename__ = "ejercicios"
    
    id_ejercicio = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=False)
    tipo = Column(String(50), nullable=False)  # respiracion, meditacion, escritura, etc.
    duracion_minutos = Column(Integer, nullable=False)
    nivel_dificultad = Column(String(20))  # facil, medio, dificil
    instrucciones = Column(Text, nullable=False)
    objetivo = Column(Text)
    
    # Metadata
    id_psicologo_creador = Column(Integer, ForeignKey("usuarios.id_usuario"))
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    activo = Column(Boolean, default=True)
    
    # Relaciones
    asignaciones = relationship("EjercicioAsignado", back_populates="ejercicio")


class EjercicioAsignado(Base):
    __tablename__ = "ejercicios_asignados"
    
    id_asignacion = Column(Integer, primary_key=True, index=True)
    id_ejercicio = Column(Integer, ForeignKey("ejercicios.id_ejercicio"), nullable=False)
    id_paciente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_psicologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    
    # Programación
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    frecuencia = Column(String(50))  # diario, semanal, etc.
    veces_requeridas = Column(Integer, nullable=False)
    veces_completadas = Column(Integer, default=0)
    
    # Estado
    estado = Column(String(20), default="pendiente")  # pendiente, en_progreso, completado, vencido
    
    # Notas
    notas_psicologo = Column(Text)
    
    # Metadata
    fecha_asignacion = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    ejercicio = relationship("Ejercicio", back_populates="asignaciones")
    completados = relationship("EjercicioCompletado", back_populates="asignacion")


class EjercicioCompletado(Base):
    __tablename__ = "ejercicios_completados"
    
    id_completado = Column(Integer, primary_key=True, index=True)
    id_asignacion = Column(Integer, ForeignKey("ejercicios_asignados.id_asignacion"), nullable=False)
    
    # Detalles de la sesión
    fecha_completado = Column(DateTime, default=datetime.utcnow)
    duracion_real_minutos = Column(Integer)
    
    # Evaluación del paciente
    calificacion = Column(Integer)  # 1-5
    comentarios = Column(Text)
    dificultad_percibida = Column(String(20))  # facil, medio, dificil
    
    # Relación
    asignacion = relationship("EjercicioAsignado", back_populates="completados")
# ==================== EJERCICIOS TERAPÉUTICOS ====================

class EjercicioTerapeutico(Base):
    __tablename__ = "ejercicios_terapeuticos"
    
    id_ejercicio = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(200), nullable=False)
    descripcion = Column(Text)
    tipo = Column(String(50))  # respiracion, mindfulness, relajacion, etc.
    duracion_minutos = Column(Integer)
    instrucciones = Column(Text)
    url_recurso = Column(String(500))
    activo = Column(Boolean, default=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow)
    
    # Relaciones
    asignaciones = relationship("AsignacionEjercicio", back_populates="ejercicio")


class AsignacionEjercicio(Base):
    __tablename__ = "asignaciones_ejercicios"
    
    id_asignacion = Column(Integer, primary_key=True, index=True)
    id_paciente = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_psicologo = Column(Integer, ForeignKey("usuarios.id_usuario"), nullable=False)
    id_ejercicio = Column(Integer, ForeignKey("ejercicios_terapeuticos.id_ejercicio"), nullable=False)
    
    fecha_asignacion = Column(DateTime, default=datetime.utcnow)
    fecha_limite = Column(DateTime)
    estado = Column(String(20), default="PENDIENTE")  # PENDIENTE, COMPLETADO, VENCIDO
    notas_psicologo = Column(Text)
    
    # Datos de completación
    fecha_completado = Column(DateTime)
    calificacion_paciente = Column(Integer)  # 1-5
    comentario_paciente = Column(Text)
    
    # Relaciones
    paciente = relationship("Usuario", foreign_keys=[id_paciente], backref="ejercicios_asignados")
    psicologo = relationship("Usuario", foreign_keys=[id_psicologo])
    ejercicio = relationship("EjercicioTerapeutico", back_populates="asignaciones")