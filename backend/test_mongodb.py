# backend/test_mongodb.py
# ✅ SCRIPT DE VERIFICACIÓN Y FIX DE MONGODB

import sys
from datetime import datetime
from mongodb_config import mongodb_service
from pymongo.errors import ConnectionFailure, OperationFailure

def test_mongodb_connection():
    """
    Prueba la conexión a MongoDB
    """
    print("=" * 60)
    print("🧪 TESTING MONGODB CONNECTION")
    print("=" * 60)
    
    try:
        # Test 1: Ping al servidor
        print("\n1️⃣ Testing server connection...")
        mongodb_service.client.admin.command('ping')
        print("   ✅ MongoDB server is responding")
        
        # Test 2: Listar bases de datos
        print("\n2️⃣ Listing databases...")
        dbs = mongodb_service.client.list_database_names()
        print(f"   ✅ Found {len(dbs)} databases: {', '.join(dbs)}")
        
        # Test 3: Verificar base de datos
        print("\n3️⃣ Checking 'emotional_tracking' database...")
        if 'emotional_tracking' in dbs:
            print("   ✅ Database 'emotional_tracking' exists")
        else:
            print("   ⚠️  Database 'emotional_tracking' NOT FOUND - will be created on first insert")
        
        # Test 4: Listar colecciones
        print("\n4️⃣ Listing collections...")
        collections = mongodb_service.db.list_collection_names()
        print(f"   📁 Found {len(collections)} collections:")
        for col in collections:
            count = mongodb_service.db[col].count_documents({})
            print(f"      - {col}: {count} documents")
        
        # Test 5: Insertar documento de prueba
        print("\n5️⃣ Testing insert operation...")
        test_doc = {
            "test": True,
            "message": "Test document from test_mongodb.py",
            "timestamp": datetime.utcnow()
        }
        result = mongodb_service.chat_logs.insert_one(test_doc)
        print(f"   ✅ Insert successful. Document ID: {result.inserted_id}")
        
        # Test 6: Leer documento
        print("\n6️⃣ Testing read operation...")
        found = mongodb_service.chat_logs.find_one({"_id": result.inserted_id})
        if found:
            print("   ✅ Read successful")
            print(f"      Document: {found}")
        else:
            print("   ❌ Could not read document")
        
        # Test 7: Eliminar documento de prueba
        print("\n7️⃣ Cleaning up test document...")
        mongodb_service.chat_logs.delete_one({"_id": result.inserted_id})
        print("   ✅ Cleanup successful")
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED - MongoDB is working correctly!")
        print("=" * 60)
        return True
        
    except ConnectionFailure as e:
        print(f"\n❌ CONNECTION ERROR: {e}")
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Check if MongoDB is running:")
        print("      sudo systemctl status mongod")
        print("   2. Start MongoDB if needed:")
        print("      sudo systemctl start mongod")
        print("   3. Check MongoDB logs:")
        print("      sudo tail -f /var/log/mongodb/mongod.log")
        return False
        
    except OperationFailure as e:
        print(f"\n❌ OPERATION ERROR: {e}")
        print("\n🔧 TROUBLESHOOTING:")
        print("   1. Check MongoDB credentials in mongodb_config.py")
        print("   2. Verify database permissions")
        return False
        
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return False


def check_chat_logs_structure():
    """
    Verifica la estructura de los documentos en chat_logs
    """
    print("\n" + "=" * 60)
    print("📊 CHECKING CHAT LOGS STRUCTURE")
    print("=" * 60)
    
    try:
        # Obtener algunos documentos de ejemplo
        sample_docs = list(mongodb_service.chat_logs.find().limit(5))
        
        if not sample_docs:
            print("\n⚠️  No documents found in chat_logs collection")
            print("   This is normal if you haven't sent any chat messages yet")
            return
        
        print(f"\n✅ Found {len(sample_docs)} sample documents")
        
        # Verificar estructura esperada
        expected_fields = [
            'user_id',
            'message',
            'is_bot',
            'timestamp'
        ]
        
        print("\n🔍 Checking document structure...")
        for i, doc in enumerate(sample_docs, 1):
            print(f"\n   Document {i}:")
            missing_fields = [field for field in expected_fields if field not in doc]
            
            if missing_fields:
                print(f"      ⚠️  Missing fields: {', '.join(missing_fields)}")
            else:
                print(f"      ✅ Has all required fields")
            
            print(f"      - user_id: {doc.get('user_id', 'MISSING')}")
            print(f"      - is_bot: {doc.get('is_bot', 'MISSING')}")
            print(f"      - message length: {len(doc.get('message', ''))} chars")
            print(f"      - timestamp: {doc.get('timestamp', 'MISSING')}")
            
            if not doc.get('is_bot'):
                if 'emotional_analysis' in doc:
                    print(f"      - has emotional_analysis: ✅")
                else:
                    print(f"      - has emotional_analysis: ❌ MISSING")
        
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()


def fix_mongodb_if_needed():
    """
    Intenta arreglar problemas comunes de MongoDB
    """
    print("\n" + "=" * 60)
    print("🔧 ATTEMPTING TO FIX COMMON ISSUES")
    print("=" * 60)
    
    try:
        # Crear índices si no existen
        print("\n1️⃣ Creating indexes...")
        
        # Índice en chat_logs
        mongodb_service.chat_logs.create_index([
            ("user_id", 1),
            ("timestamp", -1)
        ])
        print("   ✅ Index on chat_logs (user_id, timestamp)")
        
        # Índice en emotional_texts
        mongodb_service.emotional_texts.create_index([
            ("user_id", 1),
            ("timestamp", -1)
        ])
        print("   ✅ Index on emotional_texts (user_id, timestamp)")
        
        print("\n✅ MongoDB optimization complete")
        
    except Exception as e:
        print(f"\n⚠️  Could not create indexes: {e}")


if __name__ == "__main__":
    print("\n" + "🚀" * 30)
    print("MONGODB DIAGNOSTIC TOOL")
    print("🚀" * 30)
    
    # Test de conexión
    connection_ok = test_mongodb_connection()
    
    if connection_ok:
        # Verificar estructura
        check_chat_logs_structure()
        
        # Intentar optimizar
        fix_mongodb_if_needed()
        
        print("\n\n✅ DIAGNOSIS COMPLETE")
        print("   MongoDB is ready to use!")
    else:
        print("\n\n❌ DIAGNOSIS FAILED")
        print("   Please fix the connection issues before proceeding")
        sys.exit(1)