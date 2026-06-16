const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/tenantId/g, 'economicGroupId');
    content = content.replace(/Tenant/g, 'EconomicGroup');
    content = content.replace(/tenant/g, 'economicGroup');
    content = content.replace(/X-EconomicGroup-Id/g, 'X-Tenant-Id'); // Keep HTTP header as X-Tenant-Id if needed, or X-EconomicGroup-Id. Let's keep the header X-Tenant-Id for backwards compatibility on frontend
    content = content.replace(/X-EconomicGroup-Id/gi, 'X-Tenant-Id'); 
    
    // Fix specific cases:
    // Some messages might be: includes('economicGroup or user not found') => 'economicGroup or user not found' is fine.
    
    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated ${file}`);
    }
}
console.log('Backend refactoring completed.');
