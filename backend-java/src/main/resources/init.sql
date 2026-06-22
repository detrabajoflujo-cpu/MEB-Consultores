-- Script de inicialización de la base de datos CRM
-- Se ejecuta automáticamente por Docker en el primer arranque

-- Habilitar extensión para UUIDs (por si se necesita en el futuro)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- La creación de tablas la maneja Spring Boot JPA (ddl-auto=update)
-- Este script solo crea datos iniciales si se necesita

-- Crear tabla independiente para el estado del chatbot de n8n
CREATE TABLE IF NOT EXISTS bot_sessions (
    phone_number VARCHAR(20) PRIMARY KEY,
    current_module VARCHAR(50) NOT NULL,
    current_step VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de prueba
-- (Descomenta si quieres datos de demostración)

/*
INSERT INTO prospectos (curp, nss, nombre_completo, telefono_contacto, origen_canal,
    curp_valida, nss_valido, estatus, fecha_ingreso, fecha_ultima_actualizacion)
VALUES
    ('PALR850312MDFLN01', '12345678901', 'FERNANDA PALACIOS RIOS',
     '+527771234567', 'Meta Ads', true, true, 'VIABLE', NOW(), NOW()),
    ('GAMA901115HDFRZN05', '98765432109', 'ARMANDO GARCIA MARTINEZ',
     '+527779876543', 'Meta Ads', true, true, 'EN_PROCESO', NOW(), NOW()),
    ('ROPE780623MDFDRN02', '55544433322', 'ESPERANZA RODRIGUEZ PEREZ',
     '+527773334444', 'WhatsApp Orgánico', false, true, 'VALIDANDO', NOW(), NOW());
*/

COMMENT ON DATABASE crm_db IS 'Base de datos del Ecosistema CRM de Automatización n8n';
