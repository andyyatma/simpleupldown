# Menggunakan Node.js 18 Alpine sebagai base image
FROM node:18-alpine

# Set working directory dalam container
WORKDIR /app

# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua file aplikasi
COPY . .

# Buat direktori uploads dan set permission
RUN mkdir -p uploads && chmod 755 uploads

# Expose port 8100
EXPOSE 8100

# Set user dan group yang tepat untuk kompatibilitas
RUN addgroup -g 1001 -S appgroup
RUN adduser -S appuser -u 1001 -G appgroup

# Set ownership untuk direktori kerja
RUN chown -R appuser:appgroup /app

# Switch ke user non-root
USER appuser

# Command untuk menjalankan aplikasi
CMD ["npm", "start"]