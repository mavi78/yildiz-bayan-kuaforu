# Yıldız Bayan Kuaförü - Development Makefile
# Hızlı komutlar için kısayollar

.PHONY: help install up down restart logs clean test db-migrate db-seed dev build

# Yardım
help:
	@echo "📋 Yıldız Bayan Kuaförü - Available Commands"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make install      - İlk kurulum (npm install + docker up + db setup)"
	@echo "  make dev          - Development server başlat (backend + frontend)"
	@echo ""
	@echo "🐳 Docker:"
	@echo "  make up           - Docker servisleri başlat (postgres + redis)"
	@echo "  make up-tools     - Docker + yönetim araçları (pgadmin + redis-commander)"
	@echo "  make down         - Docker servisleri durdur"
	@echo "  make restart      - Docker servisleri yeniden başlat"
	@echo "  make logs         - Docker loglarını göster"
	@echo "  make logs-db      - PostgreSQL logları"
	@echo "  make logs-redis   - Redis logları"
	@echo ""
	@echo "🗄️ Database:"
	@echo "  make db-migrate   - Prisma migration çalıştır"
	@echo "  make db-seed      - Seed data yükle"
	@echo "  make db-reset     - Database'i sıfırla (migrate + seed)"
	@echo "  make db-studio    - Prisma Studio aç"
	@echo ""
	@echo "🧪 Test:"
	@echo "  make test         - Tüm testleri çalıştır"
	@echo "  make test-backend - Backend testleri"
	@echo "  make test-frontend- Frontend testleri"
	@echo ""
	@echo "🧹 Clean:"
	@echo "  make clean        - node_modules + dist temizle"
	@echo "  make clean-all    - clean + docker volumes sil"

# İlk kurulum
install:
	@echo "📦 Installing dependencies..."
	pnpm install
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "⏳ Waiting for PostgreSQL..."
	@sleep 5
	@echo "🗄️ Running database migrations..."
	cd backend && pnpm prisma migrate dev --name init
	@echo "🌱 Seeding database..."
	cd backend && pnpm prisma db seed
	@echo "✅ Installation complete!"
	@echo ""
	@echo "🚀 Run 'make dev' to start development servers"

# Docker servisleri
up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "✅ Services started: PostgreSQL (5432), Redis (6379)"

up-tools:
	@echo "🐳 Starting Docker services with management tools..."
	docker-compose --profile tools up -d
	@echo "✅ Services started:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - pgAdmin: http://localhost:5050"
	@echo "  - Redis Commander: http://localhost:8081"

down:
	@echo "🛑 Stopping Docker services..."
	docker-compose down
	@echo "✅ Services stopped"

restart:
	@echo "🔄 Restarting Docker services..."
	docker-compose restart
	@echo "✅ Services restarted"

logs:
	docker-compose logs -f

logs-db:
	docker-compose logs -f postgres

logs-redis:
	docker-compose logs -f redis

# Database
db-migrate:
	@echo "🗄️ Running Prisma migrations..."
	cd backend && pnpm prisma migrate dev

db-seed:
	@echo "🌱 Seeding database..."
	cd backend && pnpm prisma db seed

db-reset:
	@echo "🔄 Resetting database..."
	cd backend && pnpm prisma migrate reset --force
	@echo "✅ Database reset complete"

db-studio:
	@echo "🎨 Opening Prisma Studio..."
	cd backend && pnpm prisma studio

# Development
dev:
	@echo "🚀 Starting development servers..."
	pnpm dev

dev-backend:
	@echo "🚀 Starting backend only..."
	cd backend && pnpm dev

dev-frontend:
	@echo "🚀 Starting frontend only..."
	cd frontend && pnpm dev

# Build
build:
	@echo "🏗️ Building project..."
	pnpm build

# Test
test:
	@echo "🧪 Running all tests..."
	pnpm test

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && pnpm test

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && pnpm test

test-cov:
	@echo "📊 Running tests with coverage..."
	pnpm test:cov

# Clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	rm -rf backend/dist
	rm -rf frontend/.next
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf node_modules
	@echo "✅ Clean complete"

clean-all: clean
	@echo "🧹 Removing Docker volumes..."
	docker-compose down -v
	@echo "⚠️ All data removed!"

# Lint
lint:
	@echo "🔍 Running linters..."
	pnpm lint

lint-fix:
	@echo "🔧 Fixing lint errors..."
	pnpm lint --fix

# Format
format:
	@echo "✨ Formatting code..."
	cd backend && pnpm format
	cd frontend && pnpm format

# Info
info:
	@echo "📊 System Information"
	@echo ""
	@echo "Node version:"
	@node --version
	@echo ""
	@echo "pnpm version:"
	@pnpm --version
	@echo ""
	@echo "Docker version:"
	@docker --version
	@echo ""
	@echo "Docker Compose version:"
	@docker-compose --version
	@echo ""
	@echo "Container status:"
	@docker-compose ps

# Default target
.DEFAULT_GOAL := help

