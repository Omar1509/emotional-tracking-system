# backend/test_email.py
from email_service import send_credentials

result = send_credentials(
    to_email="tu_correo@gmail.com",
    nombre="Juan Pérez",
    email_login="juan.perez@example.com",
    password="Temp123!@#",
    psicologo="Dr. María González"
)

print("✅ Correo enviado!" if result else "❌ Error")