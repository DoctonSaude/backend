const fs = require('fs');
let content = fs.readFileSync('tsconfig.json', 'utf8');
const excludeStr = `"exclude": ["src/controllers/admin/marketing.ts", "src/routes/admin/marketing.routes.ts", "src/services/ai/marketing-orchestrator.service.ts", "src/controllers/growth.controller.ts", "src/services/growthEngine.service.ts", "node_modules", "dist", "scripts", "test-*.ts", "test_*.js", "tests/", "*.test.ts", "temp_*.js"]`;
if(content.includes('"exclude"')) {
    content = content.replace(/"exclude":\s*\[[^\]]*\]/, excludeStr);
} else {
    content = content.replace(/}\s*$/, ',\n  ' + excludeStr + '\n}');
}
fs.writeFileSync('tsconfig.json', content);
console.log('Fixed tsconfig.json');
