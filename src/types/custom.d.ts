declare module '../../supabaseClient.js' {
  const supabase: any;
  export default supabase;
}

// Fallback wildcard declarations to handle different import forms
declare module "*supabaseClient.js" {
  const supabase: any;
  export default supabase;
}

declare module '../../controllers/authController.js' {
  export const register: any;
  export const login: any;
  export const getMe: any;
}

declare module "*controllers/authController.js" {
  export const register: any;
  export const login: any;
  export const getMe: any;
}

declare module 'exceljs' {
  const ExcelJS: any
  export default ExcelJS
}

declare module 'tesseract.js' {
  export const createWorker: any
}

declare module 'sharp' {
  const sharp: any
  export default sharp
}

declare module 'compression' {
  const compression: any
  export default compression
}

declare module 'http-proxy-middleware' {
  export const createProxyMiddleware: any
}

declare module 'opossum' {
  const CircuitBreaker: any
  export default CircuitBreaker
}
