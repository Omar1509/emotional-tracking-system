-- Script para crear la base de datos en PostgreSQL
-- Ejecutar como superusuario de PostgreSQL

-- Crear usuario si no existe
DO
$do$
BEGIN
   IF NOT EXISTS (
      SELECT FROM pg_catalog.pg_roles
      WHERE  rolname = 'user') THEN
      CREATE ROLE "user" LOGIN PASSWORD 'password';
   END IF;
END
$do$;

-- Crear base de datos usando template0 para poder especificar collation
DROP DATABASE IF EXISTS emotional_tracking_db;
CREATE DATABASE emotional_tracking_db
    WITH 
    OWNER = "user"
    ENCODING = 'UTF8'
    LC_COLLATE = 'Spanish_Ecuador.1252'
    LC_CTYPE = 'Spanish_Ecuador.1252'
    TEMPLATE = template0
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

-- Dar permisos
GRANT ALL PRIVILEGES ON DATABASE emotional_tracking_db TO "user";

\c emotional_tracking_db

-- Dar permisos en el esquema public
GRANT ALL ON SCHEMA public TO "user";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "user";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "user";

-- Extensiones útiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- Para funciones de encriptación

-- Confirmar creación
SELECT 'Base de datos emotional_tracking_db creada exitosamente' AS mensaje;