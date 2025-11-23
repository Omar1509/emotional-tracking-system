"""
Script para crear las nuevas tablas del sistema
Ejecutar: python create_new_tables.py
"""

from database import engine, Base
import models

def create_new_tables():
    """Crear solo las nuevas tablas"""
    print("🔨 Creando nuevas tablas...")
    
    # Esto creará solo las tablas que no existen
    Base.metadata.create_all(bind=engine)
    
    print("✅ Tablas creadas exitosamente")
    print("\nTablas en la base de datos:")
    print("  - emociones_diarias")
    print("  - ejercicios")
    print("  - ejercicios_asignados")
    print("  - ejercicios_completados")

if __name__ == "__main__":
    print("="*60)
    print("🚀 CREANDO NUEVAS TABLAS DEL SISTEMA")
    print("="*60)
    print()
    
    try:
        create_new_tables()
        print()
        print("="*60)
        print("✅ PROCESO COMPLETADO")
        print("="*60)
        print()
        print("📌 Próximos pasos:")
        print("   1. Reinicia el servidor backend")
        print("   2. Las nuevas funcionalidades ya están disponibles")
        print()
    except Exception as e:
        print()
        print("="*60)
        print("❌ ERROR AL CREAR TABLAS")
        print("="*60)
        print(f"\nError: {e}")
        print("\n💡 Sugerencias:")
        print("   1. Verifica que PostgreSQL esté corriendo")
        print("   2. Verifica las credenciales en database.py")