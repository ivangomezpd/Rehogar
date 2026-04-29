import express from 'express';
import path from 'path';
import apiRoutes from './api-routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files (like index.html) from the root directory
app.use(express.static(path.join(__dirname, '..')));

// Serve public directory (for nav.js, etc.)
app.use(express.static(path.join(__dirname, '../public')));

// Serve Stitch screens static files
app.use('/screens-static', express.static(path.join(__dirname, '../screens')));

// API Routes
app.use('/api/v1', apiRoutes);

import { generateGalleryHtml } from './screens-viewer';
app.get('/gallery', (req, res) => {
    const screensDir = path.join(__dirname, '../screens');
    res.send(generateGalleryHtml(screensDir));
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
