const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8100;

// Membuat folder uploads jika belum ada
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Menggunakan nama file asli dengan timestamp untuk menghindari konflik
        const timestamp = Date.now();
        const originalName = file.originalname;
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Route untuk halaman utama (upload)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload.html'));
});

// Route untuk halaman download
app.get('/download', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

// API untuk upload file
app.post('/api/upload', upload.single('file'), (req, res) => {
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
        res.status(500).json({
            success: false,
            message: 'Error saat upload file',
            error: error.message
        });
    }
});

// API untuk mendapatkan daftar file
app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync('uploads');
        const fileList = files.map(filename => {
            const filePath = path.join('uploads', filename);
            const stats = fs.statSync(filePath);
            return {
                filename,
                originalName: filename.split('-').slice(1).join('-'), // Menghilangkan timestamp
                size: stats.size,
                uploadDate: stats.mtime
            };
        });

        res.json({
            success: true,
            files: fileList
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saat membaca daftar file',
            error: error.message
        });
    }
});

// API untuk download file
app.get('/api/download/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'uploads', filename);

        // Cek apakah file ada
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File tidak ditemukan'
            });
        }

        // Set header untuk download
        const originalName = filename.split('-').slice(1).join('-');
        res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
        
        // Stream file ke response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error saat download file',
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
    console.log(`Upload page: http://localhost:${PORT}`);
    console.log(`Download page: http://localhost:${PORT}/download`);
});