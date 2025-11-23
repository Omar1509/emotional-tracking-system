# backend/email_service.py

import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import logging
import secrets
import string

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@emotional-tracking.com")
        self.app_name = "Sistema de Seguimiento Emocional"
        self.app_url = os.getenv("APP_URL", "http://localhost:3000")
        
        if not self.api_key:
            logger.warning("⚠️ SENDGRID_API_KEY no configurada. Los correos se simularán.")
            self.enabled = False
        else:
            self.sg = SendGridAPIClient(self.api_key)
            self.enabled = True
    
    def _send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Envía un correo usando SendGrid"""
        if not self.enabled:
            print(f"\n{'='*60}")
            print(f"[SIMULACIÓN] Correo enviado a: {to_email}")
            print(f"Asunto: {subject}")
            print(f"{'='*60}\n")
            return True
        
        try:
            message = Mail(
                from_email=Email(self.from_email, self.app_name),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            response = self.sg.send(message)
            logger.info(f"✅ Correo enviado a {to_email} - Status: {response.status_code}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error enviando correo a {to_email}: {e}")
            return False
    
    def send_credentials_email(
        self, 
        to_email: str, 
        nombre_paciente: str, 
        email_login: str, 
        password_temporal: str,
        nombre_psicologo: str
    ) -> bool:
        """Envía las credenciales temporales al nuevo paciente"""
        subject = f"Bienvenido a {self.app_name} - Tus credenciales de acceso"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ background: #f9fafb; padding: 40px 30px; }}
                .credentials-box {{ background: white; border: 2px solid #667eea; border-radius: 10px; padding: 25px; margin: 25px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .credentials-box h3 {{ color: #667eea; margin-top: 0; }}
                .credential-item {{ margin: 15px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }}
                .credential-label {{ font-weight: bold; color: #667eea; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
                .credential-value {{ font-size: 20px; color: #1f2937; font-family: 'Courier New', monospace; margin-top: 8px; word-break: break-all; }}
                .warning {{ background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 5px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: bold; font-size: 16px; }}
                .button:hover {{ background: #5568d3; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #e5e7eb; }}
                ul {{ padding-left: 20px; }}
                ul li {{ margin: 8px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>💚 ¡Bienvenido!</h1>
                    <p style="margin: 10px 0 0 0; font-size: 16px;">Tu salud emocional es nuestra prioridad</p>
                </div>
                
                <div class="content">
                    <p>Hola <strong>{nombre_paciente}</strong>,</p>
                    
                    <p>El Dr(a). <strong>{nombre_psicologo}</strong> te ha registrado en nuestro <strong>Sistema de Seguimiento Emocional</strong>.</p>
                    
                    <p>Este es un espacio seguro donde podrás:</p>
                    <ul>
                        <li>📊 Registrar tu estado emocional diario</li>
                        <li>💬 Chatear con nuestro asistente terapéutico con IA</li>
                        <li>📈 Ver tu progreso emocional a lo largo del tiempo</li>
                        <li>📅 Gestionar tus citas con tu psicólogo</li>
                    </ul>
                    
                    <div class="credentials-box">
                        <h3>🔐 Tus Credenciales de Acceso</h3>
                        
                        <div class="credential-item">
                            <div class="credential-label">Usuario (Correo Electrónico):</div>
                            <div class="credential-value">{email_login}</div>
                        </div>
                        
                        <div class="credential-item">
                            <div class="credential-label">Contraseña Temporal:</div>
                            <div class="credential-value">{password_temporal}</div>
                        </div>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ IMPORTANTE:</strong><br><br>
                        Esta es una contraseña temporal generada automáticamente. Por tu seguridad, <strong>deberás cambiarla</strong> cuando inicies sesión por primera vez.<br><br>
                        Te recomendamos usar una contraseña segura de al menos 8 caracteres que incluya letras mayúsculas, minúsculas y números.
                    </div>
                    
                    <center>
                        <a href="{self.app_url}/login" class="button">
                            🚀 Iniciar Sesión Ahora
                        </a>
                    </center>
                    
                    <p style="margin-top: 30px; color: #6b7280;">Si tienes alguna pregunta o dificultad para acceder, no dudes en contactar a tu psicólogo.</p>
                    
                    <p style="margin-top: 30px;">Saludos cordiales,<br>
                    <strong>Equipo de {self.app_name}</strong></p>
                </div>
                
                <div class="footer">
                    <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                    <p>Si no solicitaste esta cuenta, puedes ignorar este correo de forma segura.</p>
                    <p style="margin-top: 15px;">© 2025 {self.app_name}. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)
    
    def send_password_changed_notification(
        self, 
        to_email: str, 
        nombre_paciente: str
    ) -> bool:
        """Notifica al paciente que su contraseña fue cambiada"""
        subject = "Contraseña actualizada exitosamente"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px; }}
                .success-box {{ background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 5px; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Contraseña Actualizada</h1>
                </div>
                
                <div class="content">
                    <p>Hola <strong>{nombre_paciente}</strong>,</p>
                    
                    <div class="success-box">
                        <strong>✅ Tu contraseña ha sido actualizada exitosamente.</strong>
                    </div>
                    
                    <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
                    
                    <p style="color: #dc2626; font-weight: bold;">⚠️ Si NO realizaste este cambio, contacta inmediatamente a tu psicólogo.</p>
                    
                    <p style="margin-top: 30px;">Saludos,<br>
                    <strong>Equipo de {self.app_name}</strong></p>
                </div>
                
                <div class="footer">
                    <p>© 2025 {self.app_name}. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)
    
    def send_appointment_reminder(
        self,
        to_email: str,
        nombre_paciente: str,
        fecha_cita: str,
        hora_cita: str,
        nombre_psicologo: str,
        modalidad: str = "virtual"
    ) -> bool:
        """Envía recordatorio de cita"""
        subject = f"📅 Recordatorio: Cita programada para {fecha_cita}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9fafb; padding: 40px 30px; border-radius: 0 0 10px 10px; }}
                .appointment-box {{ background: white; border: 2px solid #3b82f6; border-radius: 10px; padding: 25px; margin: 25px 0; }}
                .appointment-box h3 {{ color: #3b82f6; margin-top: 0; }}
                .detail {{ margin: 15px 0; padding: 10px; background: #eff6ff; border-radius: 5px; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding: 20px; border-top: 1px solid #e5e7eb; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📅 Recordatorio de Cita</h1>
                </div>
                
                <div class="content">
                    <p>Hola <strong>{nombre_paciente}</strong>,</p>
                    
                    <p>Te recordamos tu próxima sesión terapéutica:</p>
                    
                    <div class="appointment-box">
                        <h3>Detalles de la Cita</h3>
                        <div class="detail"><strong>📅 Fecha:</strong> {fecha_cita}</div>
                        <div class="detail"><strong>🕐 Hora:</strong> {hora_cita}</div>
                        <div class="detail"><strong>👨‍⚕️ Psicólogo:</strong> Dr(a). {nombre_psicologo}</div>
                        <div class="detail"><strong>📍 Modalidad:</strong> {modalidad.capitalize()}</div>
                    </div>
                    
                    <p>Te esperamos puntualmente. Si necesitas reprogramar, contacta a tu psicólogo con anticipación.</p>
                    
                    <p style="margin-top: 30px;">Saludos,<br>
                    <strong>Equipo de {self.app_name}</strong></p>
                </div>
                
                <div class="footer">
                    <p>© 2025 {self.app_name}. Todos los derechos reservados.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self._send_email(to_email, subject, html_content)

# Instancia global
email_service = EmailService()

# ✅ Función para generar contraseña temporal segura
def generate_temp_password(length: int = 12) -> str:
    """Genera una contraseña temporal segura"""
    characters = string.ascii_letters + string.digits + "!@#$%"
    password = ''.join(secrets.choice(characters) for _ in range(length))
    return password

# Funciones auxiliares
def send_credentials(to_email: str, nombre: str, email_login: str, password: str, psicologo: str) -> bool:
    return email_service.send_credentials_email(to_email, nombre, email_login, password, psicologo)

def send_password_changed(to_email: str, nombre: str) -> bool:
    return email_service.send_password_changed_notification(to_email, nombre)

def send_appointment_reminder(to_email: str, nombre: str, fecha: str, hora: str, psicologo: str, modalidad: str = "virtual") -> bool:
    return email_service.send_appointment_reminder(to_email, nombre, fecha, hora, psicologo, modalidad)