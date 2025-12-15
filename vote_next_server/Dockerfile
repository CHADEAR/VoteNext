FROM node:20-alpine

WORKDIR /app

# ปิดโปรดักชันโหมด (สำคัญ!!)
ENV NODE_ENV=development
ENV NPM_CONFIG_PRODUCTION=false

COPY package*.json ./

# ติดตั้ง devDependencies
RUN npm install --include=dev

COPY . .

EXPOSE 4000

CMD ["npm", "run", "dev"]
