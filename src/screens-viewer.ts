import fs from 'fs';
import path from 'path';

export function generateGalleryHtml(screensDir: string): string {
    const screens = fs.readdirSync(screensDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    const screenCards = screens.map(screen => `
        <div class="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden hover:shadow-md transition-shadow group">
            <div class="aspect-video bg-emerald-50 relative overflow-hidden">
                <img src="/screens-static/${screen}/screen.png" alt="${screen}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            </div>
            <div class="p-6">
                <h3 class="font-bold text-slate-800 mb-4 capitalize">${screen.replace(/_/g, ' ')}</h3>
                <a href="/screens-static/${screen}/code.html" target="_blank" 
                   class="inline-flex items-center justify-center w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors">
                    Ver Pantalla
                </a>
            </div>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stitch Gallery - Rehogar</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
    </style>
</head>
<body class="bg-slate-50 min-h-screen">
    <nav class="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <span class="text-3xl text-emerald-500">🏠</span>
                <h1 class="text-xl font-bold text-slate-900 tracking-tight">Rehogar <span class="text-emerald-500">Stitch</span> Gallery</h1>
            </div>
            <div class="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-bold border border-emerald-100">
                ${screens.length} Pantallas Importadas
            </div>
        </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 py-12">
        <header class="mb-12">
            <p class="text-slate-500 text-lg">Explora los diseños de alta fidelidad exportados desde Google Stitch para el prototipo Rehogar.</p>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            ${screenCards}
        </div>
    </main>

    <footer class="mt-20 py-12 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>Prototipado con Google Stitch & Antigravity</p>
    </footer>
</body>
</html>
    `;
}
