const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const app = express();
const PORT = process.env.PORT || 8100;

// Promisify fs functions untuk async/await
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

// Konfigurasi Express untuk concurrent requests
app.set('trust proxy', 1);

// Increase payload limits untuk file besar
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));

// Middleware khusus untuk file besar
app.use((req, res, next) => {
    // Set timeout lebih lama untuk upload/download file besar
    req.setTimeout(30 * 60 * 1000); // 30 menit
    res.setTimeout(30 * 60 * 1000); // 30 menit
    
    // Disable buffering untuk streaming yang lebih baik
    res.setHeader('X-Accel-Buffering', 'no');
    
    next();
});

// Membuat folder uploads jika belum ada
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Konfigurasi multer untuk upload file dengan limits yang lebih besar
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Menggunakan nama file asli dengan timestamp untuk menghindari konflik
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const originalName = file.originalname;
        cb(null, `${timestamp}-${random}-${originalName}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 * 1024, // 100GB limit untuk file sangat besar
        files: 1
    },
    // Optimasi untuk file besar
    fileFilter: (req, file, cb) => {
        // Accept all file types untuk fleksibilitas maksimum
        cb(null, true);
    }
});

// Middleware
app.use(express.static('public', {
    maxAge: '1d', // Cache static files
    etag: true
}));

// Route untuk halaman utama (upload)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Route untuk halaman download
app.get('/download', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// API untuk upload file dengan progress dan error handling untuk file besar
app.post('/api/upload', (req, res) => {
    // Set headers untuk streaming upload
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering jika ada
    
    const uploadSingle = upload.single('file');
    
    uploadSingle(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({
                    success: false,
                    message: 'File terlalu besar. Maksimum 100GB.'
                });
            }
            
            if (err.code === 'ENOSPC') {
                return res.status(507).json({
                    success: false,
                    message: 'Ruang disk tidak cukup.'
                });
            }
            
            return res.status(500).json({
                success: false,
                message: 'Error saat upload: ' + err.message
            });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Tidak ada file yang diupload' 
                });
            }

            res.json({
                success: true,
                message: 'File berhasil diupload',
                file: {
                    originalName: req.file.originalname,
                    filename: req.file.filename,
                    size: req.file.size,
                    path: req.file.path
                }
            });
        } catch (error) {
            console.error('Upload processing error:', error);
            res.status(500).json({
                success: false,
                message: 'Error saat memproses upload',
                error: error.message
            });
        }
    });
});

// API untuk mendapatkan daftar file (async untuk concurrent access)
app.get('/api/files', async (req, res) => {
    try {
        const files = await readdir('uploads');
        const fileList = await Promise.all(
            files.map(async (filename) => {
                try {
                    const filePath = path.join('uploads', filename);
                    const stats = await stat(filePath);
                    return {
                        filename,
                        originalName: filename.split('-').slice(2).join('-'), // Menghilangkan timestamp dan random
                        size: stats.size,
                        uploadDate: stats.mtime
                    };
                } catch (err) {
                    console.error(`Error reading file ${filename}:`, err);
                    return null;
                }
            })
        );

        // Filter out null entries (failed reads)
        const validFiles = fileList.filter(file => file !== null);

        res.json({
            success: true,
            files: validFiles
        });
    } catch (error) {
        console.error('Error reading directory:', error);
        res.status(500).json({
            success: false,
            message: 'Error saat membaca daftar file',
            error: error.message
        });
    }
});

// API untuk download file (dengan optimasi untuk file besar)
app.get('/api/download/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);

        // Cek apakah file ada menggunakan async
        try {
            await access(filePath, fs.constants.F_OK);
        } catch (err) {
            return res.status(404).json({
                success: false,
                message: 'File tidak ditemukan'
            });
        }

        // Get file stats untuk optimasi
        const stats = await stat(filePath);
        const originalName = filename.split('-').slice(2).join('-'); // Skip timestamp dan random
        
        // Set headers yang optimal untuk file besar
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Handle Range requests untuk download resume
        const range = req.headers.range;
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
            
            if (start >= stats.size) {
                res.status(416).setHeader('Content-Range', `bytes */${stats.size}`);
                return res.end();
            }
            
            const chunksize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
            res.setHeader('Content-Length', chunksize);
            
            const stream = fs.createReadStream(filePath, { start, end });
            stream.pipe(res);
        } else {
            // Full file download
            const stream = fs.createReadStream(filePath);
            stream.pipe(res);
        }
        
    } catch (error) {
        console.error('Download route error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Error saat download file',
                error: error.message
            });
        }
    }
});

// Start server dengan konfigurasi untuk file besar dan concurrent connections
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Upload page: http://localhost:${PORT}`);
    console.log(`Download page: http://localhost:${PORT}/download`);
    console.log(`Max file size: 100GB`);
    console.log(`Request timeout: 30 minutes`);
});

// Set timeout yang sangat panjang untuk file gigabytes
server.timeout = 30 * 60 * 1000; // 30 minutes
server.keepAliveTimeout = 25 * 60 * 1000; // 25 minutes
server.headersTimeout = 26 * 60 * 1000; // 26 minutes
server.requestTimeout = 30 * 60 * 1000; // 30 minutes

// Increase max connections untuk concurrent access
server.maxConnections = 100;

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});