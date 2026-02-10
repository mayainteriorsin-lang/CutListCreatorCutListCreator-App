/**
 * PHASE 16: Unified File Storage Abstraction
 *
 * Provides a consistent interface for file storage that supports:
 * - Local filesystem (development/single instance)
 * - S3-compatible storage (production/multi-instance)
 *
 * Configuration:
 *   Set S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   to enable S3 backend. Otherwise uses local filesystem.
 *
 * Usage:
 *   const storage = getFileStorage();
 *   await storage.save('catalogues/file.pdf', buffer, 'application/pdf');
 *   const stream = await storage.getStream('catalogues/file.pdf');
 *   await storage.delete('catalogues/file.pdf');
 */

import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface FileMetadata {
    size: number;
    mimeType: string;
    lastModified: Date;
}

export interface StoredFile {
    path: string;
    metadata: FileMetadata;
}

export interface FileStorage {
    /**
     * Save a file to storage
     */
    save(filePath: string, content: Buffer, mimeType: string): Promise<string>;

    /**
     * Get a readable stream for a file
     */
    getStream(filePath: string): Promise<Readable>;

    /**
     * Get file metadata
     */
    getMetadata(filePath: string): Promise<FileMetadata>;

    /**
     * Check if file exists
     */
    exists(filePath: string): Promise<boolean>;

    /**
     * Delete a file
     */
    delete(filePath: string): Promise<void>;

    /**
     * List files in a directory
     */
    list(directory: string): Promise<StoredFile[]>;

    /**
     * Get the public URL for a file (if supported)
     */
    getUrl(filePath: string): string | null;
}

/**
 * Local Filesystem Storage
 * For development and single-instance deployments
 */
class LocalFileStorage implements FileStorage {
    private baseDir: string;

    constructor(baseDir: string = 'storage') {
        this.baseDir = path.resolve(process.cwd(), baseDir);
        console.log(`[FileStorage] Using local storage at: ${this.baseDir}`);
    }

    private getFullPath(filePath: string): string {
        // Prevent path traversal attacks
        const safePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
        return path.join(this.baseDir, safePath);
    }

    async save(filePath: string, content: Buffer, mimeType: string): Promise<string> {
        const fullPath = this.getFullPath(filePath);
        const dir = path.dirname(fullPath);

        // Ensure directory exists
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content);

        // Store metadata in a sidecar file (simple approach for local storage)
        const metaPath = `${fullPath}.meta.json`;
        fs.writeFileSync(metaPath, JSON.stringify({
            mimeType,
            size: content.length,
            savedAt: new Date().toISOString(),
        }));

        return filePath;
    }

    async getStream(filePath: string): Promise<Readable> {
        const fullPath = this.getFullPath(filePath);

        if (!fs.existsSync(fullPath)) {
            throw new FileNotFoundError(filePath);
        }

        return fs.createReadStream(fullPath);
    }

    async getMetadata(filePath: string): Promise<FileMetadata> {
        const fullPath = this.getFullPath(filePath);

        if (!fs.existsSync(fullPath)) {
            throw new FileNotFoundError(filePath);
        }

        const stats = fs.statSync(fullPath);
        const metaPath = `${fullPath}.meta.json`;

        let mimeType = 'application/octet-stream';
        if (fs.existsSync(metaPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                mimeType = meta.mimeType || mimeType;
            } catch {
                // Ignore metadata read errors
            }
        } else {
            // Infer from extension
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
                '.pdf': 'application/pdf',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
                '.webp': 'image/webp',
                '.json': 'application/json',
                '.txt': 'text/plain',
            };
            mimeType = mimeTypes[ext] || mimeType;
        }

        return {
            size: stats.size,
            mimeType,
            lastModified: stats.mtime,
        };
    }

    async exists(filePath: string): Promise<boolean> {
        const fullPath = this.getFullPath(filePath);
        return fs.existsSync(fullPath);
    }

    async delete(filePath: string): Promise<void> {
        const fullPath = this.getFullPath(filePath);

        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        // Also delete metadata file
        const metaPath = `${fullPath}.meta.json`;
        if (fs.existsSync(metaPath)) {
            fs.unlinkSync(metaPath);
        }
    }

    async list(directory: string): Promise<StoredFile[]> {
        const fullDir = this.getFullPath(directory);

        if (!fs.existsSync(fullDir)) {
            return [];
        }

        const files = fs.readdirSync(fullDir);
        const results: StoredFile[] = [];

        for (const file of files) {
            // Skip metadata files
            if (file.endsWith('.meta.json')) continue;

            const filePath = path.join(directory, file);
            const fullPath = path.join(fullDir, file);
            const stats = fs.statSync(fullPath);

            if (stats.isFile()) {
                try {
                    const metadata = await this.getMetadata(filePath);
                    results.push({ path: filePath, metadata });
                } catch {
                    // Skip files we can't read
                }
            }
        }

        return results.sort((a, b) =>
            b.metadata.lastModified.getTime() - a.metadata.lastModified.getTime()
        );
    }

    getUrl(filePath: string): string | null {
        // Local storage doesn't have public URLs
        return null;
    }
}

/**
 * S3-Compatible Storage
 * For production multi-instance deployments
 *
 * Features:
 * - Works with AWS S3, Cloudflare R2, MinIO, etc.
 * - Automatic content-type detection
 * - Presigned URLs for secure downloads
 * - Prefix-based directory listing
 *
 * Configuration:
 * - S3_BUCKET: Bucket name (required)
 * - S3_REGION: AWS region (default: us-east-1)
 * - S3_ENDPOINT: Custom endpoint for R2/MinIO (optional)
 * - AWS_ACCESS_KEY_ID: AWS credentials
 * - AWS_SECRET_ACCESS_KEY: AWS credentials
 */
class S3FileStorage implements FileStorage {
    private s3Client: S3Client;
    private bucket: string;

    constructor(bucket: string, region: string, endpoint?: string) {
        this.bucket = bucket;

        const config: ConstructorParameters<typeof S3Client>[0] = {
            region,
        };

        // Custom endpoint for Cloudflare R2, MinIO, etc.
        if (endpoint) {
            config.endpoint = endpoint;
            config.forcePathStyle = true; // Required for MinIO
            console.log(`[FileStorage] S3 using custom endpoint: ${endpoint}`);
        }

        this.s3Client = new S3Client(config);
        console.log(`[FileStorage] S3 configured (bucket: ${bucket}, region: ${region})`);
    }

    async save(filePath: string, content: Buffer, mimeType: string): Promise<string> {
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
                Body: content,
                ContentType: mimeType,
            });

            await this.s3Client.send(command);
            return filePath;
        } catch (error) {
            console.error(`[FileStorage] S3 PUT error for ${filePath}:`, error);
            throw error;
        }
    }

    async getStream(filePath: string): Promise<Readable> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });

            const response = await this.s3Client.send(command);

            if (!response.Body) {
                throw new FileNotFoundError(filePath);
            }

            // AWS SDK v3 returns a web ReadableStream, convert to Node.js Readable
            return response.Body as Readable;
        } catch (error: any) {
            if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
                throw new FileNotFoundError(filePath);
            }
            console.error(`[FileStorage] S3 GET error for ${filePath}:`, error);
            throw error;
        }
    }

    async getMetadata(filePath: string): Promise<FileMetadata> {
        try {
            const command = new HeadObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });

            const response = await this.s3Client.send(command);

            return {
                size: response.ContentLength || 0,
                mimeType: response.ContentType || 'application/octet-stream',
                lastModified: response.LastModified || new Date(),
            };
        } catch (error: any) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                throw new FileNotFoundError(filePath);
            }
            console.error(`[FileStorage] S3 HEAD error for ${filePath}:`, error);
            throw error;
        }
    }

    async exists(filePath: string): Promise<boolean> {
        try {
            await this.getMetadata(filePath);
            return true;
        } catch (error) {
            if (error instanceof FileNotFoundError) {
                return false;
            }
            throw error;
        }
    }

    async delete(filePath: string): Promise<void> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: filePath,
            });

            await this.s3Client.send(command);
        } catch (error) {
            console.error(`[FileStorage] S3 DELETE error for ${filePath}:`, error);
            throw error;
        }
    }

    async list(directory: string): Promise<StoredFile[]> {
        try {
            const prefix = directory.endsWith('/') ? directory : `${directory}/`;

            const command = new ListObjectsV2Command({
                Bucket: this.bucket,
                Prefix: prefix,
            });

            const response = await this.s3Client.send(command);
            const results: StoredFile[] = [];

            if (response.Contents) {
                for (const object of response.Contents) {
                    if (!object.Key || object.Key === prefix) continue;

                    // Skip "subdirectories" - only list direct children
                    const relativePath = object.Key.slice(prefix.length);
                    if (relativePath.includes('/')) continue;

                    results.push({
                        path: object.Key,
                        metadata: {
                            size: object.Size || 0,
                            mimeType: this.inferMimeType(object.Key),
                            lastModified: object.LastModified || new Date(),
                        },
                    });
                }
            }

            return results.sort((a, b) =>
                b.metadata.lastModified.getTime() - a.metadata.lastModified.getTime()
            );
        } catch (error) {
            console.error(`[FileStorage] S3 LIST error for ${directory}:`, error);
            throw error;
        }
    }

    getUrl(filePath: string): string | null {
        // Generate presigned URL (synchronous wrapper for async operation)
        // For actual use, call getSignedUrlAsync instead
        return null;
    }

    /**
     * Generate a presigned URL for temporary access
     */
    async getSignedUrlAsync(filePath: string, expiresInSeconds: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: filePath,
        });

        return getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    }

    /**
     * Infer MIME type from file extension
     */
    private inferMimeType(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.json': 'application/json',
            '.txt': 'text/plain',
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}

/**
 * File not found error
 */
export class FileNotFoundError extends Error {
    constructor(filePath: string) {
        super(`File not found: ${filePath}`);
        this.name = 'FileNotFoundError';
        Object.setPrototypeOf(this, FileNotFoundError.prototype);
    }
}

// Singleton instance
let fileStorageInstance: FileStorage | null = null;

/**
 * Get the file storage instance
 * Uses S3 if S3_BUCKET is set, otherwise uses local filesystem
 */
export function getFileStorage(): FileStorage {
    if (!fileStorageInstance) {
        const s3Bucket = process.env.S3_BUCKET;
        const s3Region = process.env.S3_REGION || 'us-east-1';
        const s3Endpoint = process.env.S3_ENDPOINT; // For Cloudflare R2, MinIO, etc.

        if (s3Bucket) {
            console.log('[FileStorage] Using S3 file storage (distributed mode)');
            fileStorageInstance = new S3FileStorage(s3Bucket, s3Region, s3Endpoint);
        } else {
            console.log('[FileStorage] Using local file storage (single-instance mode)');
            fileStorageInstance = new LocalFileStorage();
        }
    }

    return fileStorageInstance;
}

/**
 * Reset the file storage instance (for testing)
 */
export function resetFileStorage(): void {
    fileStorageInstance = null;
}

/**
 * Storage path helpers
 */
export const STORAGE_PATHS = {
    CATALOGUES: 'catalogues',
    LAMINATE_IMAGES: 'laminate-images',
    CLIENT_FILES: 'clients',
} as const;

/**
 * Helper to create storage paths
 */
export function storagePath(...parts: string[]): string {
    return parts.join('/');
}
