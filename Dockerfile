FROM node:19.7-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 80
CMD ["node", "index.js"]