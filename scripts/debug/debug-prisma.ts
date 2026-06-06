import prisma from './src/lib/prisma.js';

const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')).sort();
console.log('Prisma models count:', models.length);
console.log(JSON.stringify(models, null, 2));
process.exit(0);
