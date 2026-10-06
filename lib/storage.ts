import path from "path";

/**
 * Returns a writable path for local development (project root)
 * or Vercel Serverless environment (/tmp).
 */
export function getStoragePath(filename: string): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join("/tmp", filename);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), filename);
}

