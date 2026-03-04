FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos SOLO package.json y package-lock.json del backend
COPY backend/package*.json ./

# Instalamos dependencias (usamos npm install en lugar de npm ci
# para evitar el problema de desincronización del lockfile)
RUN npm install --omit=dev

# Copiamos el código del backend
COPY backend/. .

# Exponemos el puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]
