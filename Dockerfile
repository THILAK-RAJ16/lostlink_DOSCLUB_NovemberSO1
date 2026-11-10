# ---- build the React front-end ----
FROM node:22-slim AS web
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public ./public
RUN npx vite build

# ---- Flask app ----
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 LOSTLINK_ENV=production
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
COPY --from=web /app/dist ./dist
EXPOSE 5000
CMD ["sh", "-c", "gunicorn wsgi:app --bind 0.0.0.0:${PORT:-5000} --workers 2 --timeout 60"]
