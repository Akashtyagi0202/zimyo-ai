.PHONY: help dev backend frontend install install-backend install-frontend stop

BACKEND_DIR := zimyo_ai_assistant
FRONTEND_DIR := zimyo_ai_frontend
BACKEND_PORT := 8080
FRONTEND_PORT := 5173
# Pick whichever venv exists (prefer venv/ — .venv/ shebangs broke from path-with-space)
VENV := $(if $(wildcard $(BACKEND_DIR)/venv/bin/uvicorn),$(BACKEND_DIR)/venv,$(BACKEND_DIR)/.venv)

help:
	@echo "Targets:"
	@echo "  make dev               run backend + frontend together"
	@echo "  make backend           run FastAPI on :$(BACKEND_PORT)"
	@echo "  make frontend          run Vite on :$(FRONTEND_PORT)"
	@echo "  make install           install backend + frontend deps"
	@echo "  make install-backend   pip install -r requirements.txt"
	@echo "  make install-frontend  npm install"
	@echo "  make stop              kill processes on $(BACKEND_PORT) and $(FRONTEND_PORT)"

backend:
	$(VENV)/bin/uvicorn --app-dir $(BACKEND_DIR) hrms_agents.main:app --host 0.0.0.0 --port $(BACKEND_PORT) --reload

frontend:
	cd $(FRONTEND_DIR) && npm run dev

dev:
	@echo "Starting backend (:$(BACKEND_PORT)) and frontend (:$(FRONTEND_PORT))..."
	@trap 'kill 0' INT TERM EXIT; \
		( $(MAKE) backend 2>&1 | sed -e 's/^/[backend] /' ) & \
		( $(MAKE) frontend 2>&1 | sed -e 's/^/[frontend] /' ) & \
		wait

install: install-backend install-frontend

install-backend:
	@if [ ! -d "$(BACKEND_DIR)/venv" ] && [ ! -d "$(BACKEND_DIR)/.venv" ]; then \
		echo "Creating venv at $(BACKEND_DIR)/venv..."; \
		python3 -m venv $(BACKEND_DIR)/venv; \
	fi
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r $(BACKEND_DIR)/requirements.txt

install-frontend:
	cd $(FRONTEND_DIR) && npm install

stop:
	-@lsof -ti tcp:$(BACKEND_PORT) | xargs -r kill -9 2>/dev/null || true
	-@lsof -ti tcp:$(FRONTEND_PORT) | xargs -r kill -9 2>/dev/null || true
	@echo "Stopped processes on :$(BACKEND_PORT) and :$(FRONTEND_PORT)"
