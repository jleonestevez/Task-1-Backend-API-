import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

export interface DownloadedImage {
  originalUrl: string;
  fileName: string;
  filePath: string;
  size: number;
  mimeType: string;
  downloadTime: number;
  sourcePageUrl: string;
}

export interface ImageDownloadResult {
  totalImages: number;
  downloadedImages: DownloadedImage[];
  failedDownloads: string[];
  downloadDirectory: string;
}

@Injectable()
export class ImageDownloadService {
  private readonly logger = new Logger(ImageDownloadService.name);
  private readonly baseDownloadDir = './downloads';

  async downloadImagesFromPages(
    pages: Array<{ url: string; images: string[]; title?: string }>,
    baseUrl: string,
    createSubdirectories: boolean = true
  ): Promise<ImageDownloadResult> {
    const downloadDirectory = this.createDownloadDirectory(baseUrl);
    const downloadedImages: DownloadedImage[] = [];
    const failedDownloads: string[] = [];
    let totalImages = 0;

    for (const page of pages) {
      if (!page.images || page.images.length === 0) continue;

      const pageDir = createSubdirectories 
        ? this.createPageDirectory(downloadDirectory, page.url, page.title)
        : downloadDirectory;

      for (const imageUrl of page.images) {
        totalImages++;
        try {
          const absoluteImageUrl = this.resolveImageUrl(imageUrl, page.url);
          const downloadedImage = await this.downloadSingleImage(
            absoluteImageUrl,
            pageDir,
            page.url
          );
          
          if (downloadedImage) {
            downloadedImages.push(downloadedImage);
            this.logger.log(`Imagen descargada: ${downloadedImage.fileName}`);
          }
        } catch (error) {
          this.logger.warn(`Error al descargar imagen ${imageUrl}: ${error.message}`);
          failedDownloads.push(imageUrl);
        }
      }
    }

    return {
      totalImages,
      downloadedImages,
      failedDownloads,
      downloadDirectory
    };
  }

  private createDownloadDirectory(baseUrl: string): string {
    const domain = this.extractDomain(baseUrl);
    const timestamp = new Date().toISOString().split('T')[0];
    const dirName = `${domain}_${timestamp}`;
    const fullPath = path.join(this.baseDownloadDir, dirName);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    return fullPath;
  }

  private createPageDirectory(baseDir: string, pageUrl: string, pageTitle?: string): string {
    // Extraer el último elemento del path de la URL para usar como nombre del directorio
    const urlPath = new URL(pageUrl).pathname;
    const lastPathElement = urlPath.split('/').filter(segment => segment.length > 0).pop() || 'root';
    
    const safeName = this.createSafeDirectoryName(pageTitle || lastPathElement);
    const pageDir = path.join(baseDir, safeName);

    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }

    return pageDir;
  }

  private async downloadSingleImage(
    imageUrl: string,
    targetDirectory: string,
    sourcePageUrl: string
  ): Promise<DownloadedImage | null> {
    const startTime = Date.now();

    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024, // 50MB límite
        headers: {
          'User-Agent': 'Mozilla/5.0 (Web Scraper Bot) ImageDownloader/1.0'
        }
      });

      const buffer = Buffer.from(response.data);
      const mimeType = response.headers['content-type'] || 'image/unknown';
      const extension = this.getFileExtension(mimeType, imageUrl);
      const fileName = this.generateFileName(imageUrl, extension, buffer);
      const filePath = path.join(targetDirectory, fileName);

      // Evitar descargar duplicados
      if (fs.existsSync(filePath)) {
        this.logger.debug(`Imagen ya existe: ${fileName}`);
        return null;
      }

      fs.writeFileSync(filePath, buffer);

      return {
        originalUrl: imageUrl,
        fileName,
        filePath,
        size: buffer.length,
        mimeType,
        downloadTime: Date.now() - startTime,
        sourcePageUrl
      };

    } catch (error) {
      this.logger.error(`Error descargando ${imageUrl}: ${error.message}`);
      return null;
    }
  }

  private resolveImageUrl(imageUrl: string, pageUrl: string): string {
    try {
      return new URL(imageUrl, pageUrl).href;
    } catch (error) {
      throw new Error(`URL de imagen inválida: ${imageUrl}`);
    }
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
    } catch {
      return 'unknown_domain';
    }
  }

  private createSafeDirectoryName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
      .toLowerCase();
  }

  private getFileExtension(mimeType: string, url: string): string {
    // Mapeo de MIME types a extensiones
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff'
    };

    if (mimeToExt[mimeType]) {
      return mimeToExt[mimeType];
    }

    // Intentar extraer extensión de la URL
    const urlExt = path.extname(new URL(url).pathname);
    if (urlExt && /^\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/i.test(urlExt)) {
      return urlExt.toLowerCase();
    }

    return '.jpg'; // Extensión por defecto
  }

  private generateFileName(url: string, extension: string, buffer: Buffer): string {
    // Crear nombre único basado en hash del contenido
    const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8);
    
    // Intentar obtener nombre original de la URL
    const urlPath = new URL(url).pathname;
    const originalName = path.basename(urlPath, path.extname(urlPath));
    const safeName = originalName.replace(/[^a-zA-Z0-9-]/g, '_').substring(0, 30);

    return `${safeName || 'image'}_${hash}${extension}`;
  }
} 