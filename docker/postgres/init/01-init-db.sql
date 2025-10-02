-- Yıldız Bayan Kuaförü - PostgreSQL Initialization Script
-- Bu script container ilk başlatıldığında çalışır

-- Test veritabanı oluştur (test environment için)
CREATE DATABASE yildiz_salon_test;

-- UUID extension'ı aktifleştir (CUID için alternatif)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm extension (fuzzy search için)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Türkçe collation ayarları
-- Not: Alpine Linux'ta tr_TR.UTF-8 locale'i olmayabilir
-- Bu durumda default UTF8 collation kullanılır

COMMENT ON DATABASE yildiz_salon_dev IS 'Yıldız Bayan Kuaförü - Development Database';
COMMENT ON DATABASE yildiz_salon_test IS 'Yıldız Bayan Kuaförü - Test Database';

-- Development veritabanına bağlan
\c yildiz_salon_dev;

-- Extension'ları development DB'ye de ekle
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Test veritabanına bağlan
\c yildiz_salon_test;

-- Extension'ları test DB'ye de ekle
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Başarılı mesajı
\echo '✅ PostgreSQL databases initialized successfully!'
\echo '📊 Available databases: yildiz_salon_dev, yildiz_salon_test'

