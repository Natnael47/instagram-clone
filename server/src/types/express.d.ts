import type { File as MulterFile } from "multer";
import type { UserDocument } from "../models/User";

declare global {
  namespace Express {
    /**
     * Extend Express Request interface to include:
     * - user: Authenticated user from auth middleware
     * - file: Uploaded file from multer (single file upload)
     * - files: Uploaded files from multer (multiple file upload)
     */
    interface Request {
      /**
       * Authenticated user object attached by auth.middleware.ts
       * Available on all protected routes after JWT verification
       */
      user?: UserDocument;

      /**
       * Single uploaded file from multer middleware
       * Available on routes with upload.single('fieldName')
       */
      file?: MulterFile;

      /**
       * Multiple uploaded files from multer middleware
       * Available on routes with upload.array('fieldName') or upload.fields()
       */
      files?: MulterFile[] | { [fieldname: string]: MulterFile[] };
    }

    /**
     * Extend Express Response interface if needed
     * (Currently no extensions required, but placeholder for future)
     */
    interface Response {
      // Add custom response methods here if needed
    }
  }
}

// Re-export for convenience when importing in other files
export type { MulterFile };

// Ensure this file is treated as a module
export {};
