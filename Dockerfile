FROM node:19.7-slim
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5000
CMD ["npm", "run", "start"]