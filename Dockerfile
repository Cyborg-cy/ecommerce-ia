# Usa Node 22
FROM node:22

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia package.json y package-lock.json
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia el resto de la app
COPY . .

# Expone el puerto de Node.js
EXPOSE 3000

# Comando para iniciar la app
CMD ["node", "index.js"]
