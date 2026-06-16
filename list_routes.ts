import express from 'express';
import adminRoutes from './src/routes/admin/index.js';

const app = express();
app.use('/api/admin', adminRoutes);

function printRoutes(route: any, basePath: string) {
  if (route.route) {
    console.log(`${Object.keys(route.route.methods).join(', ').toUpperCase()} ${basePath}${route.route.path}`);
  } else if (route.name === 'router' && route.handle.stack) {
    route.handle.stack.forEach((r: any) => {
      printRoutes(r, basePath + (route.regexp.source !== '^\\/?$' ? route.regexp.source.replace('^\\/', '/').replace('\\/?(?=\\/|$)', '') : ''));
    });
  }
}

app._router.stack.forEach((r: any) => printRoutes(r, ''));
