const fs = require('fs');
const lines = fs.readFileSync('logs/error.log', 'utf8').split('\n');
const errLines = lines.filter(l => l.includes('PrismaClientValidationError'));
if(errLines.length > 0) {
  const lastErr = errLines[errLines.length - 1];
  console.log("LAST ERROR FOUND:\n", lastErr.substring(0, 5000));
} else {
  console.log("No ValidationError found.");
}
