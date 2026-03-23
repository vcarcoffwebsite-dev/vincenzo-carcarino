/**
 * build.js — Genera i manifest per le cartelle content/
 * Eseguito automaticamente da Netlify ad ogni deploy
 */

const fs   = require('fs');
const path = require('path');

const CONTENT_DIR = path.join(__dirname, 'content');
const DIRS = ['musica','eventi','discografia','video','stampa','gallery','collaboratori','shop'];

DIRS.forEach(dir => {
  const dirPath = path.join(CONTENT_DIR, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Creata cartella: content/${dir}`);
  }

  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.json') && f !== '_manifest.json');

  const manifestPath = path.join(dirPath, '_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2));
  console.log(`📋 Manifest content/${dir}: ${files.length} file`);
});

console.log('✅ Build completato!');
