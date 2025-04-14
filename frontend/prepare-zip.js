const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'dist');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Create a file to stream archive data to
const output = fs.createWriteStream(path.join(outputDir, 'health-assist-pro-frontend.zip'));
const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
    console.log('✅ Archive created successfully!');
    console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
        console.warn('⚠️ Warning:', err);
    } else {
        throw err;
    }
});

// Catch errors
archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files
const filesToInclude = [
    'src',
    'public',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    '.env.production',
    'vercel.json',
    'DEPLOYMENT.md'
];

filesToInclude.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            archive.directory(filePath, file);
        } else {
            archive.file(filePath, { name: file });
        }
    }
});

// Finalize the archive
archive.finalize(); 