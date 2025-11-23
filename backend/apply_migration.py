# backend/apply_migration.py
# Script para aplicar la migración de base de datos

from database import engine
from sqlalchemy import text

def apply_migration():
    """Aplica la migración para agregar nuevos campos"""
    print("🔄 Aplicando migración de base de datos...")
    
    with engine.connect() as connection:
        try:
            # 1. Agregar campo cedula
            print("📝 Agregando campo 'cedula'...")
            connection.execute(text("""
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS cedula VARCHAR(20) UNIQUE
            """))
            connection.commit()
            
            # Crear índice
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_usuarios_cedula ON usuarios(cedula)
            """))
            connection.commit()
            print("✅ Campo 'cedula' agregado")
            
            # 2. Agregar campo requiere_cambio_password
            print("📝 Agregando campo 'requiere_cambio_password'...")
            connection.execute(text("""
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS requiere_cambio_password BOOLEAN DEFAULT FALSE
            """))
            connection.commit()
            
            # Actualizar usuarios existentes
            connection.execute(text("""
                UPDATE usuarios 
                SET requiere_cambio_password = FALSE 
                WHERE requiere_cambio_password IS NULL
            """))
            connection.commit()
            print("✅ Campo 'requiere_cambio_password' agregado")
            
            # 3. Verificar cambios
            print("\n🔍 Verificando cambios...")
            result = connection.execute(text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'usuarios' 
                  AND column_name IN ('cedula', 'requiere_cambio_password')
            """))
            
            print("\n📊 Columnas agregadas:")
            for row in result:
                print(f"   - {row.column_name}: {row.data_type} (nullable: {row.is_nullable})")
            
            print("\n✅ Migración completada exitosamente!")
            
        except Exception as e:
            print(f"❌ Error durante la migración: {e}")
            connection.rollback()
            raise

if __name__ == "__main__":
    print("="*60)
    print("🚀 APLICANDO MIGRACIÓN DE BASE DE DATOS")
    print("="*60)
    print()
    
    try:
        apply_migration()
        print()
        print("="*60)
        print("✅ MIGRACIÓN COMPLETADA")
        print("="*60)
        print()
        print("📌 Próximos pasos:")
        print("   1. Reinicia el servidor backend")
        print("   2. Los nuevos campos ya están disponibles")
        print("   3. Puedes registrar pacientes con cédula")
        print()
    except Exception as e:
        print()
        print("="*60)
        print("❌ MIGRACIÓN FALLIDA")
        print("="*60)
        print(f"\nError: {e}")
        print("\n💡 Sugerencias:")
        print("   1. Verifica que PostgreSQL esté corriendo")
        print("   2. Verifica las credenciales en database.py")
        print("   3. Verifica que la base de datos exista")