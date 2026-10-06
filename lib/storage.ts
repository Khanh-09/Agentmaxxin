import path from "path";
import fs from "fs";

/**
 * Returns a writable path for local development (project root),
 * custom persistent mount (DATA_DIR), or Vercel Serverless environment (/tmp).
 */
export function getStoragePath(filename: string): string {
  let baseDir: string;
  if (process.env.DATA_DIR) {
    baseDir = process.env.DATA_DIR;
  } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    baseDir = "/tmp";
  } else {
    baseDir = path.join(/*turbopackIgnore: true*/ process.cwd());
  }

  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  } catch {
    // Fallback if permission error
  }

  return path.join(baseDir, filename);
}

