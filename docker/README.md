# Docker Development Environment

## 📦 Servisler

Bu Docker Compose yapılandırması aşağıdaki servisleri sağlar:

### 1. PostgreSQL 15
- **Container**: `yildiz-salon-postgres`
- **Port**: `5432`
- **Database**: `yildiz_salon_dev` (development)
- **Test Database**: `yildiz_salon_test`
- **User**: `postgres`
- **Password**: `postgres`
- **Extensions**: uuid-ossp, pg_trgm

### 2. Redis 7
- **Container**: `yildiz-salon-redis`
- **Port**: `6379`
- **Password**: `redis_password`
- **Persistence**: Append-only file (AOF) enabled

### 3. pgAdmin 4 (Opsiyonel)
- **Container**: `yildiz-salon-pgadmin`
- **Port**: `5050`
- **Email**: `admin@yildiz-salon.local`
- **Password**: `admin`
- **Profile**: `tools` (varsayılan olarak başlamaz)

### 4. Redis Commander (Opsiyonel)
- **Container**: `yildiz-salon-redis-commander`
- **Port**: `8081`
- **Profile**: `tools` (varsayılan olarak başlamaz)

---

## 🚀 Kullanım

### Temel Komutlar

```bash
# Servisleri başlat (PostgreSQL + Redis)
docker-compose up -d

# Yönetim araçları ile başlat (pgAdmin + Redis Commander)
docker-compose --profile tools up -d

# Servisleri durdur
docker-compose down

# Servisleri durdur ve volume'leri sil (DİKKAT: Tüm veriler silinir!)
docker-compose down -v

# Logları görüntüle
docker-compose logs -f

# Sadece PostgreSQL logları
docker-compose logs -f postgres

# Sadece Redis logları
docker-compose logs -f redis

# Container durumunu kontrol et
docker-compose ps

# Servisleri yeniden başlat
docker-compose restart
```

### İlk Kurulum

```bash
# 1. Docker Compose ile servisleri başlat
docker-compose up -d

# 2. Servislerin hazır olmasını bekle (health check)
docker-compose ps

# 3. PostgreSQL'e bağlan ve test et
docker exec -it yildiz-salon-postgres psql -U postgres -d yildiz_salon_dev -c "SELECT version();"

# 4. Redis'e bağlan ve test et
docker exec -it yildiz-salon-redis redis-cli -a redis_password ping

# 5. Backend'den Prisma migration çalıştır
cd backend
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

---

## 🔌 Bağlantı Bilgileri

### PostgreSQL Connection String

**Development**:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yildiz_salon_dev?schema=public"
```

**Test**:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yildiz_salon_test?schema=public"
```

### Redis Connection

**Backend .env**:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password
```

**Connection URL**:
```
redis://:redis_password@localhost:6379
```

---

## 🛠️ Yönetim Araçları

### pgAdmin 4

1. pgAdmin'i başlat:
```bash
docker-compose --profile tools up -d pgadmin
```

2. Tarayıcıda aç: http://localhost:5050

3. Login bilgileri:
   - Email: `admin@yildiz-salon.local`
   - Password: `admin`

4. PostgreSQL server ekle:
   - Host: `postgres` (Docker network içinde)
   - Port: `5432`
   - Database: `yildiz_salon_dev`
   - Username: `postgres`
   - Password: `postgres`

### Redis Commander

1. Redis Commander'ı başlat:
```bash
docker-compose --profile tools up -d redis-commander
```

2. Tarayıcıda aç: http://localhost:8081

---

## 📊 Veritabanı Yönetimi

### PostgreSQL

```bash
# PostgreSQL container'a bağlan
docker exec -it yildiz-salon-postgres psql -U postgres

# Veritabanlarını listele
\l

# yildiz_salon_dev'e bağlan
\c yildiz_salon_dev

# Tabloları listele
\dt

# Schema'yı göster
\d+ table_name

# SQL dosyası çalıştır
docker exec -i yildiz-salon-postgres psql -U postgres -d yildiz_salon_dev < backup.sql
```

### Redis

```bash
# Redis CLI'ye bağlan
docker exec -it yildiz-salon-redis redis-cli -a redis_password

# Tüm key'leri listele
KEYS *

# Cache bilgilerini göster
INFO

# Belirli bir key'i sorgula
GET key_name

# Cache'i temizle (DİKKAT!)
FLUSHALL
```

---

## 🔄 Backup ve Restore

### PostgreSQL Backup

```bash
# Development database backup
docker exec yildiz-salon-postgres pg_dump -U postgres yildiz_salon_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec yildiz-salon-postgres pg_dump -U postgres yildiz_salon_dev | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### PostgreSQL Restore

```bash
# SQL dosyasından restore
docker exec -i yildiz-salon-postgres psql -U postgres -d yildiz_salon_dev < backup.sql

# Compressed dosyadan restore
gunzip -c backup.sql.gz | docker exec -i yildiz-salon-postgres psql -U postgres -d yildiz_salon_dev
```

### Redis Backup

```bash
# AOF dosyasını backup et
docker exec yildiz-salon-redis redis-cli -a redis_password BGSAVE

# AOF dosyasını kopyala
docker cp yildiz-salon-redis:/data/appendonly.aof ./redis_backup_$(date +%Y%m%d_%H%M%S).aof
```

---

## 🐛 Troubleshooting

### PostgreSQL bağlantı hatası

```bash
# Container çalışıyor mu?
docker-compose ps postgres

# Logları kontrol et
docker-compose logs postgres

# Health check durumu
docker inspect yildiz-salon-postgres --format='{{.State.Health.Status}}'

# Manuel olarak yeniden başlat
docker-compose restart postgres
```

### Redis bağlantı hatası

```bash
# Container çalışıyor mu?
docker-compose ps redis

# Logları kontrol et
docker-compose logs redis

# Redis ping testi
docker exec -it yildiz-salon-redis redis-cli -a redis_password ping
```

### Volume sorunları

```bash
# Volume'leri listele
docker volume ls

# Belirli volume'u incele
docker volume inspect yildiz-bayan-kuaforu_postgres_data

# Tüm volume'leri temizle (DİKKAT: Tüm veriler silinir!)
docker-compose down -v
docker volume prune
```

### Port conflict

Eğer 5432 veya 6379 portları kullanımdaysa:

```bash
# Portları kontrol et
lsof -i :5432
lsof -i :6379

# docker-compose.yml'de portları değiştir
# postgres: "5433:5432"
# redis: "6380:6379"
```

---

## 🔒 Güvenlik Notları

⚠️ **ÖNEMLİ**: Bu Docker yapılandırması **sadece development** için tasarlanmıştır!

**Production için**:
- [ ] PostgreSQL ve Redis şifrelerini değiştir
- [ ] pgAdmin ve Redis Commander'ı kaldır
- [ ] Volume'leri encrypted disk'e al
- [ ] Network'ü external'a çevir
- [ ] SSL/TLS sertifikaları ekle
- [ ] Firewall kuralları yapılandır
- [ ] Regular backup planı oluştur

---

## 📈 Performance Tuning

### PostgreSQL

`docker-compose.yml`'de eklenebilecek environment variables:

```yaml
environment:
  POSTGRES_SHARED_BUFFERS: "256MB"
  POSTGRES_EFFECTIVE_CACHE_SIZE: "1GB"
  POSTGRES_WORK_MEM: "64MB"
  POSTGRES_MAINTENANCE_WORK_MEM: "128MB"
```

### Redis

`docker-compose.yml`'de command'e eklenebilecek parametreler:

```yaml
command: redis-server 
  --appendonly yes 
  --requirepass redis_password
  --maxmemory 512mb
  --maxmemory-policy allkeys-lru
```

---

## 📚 Kaynaklar

- [PostgreSQL Documentation](https://www.postgresql.org/docs/15/)
- [Redis Documentation](https://redis.io/documentation)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-02  
**Maintained by**: Yıldız Bayan Kuaförü Team

