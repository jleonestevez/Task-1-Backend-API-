import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as cheerio from 'cheerio';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as ExcelJS from 'exceljs';
import { URL } from 'url';
import * as puppeteer from 'puppeteer';

interface ImageInfo {
  src: string;
  alt: string;
  downloaded?: string;
}

interface TreeNode {
  url: string;
  title: string;
  depth: number;
  parent?: string;
  children: TreeNode[];
  scrapedData?: any;
  downloadedImages: string[];
  detectedLists: any[];
  chImagesFound: number;
  dropdownRelsProcessed: number;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Realiza web scraping en una URL específica
   * @param url URL del sitio a scrapear
   * @param selector Selector CSS para extraer elementos específicos (opcional)
   */
  async scrapeUrl(url: string, selector?: string): Promise<any> {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      const html = response.data;
      const $ = cheerio.load(html);

      if (selector) {
        const elements: { text: string; html: string | null }[] = [];
        $(selector).each((i, el) => {
          elements.push({
            text: $(el).text().trim(),
            html: $(el).html(),
          });
        });
        return elements;
      }

      return {
        title: $('title').text(),
        metaDescription: $('meta[name="description"]').attr('content'),
        h1: $('h1').text(),
      };
    } catch (error) {
      this.logger.error(`Error scraping URL ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Realiza un crawl básico de un sitio web, extrayendo todos los enlaces
   * @param url URL del sitio a crawlear
   * @param maxDepth Profundidad máxima de crawling
   * @param targetPhrases Frases que deben contener los enlaces para ser seguidos
   * @param maxFilteredPages Número máximo de páginas filtradas a procesar
   * @returns Un objeto con el estado inicial y el nombre del archivo Excel generado
   */
  async crawlSite(url: string, maxDepth: number = 1, targetPhrases?: string[], maxFilteredPages?: number): Promise<any> {
    // Responder inmediatamente que el proceso está en curso
    const timestamp = Date.now();
    const excelFilename = `crawl_tree_${timestamp}.xlsx`;
    const excelPath = path.join(__dirname, '../../output', excelFilename);
    const imagesDir = path.join(__dirname, '../../output', `images_${timestamp}`);

    // Crear directorio para imágenes
    await fs.ensureDir(imagesDir);

    // Lanzar el proceso de crawling en segundo plano
    this.startCrawlingAndSaveExcel(url, maxDepth, excelPath, imagesDir, targetPhrases, maxFilteredPages);

    return {
      status: 'en_curso',
      message: 'El crawling ha comenzado. El resultado estará disponible en un archivo Excel con estructura de árbol.',
      output: `/output/${excelFilename}`,
      imagesDirectory: `/output/images_${timestamp}`,
      targetPhrases: targetPhrases || [],
      maxFilteredPages: maxFilteredPages || null,
    };
  }

  /**
   * Obtiene el nombre del directorio basado en el último elemento del path de la URL
   */
  private getDirectoryNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);

      if (pathSegments.length === 0) {
        return 'root';
      }

      // Obtener el último segmento y limpiarlo para usar como nombre de directorio
      const lastSegment = pathSegments[pathSegments.length - 1];
      return lastSegment.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Espera a que la página se renderice completamente cuando hay ch-images
   */
  private async waitForPageToRender(page: puppeteer.Page): Promise<void> {
    this.logger.log('Esperando a que la página se renderice completamente...');

    // Esperar adicional para contenido dinámico
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar si hay más contenido cargándose
    let previousHeight = 0;
    let currentHeight = await page.evaluate(() => document.body.scrollHeight);

    while (currentHeight > previousHeight) {
      previousHeight = currentHeight;
      await new Promise(resolve => setTimeout(resolve, 1000));
      currentHeight = await page.evaluate(() => document.body.scrollHeight);
    }

    this.logger.log('Página completamente renderizada');
  }

  /**
   * Busca dropdown-menu open y obtiene todos los elementos rel
   */
  private async findDropdownRels(page: puppeteer.Page): Promise<string[]> {
    this.logger.log('Buscando dropdown-menu open...');

    try {
      // Buscar dropdown-menu con clase open
      const dropdownElements = await page.$$('.dropdown-menu.open, .dropdown-menu[class*="open"]');

      if (dropdownElements.length === 0) {
        this.logger.log('No se encontró dropdown-menu open');
        return [];
      }

      this.logger.log(`Encontrados ${dropdownElements.length} dropdown-menu open`);

      const allRels: string[] = [];

      for (const dropdown of dropdownElements) {
        // Buscar todos los elementos con atributo rel dentro del dropdown
        const relElements = await dropdown.$$('[rel]');

        for (const relElement of relElements) {
          const rel = await relElement.evaluate(el => el.getAttribute('rel'));
          if (rel && rel.trim()) {
            allRels.push(rel.trim());
          }
        }
      }

      // Eliminar duplicados, ordenar y convertir a índices numéricos empezando desde 1
      const uniqueRels = [...new Set(allRels)].sort();
      
      // Convertir a valores numéricos ordenados empezando desde 1
      const orderedRels = uniqueRels.map((_, index) => (index + 1).toString());
      
      this.logger.log(`Encontrados ${uniqueRels.length} elementos rel únicos, convertidos a: ${orderedRels.join(', ')}`);
      this.logger.log(`Rels originales: ${uniqueRels.join(', ')}`);

      return orderedRels;
    } catch (error) {
      this.logger.error(`Error buscando dropdown rels: ${error.message}`);
      return [];
    }
  }

  /**
   * Navega a una URL con rel específico y descarga imágenes img-responsive
   */
  private async navigateToRelAndDownloadImages(
    baseUrl: string,
    rel: string,
    pageImagesDir: string,
    pageIndex: number,
    relIndex: number
  ): Promise<string[]> {
    const downloadedImages: string[] = [];
    let browser: puppeteer.Browser | null = null;

    try {
      // Construir URL con el rel
      const urlWithRel = `${baseUrl}/${rel}`;
      this.logger.log(`Navegando a URL con rel: ${urlWithRel}`);

      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Navegar a la página con rel
      await page.goto(urlWithRel, { waitUntil: 'networkidle0', timeout: 30000 });

      // Esperar a que se renderice
      await this.waitForPageToRender(page);

      // Buscar imágenes con clase img-responsive
      const responsiveImages = await page.$$('.img-responsive');
      this.logger.log(`Encontradas ${responsiveImages.length} imágenes img-responsive en ${urlWithRel}`);

      for (let i = 0; i < responsiveImages.length; i++) {
        const img = responsiveImages[i];

        try {
          // Obtener src de la imagen
          const src = await img.evaluate(el => (el as HTMLImageElement).src);
          const alt = await img.evaluate(el => (el as HTMLImageElement).alt || '');

          if (src && src.startsWith('http')) {
            // Descargar la imagen
            const downloadedName = await this.downloadImageFromRel(src, pageImagesDir, pageIndex, relIndex, i);
            if (downloadedName) {
              downloadedImages.push(downloadedName);
            }
          }
        } catch (error) {
          this.logger.error(`Error procesando imagen ${i} en rel ${rel}: ${error.message}`);
        }
      }

    } catch (error) {
      this.logger.error(`Error navegando a rel ${rel}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return downloadedImages;
  }

  /**
   * Descarga una imagen desde navegación por rel
   */
  private async downloadImageFromRel(
    imageUrl: string,
    pageImagesDir: string,
    pageIndex: number,
    relIndex: number,
    imgIndex: number
  ): Promise<string | null> {
    try {
      // Obtener extensión del archivo
      const urlPath = new URL(imageUrl).pathname;
      const extension = path.extname(urlPath) || '.jpg';

      // Generar nombre único para la imagen
      const imageName = `page_${pageIndex}_rel_${relIndex}_img_${imgIndex}_${Date.now()}${extension}`;
      const imagePath = path.join(pageImagesDir, imageName);

      // Descargar imagen
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      );

      // Guardar imagen
      await fs.writeFile(imagePath, response.data);
      this.logger.log(`Imagen rel descargada: ${imageName}`);

      return imageName;
    } catch (error) {
      this.logger.error(`Error descargando imagen rel ${imageUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Procesa dropdown-menu y navega por todos los rels
   */
  private async processDropdownRels(url: string, imagesDir: string, pageIndex: number): Promise<{ downloadedImages: string[], relsProcessed: number }> {
    let browser: puppeteer.Browser | null = null;
    const allDownloadedImages: string[] = [];
    let relsProcessed = 0;

    try {
      // Crear directorio específico para esta página
      const pageDirectoryName = this.getDirectoryNameFromUrl(url);
      const pageImagesDir = path.join(imagesDir, pageDirectoryName);
      await fs.ensureDir(pageImagesDir);

      this.logger.log(`Iniciando procesamiento de dropdown para: ${url}`);
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Navegar a la página
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Esperar renderizado
      await this.waitForPageToRender(page);

      // Buscar dropdown-menu open y obtener rels
      const rels = await this.findDropdownRels(page);

      if (rels.length === 0) {
        this.logger.log('No se encontraron elementos rel en dropdown-menu open');
        return { downloadedImages: [], relsProcessed: 0 };
      }

      // Procesar cada rel
      for (let i = 0; i < rels.length; i++) {
        const rel = rels[i];
        this.logger.log(`Procesando rel ${i + 1}/${rels.length}: ${rel}`);

        const relImages = await this.navigateToRelAndDownloadImages(url, rel, pageImagesDir, pageIndex, i);
        allDownloadedImages.push(...relImages);
        relsProcessed++;

        // Delay reducido entre navegaciones
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      this.logger.error(`Error procesando dropdown rels en ${url}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return { downloadedImages: allDownloadedImages, relsProcessed };
  }

  /**
   * Espera a que aparezcan elementos ch-images y los procesa con Puppeteer
   */
  private async waitForChImagesAndDownload(url: string, imagesDir: string, pageIndex: number): Promise<{ downloadedImages: string[], chImagesCount: number, dropdownRels: number }> {
    let browser: puppeteer.Browser | null = null;
    const downloadedImages: string[] = [];
    let chImagesCount = 0;
    let dropdownRels = 0;

    try {
      // Crear directorio específico para esta página
      const pageDirectoryName = this.getDirectoryNameFromUrl(url);
      const pageImagesDir = path.join(imagesDir, pageDirectoryName);
      await fs.ensureDir(pageImagesDir);

      this.logger.log(`Iniciando Puppeteer para: ${url}`);
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();

      // Configurar viewport y user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

      // Navegar a la página
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Intentar esperar elementos ch-images (opcional)
      try {
        await page.waitForSelector('ch-images', { timeout: 5000 });
        this.logger.log(`Elementos ch-images encontrados en: ${url}`);

        // Esperar a que la página se renderice completamente
        await this.waitForPageToRender(page);

        // Contar elementos ch-images
        chImagesCount = await page.$$eval('ch-images', elements => elements.length);
        this.logger.log(`Total de elementos ch-images encontrados: ${chImagesCount}`);



        // Procesar dropdown-menu y rels en lugar de clicks ppp
        const dropdownResult = await this.processDropdownRels(url, imagesDir, pageIndex);
        downloadedImages.push(...dropdownResult.downloadedImages);
        dropdownRels = dropdownResult.relsProcessed;

        // Procesar cada elemento ch-images después del procesamiento de dropdown
        const chImagesElements = await page.$$('ch-images');

        for (let i = 0; i < chImagesElements.length; i++) {
          const chImageElement = chImagesElements[i];

          try {
            // Buscar imágenes dentro del elemento ch-images
            const images = await chImageElement.$$('img');

            for (let j = 0; j < images.length; j++) {
              const img = images[j];

              // Obtener src de la imagen
              const src = await img.evaluate(el => (el as HTMLImageElement).src);
              const alt = await img.evaluate(el => (el as HTMLImageElement).alt || '');    


              if (src && src.startsWith('http')) {
                // Descargar la imagen
                const downloadedName = await this.downloadImageFromChImages(src, pageImagesDir, pageIndex, i, j);
                if (downloadedName) {
                  downloadedImages.push(downloadedName);
                }
              }
            }
          } catch (error) {
            this.logger.error(`Error procesando ch-images elemento ${i}: ${error.message}`);
          }
        }

      } catch (timeoutError) {
        this.logger.log(`No se encontraron elementos ch-images en: ${url} (timeout)`);

        // Si no hay ch-images, procesar dropdown de todas formas

        // Procesar dropdown-menu y rels
        const dropdownResult = await this.processDropdownRels(url, imagesDir, pageIndex);
        downloadedImages.push(...dropdownResult.downloadedImages);
        dropdownRels = dropdownResult.relsProcessed;

        // Buscar imágenes normales como fallback
        const normalImages = await page.$$('img');
        const limitedImages = normalImages.slice(0, 10);

        for (let i = 0; i < limitedImages.length; i++) {
          const img = limitedImages[i];
          const src = await img.evaluate(el => el.src);

          if (src && src.startsWith('http')) {
            const downloadedName = await this.downloadImageFromChImages(src, pageImagesDir, pageIndex, 0, i);
            if (downloadedName) {
              downloadedImages.push(downloadedName);
            }
          }
        }
      }

    } catch (error) {
      this.logger.error(`Error con Puppeteer en ${url}: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return { downloadedImages, chImagesCount, dropdownRels };
  }

  /**
   * Descarga una imagen desde ch-images
   */
  private async downloadImageFromChImages(imageUrl: string, pageImagesDir: string, pageIndex: number, chIndex: number, imgIndex: number): Promise<string | null> {
    try {
      // Obtener extensión del archivo
      const urlPath = new URL(imageUrl).pathname;
      const extension = path.extname(urlPath) || '.jpg';

      // Generar nombre único para la imagen
      const imageName = `page_${pageIndex}_ch_${chIndex}_img_${imgIndex}_${Date.now()}${extension}`;
      const imagePath = path.join(pageImagesDir, imageName);

      // Descargar imagen
      const response = await firstValueFrom(
        this.httpService.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      );

      // Guardar imagen
      await fs.writeFile(imagePath, response.data);
      this.logger.log(`Imagen ch-images descargada: ${imageName}`);

      return imageName;
    } catch (error) {
      this.logger.error(`Error descargando imagen ch-images ${imageUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Descarga una imagen desde una URL (método original para imágenes normales)
   */
  private async downloadImage(imageUrl: string, baseUrl: string, imagesDir: string, pageIndex: number): Promise<string | null> {
    try {
      // Resolver URL relativa
      const absoluteUrl = new URL(imageUrl, baseUrl).href;

      // Crear directorio específico para esta página
      const pageDirectoryName = this.getDirectoryNameFromUrl(baseUrl);
      const pageImagesDir = path.join(imagesDir, pageDirectoryName);
      await fs.ensureDir(pageImagesDir);

      // Obtener extensión del archivo
      const urlPath = new URL(absoluteUrl).pathname;
      const extension = path.extname(urlPath) || '.jpg';

      // Generar nombre único para la imagen
      const imageName = `page_${pageIndex}_img_${Date.now()}${extension}`;
      const imagePath = path.join(pageImagesDir, imageName);

      // Descargar imagen
      const response = await firstValueFrom(
        this.httpService.get(absoluteUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
      );

      // Guardar imagen
      await fs.writeFile(imagePath, response.data);
      this.logger.log(`Imagen descargada: ${imageName}`);

      return imageName;
    } catch (error) {
      this.logger.error(`Error descargando imagen ${imageUrl}: ${error.message}`);
      return null;
    }
  }

  /**
   * Detecta y analiza listados en la página
   */
  private detectLists($: cheerio.CheerioAPI, baseUrl: string): any[] {
    const lists: any[] = [];

    // Detectar listas ordenadas y no ordenadas
    $('ul, ol').each((i, listElement) => {
      const $list = $(listElement);
      const listItems: any[] = [];

      $list.find('li').each((j, item) => {
        const $item = $(item);
        const text = $item.text().trim();
        const links: string[] = [];

        // Extraer enlaces dentro del item de lista
        $item.find('a').each((k, link) => {
          const href = $(link).attr('href');
          if (href) {
            try {
              const absoluteUrl = new URL(href, baseUrl).href;
              links.push(absoluteUrl);
            } catch (e) {
              // Ignorar URLs malformadas
            }
          }
        });

        if (text.length > 0) {
          listItems.push({
            text: text,
            links: links,
            hasSublist: $item.find('ul, ol').length > 0
          });
        }
      });

      if (listItems.length > 0) {
        lists.push({
          type: listElement.tagName,
          itemCount: listItems.length,
          items: listItems.slice(0, 10), // Limitar a 10 items por lista
          hasNestedLists: $list.find('ul, ol').length > 0
        });
      }
    });

    // Detectar listas de definición
    $('dl').each((i, dlElement) => {
      const $dl = $(dlElement);
      const definitions: any[] = [];

      $dl.find('dt').each((j, dt) => {
        const $dt = $(dt);
        const $dd = $dt.next('dd');

        definitions.push({
          term: $dt.text().trim(),
          definition: $dd.text().trim()
        });
      });

      if (definitions.length > 0) {
        lists.push({
          type: 'dl',
          itemCount: definitions.length,
          items: definitions.slice(0, 10)
        });
      }
    });

    return lists;
  }

  /**
   * Extrae información detallada de una página web
   */
  private async extractDetailedInfo(url: string, imagesDir: string, pageIndex: number): Promise<any> {
    try {
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      ];

      const userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          },
          timeout: 10000,
        })
      );

      const html = response.data;
      const $ = cheerio.load(html);

      // Extraer información detallada
      const headings = {
        h1: [] as string[],
        h2: [] as string[],
        h3: [] as string[]
      };

      $('h1').each((i, el) => {
        headings.h1.push($(el).text().trim());
      });
      $('h2').each((i, el) => {
        headings.h2.push($(el).text().trim());
      });
      $('h3').each((i, el) => {
        headings.h3.push($(el).text().trim());
      });

      // Usar Puppeteer para ch-images con scroll y procesamiento de dropdown rels
      const chImagesResult = await this.waitForChImagesAndDownload(url, imagesDir, pageIndex);
      let downloadedImages = chImagesResult.downloadedImages;
      const chImagesCount = chImagesResult.chImagesCount;
      const dropdownRels = chImagesResult.dropdownRels;

      // Si no se encontraron suficientes imágenes, usar método tradicional como fallback
      if (downloadedImages.length < 3) {
        this.logger.log(`Usando método tradicional como fallback para: ${url}`);

        const images: ImageInfo[] = [];
        const imageElements = $('img').slice(0, 5); // Limitar a 5 imágenes por página

        for (let i = 0; i < imageElements.length; i++) {
          const img = imageElements[i];
          const src = $(img).attr('src');
          const alt = $(img).attr('alt');

          if (src) {
            const imageInfo: ImageInfo = { src, alt: alt || '' };

            // Intentar descargar la imagen
            const downloadedName = await this.downloadImage(src, url, imagesDir, pageIndex);
            if (downloadedName) {
              imageInfo.downloaded = downloadedName;
              downloadedImages.push(downloadedName);
            }

            images.push(imageInfo);
          }
        }
      }

      const paragraphs: string[] = [];
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 20) {
          paragraphs.push(text);
        }
      });

      // Detectar listados
      const detectedLists = this.detectLists($, url);

      return {
        title: $('title').text().trim(),
        metaDescription: $('meta[name="description"]').attr('content') || '',
        metaKeywords: $('meta[name="keywords"]').attr('content') || '',
        headings,
        downloadedImages: downloadedImages,
        paragraphs: paragraphs.slice(0, 5), // Limitar a 5 párrafos
        wordCount: $('body').text().split(/\s+/).length,
        linkCount: $('a').length,
        detectedLists: detectedLists,
        listCount: detectedLists.length,
        chImagesCount: chImagesCount,
        dropdownRels: dropdownRels,
        pageDirectory: this.getDirectoryNameFromUrl(url)
      };
    } catch (error) {
      this.logger.error(`Error extracting detailed info from ${url}: ${error.message}`);
      return {
        title: 'Error al extraer información',
        error: error.message,
        downloadedImages: [],
        detectedLists: [],
        chImagesCount: 0,
        dropdownRels: 0,
        pageDirectory: this.getDirectoryNameFromUrl(url)
      };
    }
  }

  /**
   * Extrae enlaces adicionales de listados detectados
   */
  private extractLinksFromLists(detectedLists: any[]): string[] {
    const listLinks: string[] = [];

    detectedLists.forEach(list => {
      list.items.forEach((item: any) => {
        if (item.links && item.links.length > 0) {
          listLinks.push(...item.links);
        }
      });
    });

    return [...new Set(listLinks)]; // Eliminar duplicados
  }

  /**
   * Proceso real de crawling y guardado en Excel, ejecutado en segundo plano
   */
  private async startCrawlingAndSaveExcel(url: string, maxDepth: number, excelPath: string, imagesDir: string, targetPhrases?: string[], maxFilteredPages?: number) {
    const visited = new Set<string>();
    const treeNodes = new Map<string, TreeNode>();
    let filteredPagesProcessed = 0;
    let pageIndex = 0;

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    /**
     * Verifica si un enlace contiene alguna de las frases objetivo
     */
    const containsTargetPhrase = (link: string, linkText: string): boolean => {
      if (!targetPhrases || targetPhrases.length === 0) {
        return true;
      }

      const searchText = `${link} ${linkText}`.toLowerCase();
      return targetPhrases.some(phrase =>
        searchText.includes(phrase.toLowerCase())
      );
    };

    /**
     * Verifica si se ha alcanzado el límite de páginas filtradas
     */
    const hasReachedFilteredPagesLimit = (): boolean => {
      return maxFilteredPages !== undefined && filteredPagesProcessed >= maxFilteredPages;
    };

    const crawl = async (currentUrl: string, depth: number, parentUrl?: string) => {
      if (depth > maxDepth || visited.has(currentUrl) || hasReachedFilteredPagesLimit()) {
        return;
      }

      visited.add(currentUrl);
      pageIndex++;
      this.logger.log(`Crawling: ${currentUrl} (depth: ${depth}, page: ${pageIndex})`);

      try {
        const response = await firstValueFrom(
          this.httpService.get(currentUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            },
            timeout: 10000,
          })
        );
        const html = response.data;
        const $ = cheerio.load(html);

        const title = $('title').text().trim();
        const filteredLinks: string[] = [];

        // Crear nodo del árbol
        const node: TreeNode = {
          url: currentUrl,
          title: title,
          depth: depth,
          parent: parentUrl,
          children: [],
          downloadedImages: [],
          detectedLists: [],
          chImagesFound: 0,
          dropdownRelsProcessed: 0
        };

        // Extraer información detallada de la página
        this.logger.log(`Extrayendo información detallada de: ${currentUrl}`);
        node.scrapedData = await this.extractDetailedInfo(currentUrl, imagesDir, pageIndex);
        node.downloadedImages = node.scrapedData.downloadedImages || [];
        node.detectedLists = node.scrapedData.detectedLists || [];
        node.chImagesFound = node.scrapedData.chImagesCount || 0;
        node.dropdownRelsProcessed = node.scrapedData.dropdownRels || 0;

        // Extraer enlaces de navegación normal
        const anchors = $('a');
        anchors.each((i, link) => {
          const href = $(link).attr('href');
          const linkText = $(link).text().trim();

          if (href && href.startsWith('http')) {
            if (containsTargetPhrase(href, linkText)) {
              filteredLinks.push(href);
            }
          }
        });

        // Extraer enlaces adicionales de listados detectados
        const listLinks = this.extractLinksFromLists(node.detectedLists || []);
        const filteredListLinks = listLinks.filter(link => {
          return containsTargetPhrase(link, '');
        });

        // Combinar todos los enlaces filtrados
        const allFilteredLinks = [...new Set([...filteredLinks, ...filteredListLinks])];

        // Agregar nodo al mapa
        treeNodes.set(currentUrl, node);

        // Conectar con el padre
        if (parentUrl && treeNodes.has(parentUrl)) {
          treeNodes.get(parentUrl)!.children.push(node);
        }

        if (allFilteredLinks.length > 0 || (!targetPhrases || targetPhrases.length === 0)) {
          filteredPagesProcessed++;
        }

        this.logger.log(`Enlaces filtrados encontrados: ${allFilteredLinks.length}`);
        this.logger.log(`Imágenes descargadas: ${node.downloadedImages.length}`);
        this.logger.log(`Elementos ch-images encontrados: ${node.chImagesFound}`);
        this.logger.log(`Dropdown rels procesados: ${node.dropdownRelsProcessed}`);

        if (maxFilteredPages) {
          this.logger.log(`Páginas filtradas procesadas: ${filteredPagesProcessed}/${maxFilteredPages}`);
        }

        if (hasReachedFilteredPagesLimit()) {
          this.logger.log(`Se alcanzó el límite de páginas filtradas (${maxFilteredPages}). Deteniendo crawling.`);
          return;
        }

        await delay(3000 + Math.random() * 2000);

        if (depth < maxDepth) {
          for (const link of allFilteredLinks) {
            if (hasReachedFilteredPagesLimit()) {
              break;
            }
            await crawl(link, depth + 1, currentUrl);
          }
        }
      } catch (error) {
        this.logger.error(`Error crawling URL ${currentUrl}: ${error.message}`);
        const errorNode: TreeNode = {
          url: currentUrl,
          title: 'Error al cargar página',
          depth: depth,
          parent: parentUrl,
          children: [],
          downloadedImages: [],
          detectedLists: [],
          chImagesFound: 0,
          dropdownRelsProcessed: 0,
          scrapedData: { error: error.message }
        };
        treeNodes.set(currentUrl, errorNode);
      }
    };

    await crawl(url, 1);

    // Generar archivo Excel
    await this.generateExcelFile(excelPath, treeNodes, url);

    this.logger.log(`Archivo Excel generado: ${excelPath}`);
    this.logger.log(`Directorio de imágenes: ${imagesDir}`);
    this.logger.log(`Crawling completado. Páginas visitadas: ${visited.size}, Páginas filtradas: ${filteredPagesProcessed}`);
  }

  /**
   * Genera el archivo Excel con estructura de árbol y datos detallados
   */
  private async generateExcelFile(excelPath: string, treeNodes: Map<string, TreeNode>, rootUrl: string) {
    const workbook = new ExcelJS.Workbook();

    // Pestaña 1: Estructura de árbol
    const treeSheet = workbook.addWorksheet('Árbol del Sitio');

    treeSheet.columns = [
      { header: 'Nivel', key: 'level', width: 10 },
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Profundidad', key: 'depth', width: 12 },
      { header: 'Padre', key: 'parent', width: 60 },
      { header: 'Imágenes Descargadas', key: 'images', width: 20 },
      { header: 'CH-Images Encontrados', key: 'chImages', width: 20 },
      { header: 'Dropdown Rels Procesados', key: 'dropdownRels', width: 25 },
      { header: 'Listados Detectados', key: 'lists', width: 20 },
      { header: 'Directorio', key: 'directory', width: 30 }
    ];

    const addNodeToSheet = (node: TreeNode, level: number = 0) => {
      const indent = '  '.repeat(level);
      treeSheet.addRow({
        level: level,
        url: node.url,
        title: `${indent}${node.title}`,
        depth: node.depth,
        parent: node.parent || 'Raíz',
        images: node.downloadedImages?.length || 0,
        chImages: node.chImagesFound || 0,
        dropdownRels: node.dropdownRelsProcessed || 0,
        lists: node.detectedLists?.length || 0,
        directory: node.scrapedData?.pageDirectory || ''
      });

      node.children.forEach(child => {
        addNodeToSheet(child, level + 1);
      });
    };

    const rootNode = treeNodes.get(rootUrl);
    if (rootNode) {
      addNodeToSheet(rootNode);
    }

    // Pestaña 2: Información detallada
    const detailSheet = workbook.addWorksheet('Información Detallada');

    detailSheet.columns = [
      { header: 'URL', key: 'url', width: 60 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Meta Descripción', key: 'metaDescription', width: 50 },
      { header: 'Meta Keywords', key: 'metaKeywords', width: 30 },
      { header: 'H1', key: 'h1', width: 40 },
      { header: 'H2', key: 'h2', width: 40 },
      { header: 'H3', key: 'h3', width: 40 },
      { header: 'Número de Palabras', key: 'wordCount', width: 15 },
      { header: 'Número de Enlaces', key: 'linkCount', width: 15 },
      { header: 'Imágenes Descargadas', key: 'downloadedImages', width: 30 },
      { header: 'CH-Images Encontrados', key: 'chImagesCount', width: 20 },
      { header: 'Dropdown Rels Procesados', key: 'dropdownRels', width: 25 },
      { header: 'Directorio de Página', key: 'pageDirectory', width: 30 },
      { header: 'Párrafos Principales', key: 'paragraphs', width: 60 },
      { header: 'Listados Detectados', key: 'listCount', width: 15 },
      { header: 'Error', key: 'error', width: 30 }
    ];

    // Pestaña 3: Listados detectados
    const listsSheet = workbook.addWorksheet('Listados Detectados');

    listsSheet.columns = [
      { header: 'URL Origen', key: 'sourceUrl', width: 60 },
      { header: 'Tipo de Lista', key: 'listType', width: 15 },
      { header: 'Número de Items', key: 'itemCount', width: 15 },
      { header: 'Tiene Sublistas', key: 'hasNested', width: 15 },
      { header: 'Items (Primeros 5)', key: 'items', width: 80 },
      { header: 'Enlaces en Lista', key: 'listLinks', width: 60 }
    ];

    // Agregar datos detallados
    treeNodes.forEach(node => {
      if (node.scrapedData) {
        const data = node.scrapedData;
        detailSheet.addRow({
          url: node.url,
          title: data.title || node.title,
          metaDescription: data.metaDescription || '',
          metaKeywords: data.metaKeywords || '',
          h1: data.headings?.h1?.join('; ') || '',
          h2: data.headings?.h2?.slice(0, 3).join('; ') || '',
          h3: data.headings?.h3?.slice(0, 3).join('; ') || '',
          wordCount: data.wordCount || 0,
          linkCount: data.linkCount || 0,
          downloadedImages: data.downloadedImages?.join('; ') || '',
          chImagesCount: data.chImagesCount || 0,
          dropdownRels: data.dropdownRels || 0,
          pageDirectory: data.pageDirectory || '',
          paragraphs: data.paragraphs?.slice(0, 2).join(' | ') || '',
          listCount: data.listCount || 0,
          error: data.error || ''
        });

        // Agregar información de listados
        if (data.detectedLists && data.detectedLists.length > 0) {
          data.detectedLists.forEach((list: any) => {
            const listLinks = list.items
              .filter((item: any) => item.links && item.links.length > 0)
              .map((item: any) => item.links.join(', '))
              .join('; ');

            listsSheet.addRow({
              sourceUrl: node.url,
              listType: list.type,
              itemCount: list.itemCount,
              hasNested: list.hasNestedLists ? 'Sí' : 'No',
              items: list.items.slice(0, 5).map((item: any) => item.text).join(' | '),
              listLinks: listLinks
            });
          });
        }
      }
    });

    // Aplicar estilos
    [treeSheet, detailSheet, listsSheet].forEach(sheet => {
      sheet.getRow(1).font = { bold: true };

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' }
          };
        }
      });
    });

    // Guardar archivo
    await workbook.xlsx.writeFile(excelPath);
  }
}