import path from 'path';
import { promises as fs } from 'fs';

/**
 * Best-effort delete for a file referenced by a /uploads/* URL.
 *
 * Safety:
 * - Only accepts URLs starting with "/uploads/"
 * - Resolves against process.cwd()/uploads
 * - Ensures resolved path stays within uploads root (prevents traversal)
 * - Never throws (ignores missing files)
 */
export async function safeDeleteUploadByUrl(url: string | null | undefined): Promise<void> {
  if (!url) return;
  if (typeof url !== 'string') return;
  if (!url.startsWith('/uploads/')) return;

  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const relativePath = url.slice('/uploads/'.length); // e.g. profile-pictures/<file>
  const targetPath = path.resolve(uploadsRoot, relativePath);

  // Ensure we never delete outside uploadsRoot
  const uploadsRootWithSep = uploadsRoot.endsWith(path.sep) ? uploadsRoot : uploadsRoot + path.sep;
  if (targetPath !== uploadsRoot && !targetPath.startsWith(uploadsRootWithSep)) {
    return;
  }

  try {
    await fs.unlink(targetPath);
  } catch (err: any) {
    // Ignore missing files
    if (err && (err.code === 'ENOENT' || err.code === 'ENOTDIR')) return;
    // Best-effort: ignore all other errors
    return;
  }
}

