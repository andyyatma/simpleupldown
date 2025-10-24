# File Upload & Download Application

Aplikasi sederhana untuk upload dan download file menggunakan Node.js, Express, dan Docker.

## Fitur

- ✅ Upload file tanpa batas ukuran
- ✅ Download file yang telah diupload
- ✅ Hapus file
- ✅ Pencarian file
- ✅ Interface yang responsive dan menarik
- ✅ Drag & drop upload
- ✅ Progress bar saat upload
- ✅ Docker support dengan volume mounting

## Teknologi

- **Backend**: Node.js + Express
- **File Upload**: Multer
- **Frontend**: HTML + CSS + Vanilla JavaScript
- **Containerization**: Docker + Docker Compose

## Struktur Project

```
files/
├── app.js                 # Server utama
├── package.json          # Dependencies
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose configuration
├── public/              # Static files
│   ├── upload.html      # Halaman upload
│   └── download.html    # Halaman download
├── uploads/             # Folder untuk menyimpan file
└── README.md           # Dokumentasi
```

## Cara Menjalankan

### Menggunakan Docker Compose (Recommended)

1. Pastikan Docker dan Docker Compose sudah terinstall
2. Jalankan aplikasi:
   ```bash
   docker-compose up -d
   ```
3. Aplikasi akan berjalan di: http://localhost:8100

### Menjalankan Lokal (Development)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Jalankan aplikasi:
   ```bash
   npm start
   ```
3. Aplikasi akan berjalan di: http://localhost:8100

## Halaman Aplikasi

- **Upload Page**: http://localhost:8100
  - Upload file dengan drag & drop atau klik
  - Progress bar saat upload
  - Support semua jenis file tanpa batas ukuran

- **Download Page**: http://localhost:8100/download
  - Lihat daftar semua file yang telah diupload
  - Download file
  - Hapus file
  - Pencarian file

## API Endpoints

- `POST /api/upload` - Upload file
- `GET /api/files` - Mendapatkan daftar file
- `GET /api/download/:filename` - Download file
- `DELETE /api/delete/:filename` - Hapus file

## Docker Commands

```bash
# Build dan jalankan
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Stop aplikasi
docker-compose down

# Rebuild image
docker-compose up -d --build
```

## Persistent Data

File yang diupload disimpan di folder `./uploads` yang di-mount ke container, sehingga file akan tetap ada meskipun container di-restart.

## Port

Aplikasi berjalan di port **8100**. Jika ingin mengubah port, edit file `docker-compose.yml` pada bagian ports.

## Keamanan

- File disimpan dengan timestamp prefix untuk menghindari konflik nama
- Input validation untuk file upload
- Container berjalan dengan user non-root
- Healthcheck untuk monitoring container

## Troubleshooting

1. **Port sudah digunakan**: Ubah port di `docker-compose.yml`
2. **Permission denied**: Pastikan Docker berjalan dengan permission yang tepat
3. **File tidak muncul**: Cek volume mounting di `docker-compose.yml`