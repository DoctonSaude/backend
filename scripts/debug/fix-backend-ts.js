import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function walk(dir, callback) {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
    });
}

const nuclearPatterns = [
    // 1. Nuclear Colon Removal: Match any sequence of ": x : y" and turn into ": any" or ": any[]"
    { regex: /:\s*[^:]+:\s*any\[\]/g, replace: ': any[]' },
    { regex: /:\s*any:\s*any/g, replace: ': any' },
    { regex: /:\s*[^:]+:\s*any(?!\w)/g, replace: ': any' },

    // 2. Fix broken array declarations like: let x[] | undefined; or x?[];
    { regex: /(\w+)\?\[\]/g, replace: '$1?: any[]' },
    { regex: /(\w+)\[\](\s*\|)/g, replace: '$1: any[]$2' },
    { regex: /(\w+)\[\](\s*=\s*\[\])/g, replace: '$1: any[]$2' },
    { regex: /(?<!: )(\w+)\[\](?=\s*[;|),])/g, replace: '$1: any[]' },

    // 3. Fix double .js.js
    { regex: /\.js\.js/g, replace: '.js' },

    // 4. Fix absolute paths if any (Docton Saúde name issue)
    { regex: /c:\\Users\\Rodrigo Vilela\\Desktop\\Docton Sa\u00FAde\\backend\\src\\/g, replace: './' }
];

walk(srcDir, (filePath) => {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.d.ts')) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    nuclearPatterns.forEach(p => {
        content = content.replace(p.regex, p.replace);
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Nuclear Fix: ${path.relative(srcDir, filePath)}`);
    }
});

console.log('Nuclear sanitization completed.');
