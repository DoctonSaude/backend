import express from 'express';
import adminRoutes from './src/routes/admin/index.js';
const app = express();
app.use('/api/admin', adminRoutes);

function printRoutes(layer, prefix = '') {
  if (layer.route) {
    console.log(prefix + layer.route.path);
  } else if (layer.name === 'router' && layer.handle.stack) {
    layer.handle.stack.forEach(function(stackItem) {
      let routePath = layer.regexp.source.replace('^\\\\/', '/').replace('\\\\/?(?=\\\\/|$)', '').replace('^', '').replace('$', '');
      printRoutes(stackItem, prefix + routePath);
    });
  }
}

app._router.stack.forEach(layer => printRoutes(layer));
