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

# Buat direktori uploads
RUN mkdir -p uploads

# Expose port 8100
EXPOSE 8100

# Set user non-root untuk keamanan
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Command untuk menjalankan aplikasi
CMD ["npm", "start"]