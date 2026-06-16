import express from 'express';
import adminRoutes from './src/routes/admin/index.js';

const app = express();
app.use('/api/admin', adminRoutes);

console.log('Routes mounted on /api/admin:');
const router = app._router.stack.find((r: any) => r.name === 'router')?.handle;
if (router) {
  const adminStack = router.stack.find((r: any) => r.regexp.test('/api/admin'))?.handle?.stack;
  if (adminStack) {
    adminStack.forEach((layer: any) => {
      if (layer.name === 'router') {
        layer.handle.stack.forEach((subLayer: any) => {
          if (subLayer.route) {
            console.log(`Path: ${subLayer.route.path}`);
          }
        });
      }
    });
  }
}
