import { Express } from 'express-serve-static-core';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
      user?: {
        userId: string;
        role: string;
        email?: string;
      };
    }
  }
}
