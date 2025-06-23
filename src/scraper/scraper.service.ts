import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { ScrapeRequestDto, CrawlRequestDto } from './dto/scrape-request.dto';
import { ImageDownloadService, ImageDownloadResult } from './services/image-download.service';

export interface ScrapedData {
  url: string;
  title?: string;
  content: any;
  links?: string[];
  images?: string[];
  listLinks?: string[];
  timestamp: Date;
  metadata?: {
    responseTime: number;
    statusCode?: number;
    contentType?: string;
  };
}

export interface CrawledData {
  baseUrl: string;
  pages: ScrapedData[];
  summary: {
    totalPages: number;
    filteredPages: number;
    targetFilteredPages: number | null;
    reachedTarget: boolean | null;
    totalLinks: number;
    totalImages: number;
    crawlDuration: number;
    listLinksFound: number;
    listLinksExplored: number;
    contentMatches?: {
      totalKeywordMatches: number;
      totalPatternMatches: number;
      averageRelevanceScore: number;
      pagesWithContent: number;
      topKeywords: { keyword: string; count: number }[];
      topPatterns: { pattern: string; count: number }[];
    };
  };
  imageDownloadResult?: ImageDownloadResult;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    currentPage: number;
    totalPages: number;
    filteredPages: number;
    currentUrl?: string;
    message?: string;
  };
  result?: CrawledData;
  error?: string;
  startTime: Date;
  endTime?: Date;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);
  private readonly jobs = new Map<string, JobStatus>();

  // Configuración de timeouts mejorada
  private readonly DEFAULT_TIMEOUT = 30000; // 30 segundos
  private readonly NAVIGATION_TIMEOUT = 60000; // 60 segundos para navegación
  private readonly WAIT_TIMEOUT = 10000; // 10 segundos para elementos
  private readonly REQUEST_TIMEOUT = 45000; // 45 segundos para requests HTTP

  // Pool de User-Agents para rotación
  private readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  ];

  // Configuración específica para sitios problemáticos
  private readonly PROBLEMATIC_DOMAINS = [
    'anzmanga25.com',
    'anzmanga.com',
    'mangakakalot.com',
    'manganelo.com',
    'readmanga.today'
  ];

  constructor(private readonly imageDownloadService: ImageDownloadService) {}

  // Método para detectar si un dominio es problemático
  private isProblematicDomain(url: string): boolean {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return this.PROBLEMATIC_DOMAINS.some(problematic => 
        domain.includes(problematic) || problematic.includes(domain)
      );
    } catch {
      return false;
    }
  }

  // Método para obtener User-Agent aleatorio
  private getRandomUserAgent(): string {
    return this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
  }

  // Método para generar delay aleatorio
  private async randomDelay(min: number = 1000, max: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Método para generar headers más realistas
  private generateRealisticHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const baseHeaders = {
      'User-Agent': this.getRandomUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    };

    return { ...baseHeaders, ...customHeaders };
  }

  // Método para obtener el estado de un job
  getJobStatus(jobId: string): JobStatus | null {
    return this.jobs.get(jobId) || null;
  }

  // Método para listar todos los jobs
  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  // Método para limpiar jobs completados (opcional)
  cleanupCompletedJobs(): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        // Mantener jobs por 1 hora después de completarse
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (job.endTime && job.endTime < oneHourAgo) {
          this.jobs.delete(jobId);
        }
      }
    }
  }

  // Método para iniciar crawling asíncrono
  async startAsyncCrawl(crawlRequest: CrawlRequestDto): Promise<{ jobId: string; message: string }> {
    const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const jobStatus: JobStatus = {
      jobId,
      status: 'pending',
      progress: {
        currentPage: 0,
        totalPages: crawlRequest.maxPages || 10,
        filteredPages: 0,
        message: 'Iniciando crawling...'
      },
      startTime: new Date()
    };

    this.jobs.set(jobId, jobStatus);

    // Ejecutar crawling en background
    this.executeCrawlJob(jobId, crawlRequest).catch(error => {
      this.logger.error(`Error en job ${jobId}:`, error);
      const job = this.jobs.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        job.endTime = new Date();
      }
    });

    return {
      jobId,
      message: 'Crawling iniciado. Use el jobId para consultar el progreso.'
    };
  }

  private async executeCrawlJob(jobId: string, crawlRequest: CrawlRequestDto): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      job.status = 'running';
      job.progress.message = 'Ejecutando crawling...';

      const result = await this.crawlWebsiteWithProgress(crawlRequest, (progress) => {
        const currentJob = this.jobs.get(jobId);
        if (currentJob) {
          currentJob.progress = { ...currentJob.progress, ...progress };
        }
      });

      job.status = 'completed';
      job.result = result;
      job.endTime = new Date();
      job.progress.message = 'Crawling completado exitosamente';

    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      job.endTime = new Date();
      job.progress.message = `Error: ${error.message}`;
    }
  }

  async scrapeUrl(scrapeRequest: ScrapeRequestDto): Promise<ScrapedData> {
    const startTime = Date.now();
    const { url, selectors, executeJavaScript = false, waitTime = 1000, headers } = scrapeRequest;

    try {
      this.logger.log(`Iniciando scraping de: ${url}`);

      let scrapedData: ScrapedData;

      try {
        if (executeJavaScript) {
          // Petición principal usando Puppeteer cuando el caller lo solicita explícitamente
          scrapedData = await this.scrapeWithPuppeteer(url, selectors, waitTime, headers, scrapeRequest);
        } else {
          // Petición rápida vía Axios
          scrapedData = await this.scrapeWithAxios(url, selectors, headers, scrapeRequest);
        }
      } catch (primaryError) {
        // Si el scraping con Axios falla (por ejemplo, sitios con protección anti-bot/Cloudflare),
        // reintentar automáticamente con Puppeteer como mecanismo de reserva, siempre y cuando
        // el caller no haya solicitado ya el uso de executeJavaScript.
        if (!executeJavaScript) {
          this.logger.warn(`Scraping con Axios falló para ${url}: ${primaryError.message}. Reintentando con Puppeteer como fallback...`);

          // Intento de reserva utilizando Puppeteer
          scrapedData = await this.scrapeWithPuppeteer(url, selectors, waitTime, headers, scrapeRequest);
        } else {
          // Si ya estábamos usando Puppeteer o la excepción es ajena al método, propagar el error.
          throw primaryError;
        }
      }

      scrapedData.metadata = {
        ...scrapedData.metadata,
        responseTime: Date.now() - startTime,
      };

      this.logger.log(`Scraping completado para: ${url}`);
      return scrapedData;

    } catch (error) {
      this.logger.error(`Error en scraping de ${url}:`, error.message);
      throw new BadRequestException(`Error al hacer scraping: ${error.message}`);
    }
  }

  async crawlWebsite(crawlRequest: CrawlRequestDto): Promise<CrawledData> {
    return this.crawlWebsiteWithProgress(crawlRequest);
  }

  private async crawlWebsiteWithProgress(
    crawlRequest: CrawlRequestDto, 
    progressCallback?: (progress: Partial<JobStatus['progress']>) => void
  ): Promise<CrawledData> {
    const startTime = Date.now();
    const {
      baseUrl,
      maxDepth = 2,
      maxPages = 10,
      includePatterns = [],
      excludePatterns = [],
      selectors,
      linkKeywords = [],
      excludeKeywords = [],
      targetFilteredPages = 0,
      downloadImages = false,
      exploreLists = false,
      listSelectors = [],
      createImageSubdirectories = true
    } = crawlRequest;

    try {
      this.logger.log(`Iniciando crawling desde: ${baseUrl}`);
      progressCallback?.({ message: `Iniciando crawling desde: ${baseUrl}` });

      const visitedUrls = new Set<string>();
      const urlsToVisit = [{ url: baseUrl, depth: 0 }];
      const scrapedPages: ScrapedData[] = [];
      let filteredPagesCount = 0;
      let listLinksFound = 0;
      let listLinksExplored = 0;

      // Determinar condiciones de parada
      const shouldStopByTotal = () => scrapedPages.length >= maxPages;
      const shouldStopByFiltered = () => targetFilteredPages > 0 && filteredPagesCount >= targetFilteredPages;
      const shouldStop = () => shouldStopByTotal() || shouldStopByFiltered();

      while (urlsToVisit.length > 0 && !shouldStop()) {
        const { url: currentUrl, depth } = urlsToVisit.shift()!;

        if (visitedUrls.has(currentUrl) || depth > maxDepth) {
          continue;
        }

        // Verificar patrones de inclusión y exclusión
        if (!this.shouldProcessUrl(currentUrl, includePatterns, excludePatterns)) {
          continue;
        }

        visitedUrls.add(currentUrl);

        // Actualizar progreso
        progressCallback?.({
          currentPage: scrapedPages.length + 1,
          filteredPages: filteredPagesCount,
          currentUrl,
          message: `Procesando página ${scrapedPages.length + 1}/${maxPages}: ${currentUrl}`
        });

        try {
          const scrapedData = await this.scrapeUrl({
            url: currentUrl,
            selectors,
            executeJavaScript: (crawlRequest as any).processChImages || (crawlRequest as any).processDropdowns || false,
            exploreLists,
            listSelectors,
            processChImages: (crawlRequest as any).processChImages,
            chImagesTimeout: (crawlRequest as any).chImagesTimeout,
            processDropdowns: (crawlRequest as any).processDropdowns,
            dropdownSelectors: (crawlRequest as any).dropdownSelectors,
            sortDropdownValues: (crawlRequest as any).sortDropdownValues
          } as any);

          scrapedPages.push(scrapedData);

          // Verificar si esta página cumple con los criterios de filtrado
          const pageMatchesFilter = this.pageMatchesFilterCriteria(
            scrapedData, 
            linkKeywords, 
            excludeKeywords, 
            includePatterns, 
            excludePatterns,
            crawlRequest
          );

          if (pageMatchesFilter) {
            filteredPagesCount++;
            this.logger.log(`Página filtrada encontrada ${filteredPagesCount}/${targetFilteredPages || '∞'}: ${currentUrl}`);
          }

          // Agregar nuevos enlaces encontrados para crawlear
          if (depth < maxDepth && scrapedData.links) {
            const filteredLinks = await this.filterLinksByKeywords(
              currentUrl, 
              scrapedData.links, 
              linkKeywords, 
              excludeKeywords
            );
            
            for (const link of filteredLinks) {
              const absoluteUrl = this.resolveUrl(link, baseUrl);
              if (absoluteUrl && !visitedUrls.has(absoluteUrl)) {
                urlsToVisit.push({ url: absoluteUrl, depth: depth + 1 });
              }
            }
          }

          // Explorar enlaces de listados si está habilitado
          if (exploreLists && scrapedData.listLinks) {
            listLinksFound += scrapedData.listLinks.length;
            
            const filteredListLinks = await this.filterLinksByKeywords(
              currentUrl,
              scrapedData.listLinks,
              linkKeywords,
              excludeKeywords
            );

            for (const listLink of filteredListLinks) {
              const absoluteUrl = this.resolveUrl(listLink, baseUrl);
              if (absoluteUrl && !visitedUrls.has(absoluteUrl) && depth < maxDepth) {
                urlsToVisit.push({ url: absoluteUrl, depth: depth + 1 });
                listLinksExplored++;
              }
            }
          }

          // Pausa inteligente entre requests
          const isProblematic = this.isProblematicDomain(currentUrl);
          if (isProblematic) {
            await this.randomDelay(2000, 5000); // 2-5 segundos para sitios problemáticos
          } else {
            await this.randomDelay(500, 1500); // 0.5-1.5 segundos para sitios normales
          }

        } catch (error) {
          this.logger.warn(`Error al hacer scraping de ${currentUrl}: ${error.message}`);
          progressCallback?.({
            message: `Error en ${currentUrl}: ${error.message}`
          });
        }
      }

      // Descargar imágenes si está habilitado
      let imageDownloadResult: ImageDownloadResult | undefined;
      if (downloadImages) {
        this.logger.log('Iniciando descarga de imágenes...');
        const pagesWithImages = scrapedPages
          .filter(page => page.images && page.images.length > 0)
          .map(page => ({
            url: page.url,
            images: page.images!,
            title: page.title
          }));

        if (pagesWithImages.length > 0) {
          imageDownloadResult = await this.imageDownloadService.downloadImagesFromPages(
            pagesWithImages,
            baseUrl,
            createImageSubdirectories
          );
          this.logger.log(`Descarga completada: ${imageDownloadResult.downloadedImages.length}/${imageDownloadResult.totalImages} imágenes`);
        }
      }

      const crawlDuration = Date.now() - startTime;
      const totalLinks = scrapedPages.reduce((sum, page) => sum + (page.links?.length || 0), 0);
      const totalImages = scrapedPages.reduce((sum, page) => sum + (page.images?.length || 0), 0);

      // Calcular estadísticas de coincidencias de contenido
      const contentStats = this.calculateContentStatistics(scrapedPages, crawlRequest);

      this.logger.log(`Crawling completado. ${scrapedPages.length} páginas procesadas en ${crawlDuration}ms`);
      if (contentStats.pagesWithContent > 0) {
        this.logger.log(`Análisis de contenido: ${contentStats.pagesWithContent} páginas con coincidencias, score promedio: ${contentStats.averageRelevanceScore.toFixed(2)}`);
      }

      return {
        baseUrl,
        pages: scrapedPages,
        summary: {
          totalPages: scrapedPages.length,
          filteredPages: filteredPagesCount,
          targetFilteredPages: targetFilteredPages || null,
          reachedTarget: targetFilteredPages > 0 ? filteredPagesCount >= targetFilteredPages : null,
          totalLinks,
          totalImages,
          crawlDuration,
          listLinksFound,
          listLinksExplored,
          contentMatches: contentStats.pagesWithContent > 0 ? contentStats : undefined
        },
        imageDownloadResult
      };

    } catch (error) {
      this.logger.error(`Error en crawling desde ${baseUrl}:`, error.message);
      throw new BadRequestException(`Error al hacer crawling: ${error.message}`);
    }
  }

  private async scrapeWithAxios(url: string, selectors?: string[], headers?: Record<string, string>, request?: ScrapeRequestDto): Promise<ScrapedData> {
    const isProblematic = this.isProblematicDomain(url);
    
    // Para sitios problemáticos, agregar delay aleatorio
    if (isProblematic) {
      await this.randomDelay(2000, 5000);
      this.logger.log(`Sitio problemático detectado: ${url}. Aplicando técnicas de evasión...`);
    }

    const realisticHeaders = this.generateRealisticHeaders(headers);
    
    // Configuración específica para sitios problemáticos
    const axiosConfig = {
      headers: realisticHeaders,
      timeout: isProblematic ? this.REQUEST_TIMEOUT * 1.5 : this.REQUEST_TIMEOUT, // 67.5s para sitios problemáticos
      maxRedirects: 10, // Más redirecciones para sitios complejos
      validateStatus: (status) => status < 500,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false,
        keepAlive: true,
        timeout: isProblematic ? this.REQUEST_TIMEOUT * 1.5 : this.REQUEST_TIMEOUT,
        // Configuración TCP específica para sitios problemáticos
        ...(isProblematic && {
          maxSockets: 1,
          maxFreeSockets: 1,
          freeSocketTimeout: 30000,
          socketActiveTTL: 60000
        })
      }),
      // Configuración adicional para sitios problemáticos
      ...(isProblematic && {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        decompress: true,
        transitional: {
          silentJSONParsing: false,
          forcedJSONParsing: true,
          clarifyTimeoutError: false
        }
      })
    };

    let response;
    let retryCount = 0;
    const maxRetries = isProblematic ? 3 : 1;

    while (retryCount <= maxRetries) {
      try {
        this.logger.log(`Intento ${retryCount + 1}/${maxRetries + 1} para ${url}`);
        response = await axios.get(url, axiosConfig);
        break; // Éxito, salir del bucle
      } catch (error) {
        retryCount++;
        this.logger.warn(`Intento ${retryCount} falló para ${url}: ${error.message}`);
        
        if (retryCount > maxRetries) {
          throw error; // Último intento falló
        }
        
        // Delay exponencial entre reintentos
        const retryDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
        this.logger.log(`Esperando ${retryDelay}ms antes del siguiente intento...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Cambiar User-Agent para el siguiente intento
        axiosConfig.headers['User-Agent'] = this.getRandomUserAgent();
      }
    }

    const $ = cheerio.load(response.data);
    const content: any = {};

    // Extraer título
    const title = $('title').text().trim();

    // Extraer enlaces
    const links: string[] = [];
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        links.push(href);
      }
    });

    // Extraer imágenes
    const images: string[] = [];
    $('img[src]').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        images.push(src);
      }
    });

          // Extraer enlaces de listados si está habilitado
      let listLinks: string[] = [];
      if (request?.exploreLists) {
        listLinks = this.extractListLinksFromCheerio($ as any, request.listSelectors || []);
      }

    // Aplicar selectores personalizados
    if (selectors && selectors.length > 0) {
      for (const selector of selectors) {
        try {
          const elements = $(selector);
          content[selector] = [];
          
          elements.each((_, element) => {
            const $element = $(element);
            content[selector].push({
              text: $element.text().trim(),
              html: $element.html(),
              attributes: (element as any).attribs || {}
            });
          });
        } catch (error) {
          this.logger.warn(`Error aplicando selector "${selector}": ${error.message}`);
          content[selector] = null;
        }
      }
    } else {
      // Extraer contenido básico
      content.title = title;
      content.headings = {
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        h3: $('h3').map((_, el) => $(el).text().trim()).get(),
      };
      content.paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter(text => text.length > 0);
    }

    return {
      url,
      title,
      content,
      links,
      images,
      listLinks,
      timestamp: new Date(),
      metadata: {
        responseTime: 0, // Se actualizará en el método principal
        statusCode: response.status,
        contentType: response.headers['content-type']
      }
    };
  }

  private async scrapeWithPuppeteer(url: string, selectors?: string[], waitTime = 1000, headers?: Record<string, string>, request?: ScrapeRequestDto): Promise<ScrapedData> {
    const isProblematic = this.isProblematicDomain(url);
    
    // Para sitios problemáticos, agregar delay inicial
    if (isProblematic) {
      await this.randomDelay(2000, 4000);
      this.logger.log(`Sitio problemático detectado: ${url}. Aplicando técnicas de evasión avanzadas...`);
    }

    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        // Argumentos adicionales para sitios problemáticos
        ...(isProblematic ? [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--no-default-browser-check',
          '--no-first-run',
          '--disable-default-apps'
        ] : [])
      ],
      timeout: this.DEFAULT_TIMEOUT
    });

    try {
      const page = await browser.newPage();

      // Configurar timeouts específicos para sitios problemáticos
      const pageTimeout = isProblematic ? this.WAIT_TIMEOUT * 2 : this.WAIT_TIMEOUT;
      const navTimeout = isProblematic ? this.NAVIGATION_TIMEOUT * 1.5 : this.NAVIGATION_TIMEOUT;
      
      page.setDefaultTimeout(pageTimeout);
      page.setDefaultNavigationTimeout(navTimeout);

              // Técnicas de evasión avanzadas para sitios problemáticos
        if (isProblematic) {
          // Eliminar rastros de automatización
          await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
            (window as any).chrome = { runtime: {} };
          });
        }

      // Configurar headers realistas
      const realisticHeaders = this.generateRealisticHeaders(headers);
      await page.setExtraHTTPHeaders(realisticHeaders);

      // Configurar User-Agent aleatorio
      await page.setUserAgent(this.getRandomUserAgent());

      // Configurar viewport realista
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 1440, height: 900 },
        { width: 1536, height: 864 }
      ];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
      await page.setViewport(randomViewport);

      // Configurar interceptación de requests
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Para sitios problemáticos, permitir más recursos
        if (isProblematic) {
          if (['media', 'font'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        } else {
          if (['stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        }
      });

      // Navegación con reintentos para sitios problemáticos
      let navigationSuccess = false;
      let retryCount = 0;
      const maxRetries = isProblematic ? 3 : 1;

      while (!navigationSuccess && retryCount <= maxRetries) {
        try {
          this.logger.log(`Navegación intento ${retryCount + 1}/${maxRetries + 1} para ${url}`);
          
          await page.goto(url, { 
            waitUntil: isProblematic ? 'networkidle2' : 'domcontentloaded',
            timeout: navTimeout 
          });
          
          navigationSuccess = true;
          
          // Esperar contenido dinámico con tiempo adicional para sitios problemáticos
          const finalWaitTime = isProblematic ? 
            Math.min(waitTime * 2, 8000) : 
            Math.min(waitTime, 5000);
          
          await page.waitForTimeout(finalWaitTime);
          
          // Para sitios problemáticos, simular actividad humana
          if (isProblematic) {
            await this.simulateHumanBehavior(page);
          }
          
        } catch (error) {
          retryCount++;
          this.logger.warn(`Navegación intento ${retryCount} falló para ${url}: ${error.message}`);
          
          if (retryCount > maxRetries) {
            this.logger.warn(`Todos los intentos de navegación fallaron para ${url}, intentando continuar...`);
            break;
          }
          
          // Delay antes del siguiente intento
          await this.randomDelay(3000, 6000);
        }
      }

      // Extraer título
      const title = await page.title();

      // Extraer enlaces
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(anchor => anchor.href).filter(href => href && href.length > 0)
      );

      // Extraer imágenes
      const images = await page.$$eval('img[src]', imgs =>
        imgs.map(img => img.src).filter(src => src && src.length > 0)
      );

      // Extraer enlaces de listados si está habilitado
      let listLinks: string[] = [];
      if (request?.exploreLists) {
        listLinks = await this.extractListLinksFromPuppeteer(page, request.listSelectors || []);
      }

      // Procesar elementos ch-images si está habilitado
      if ((request as any)?.processChImages) {
        const chImagesData = await this.processChImagesElements(page, url, (request as any).chImagesTimeout || 10000);
        // Agregar las imágenes de ch-images a la lista principal
        images.push(...chImagesData.images);
        // Agregar las URLs navegadas como enlaces para el crawling
        links.push(...chImagesData.navigatedUrls);
      }

      // Procesar dropdowns generales si está habilitado
      if ((request as any)?.processDropdowns) {
        const dropdownData = await this.processGeneralDropdowns(
          page, 
          url, 
          (request as any).dropdownSelectors || [],
          (request as any).sortDropdownValues !== false
        );
        // Agregar las imágenes de dropdowns a la lista principal
        images.push(...dropdownData.images);
        // Agregar las URLs navegadas como enlaces para el crawling
        links.push(...dropdownData.navigatedUrls);
      }

      const content: any = {};

      // Aplicar selectores personalizados
      if (selectors && selectors.length > 0) {
        for (const selector of selectors) {
          try {
            const elements = await page.$$(selector);
            content[selector] = [];

            for (const element of elements) {
              const text = await page.evaluate(el => el.textContent?.trim() || '', element);
              const html = await page.evaluate(el => el.innerHTML, element);
              const attributes = await page.evaluate(el => {
                const attrs: Record<string, string> = {};
                for (const attr of el.attributes) {
                  attrs[attr.name] = attr.value;
                }
                return attrs;
              }, element);

              content[selector].push({ text, html, attributes });
            }
          } catch (error) {
            this.logger.warn(`Error aplicando selector "${selector}": ${error.message}`);
            content[selector] = null;
          }
        }
      } else {
        // Extraer contenido básico
        content.title = title;
        content.headings = {
          h1: await page.$$eval('h1', elements => elements.map(el => el.textContent?.trim() || '')),
          h2: await page.$$eval('h2', elements => elements.map(el => el.textContent?.trim() || '')),
          h3: await page.$$eval('h3', elements => elements.map(el => el.textContent?.trim() || '')),
        };
        content.paragraphs = await page.$$eval('p', elements =>
          elements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0)
        );
      }

      return {
        url,
        title,
        content,
        links,
        images,
        listLinks,
        timestamp: new Date(),
        metadata: {
          responseTime: 0, // Se actualizará en el método principal
          statusCode: 200,
          contentType: 'text/html'
        }
      };

    } finally {
      await browser.close();
    }
  }

  private extractListLinksFromCheerio($: cheerio.CheerioAPI, customSelectors: string[]): string[] {
    const defaultSelectors = [
      'ul a[href]',
      'ol a[href]',
      'nav a[href]',
      '.menu a[href]',
      '.navigation a[href]',
      '.nav a[href]',
      '.sidebar a[href]',
      '.category a[href]',
      '.list a[href]'
    ];

    const allSelectors = [...defaultSelectors, ...customSelectors.map(sel => `${sel} a[href]`)];
    const listLinks: string[] = [];

    for (const selector of allSelectors) {
      try {
        $(selector).each((_, element) => {
          const href = $(element).attr('href');
          if (href && !listLinks.includes(href)) {
            listLinks.push(href);
          }
        });
      } catch (error) {
        this.logger.debug(`Error aplicando selector de lista "${selector}": ${error.message}`);
      }
    }

    return listLinks;
  }

  private async extractListLinksFromPuppeteer(page: puppeteer.Page, customSelectors: string[]): Promise<string[]> {
    const defaultSelectors = [
      'ul a[href]',
      'ol a[href]',
      'nav a[href]',
      '.menu a[href]',
      '.navigation a[href]',
      '.nav a[href]',
      '.sidebar a[href]',
      '.category a[href]',
      '.list a[href]'
    ];

    const allSelectors = [...defaultSelectors, ...customSelectors.map(sel => `${sel} a[href]`)];
    const listLinks: string[] = [];

    for (const selector of allSelectors) {
      try {
        const links = await page.$$eval(selector, anchors =>
          anchors.map(anchor => (anchor as HTMLAnchorElement).href).filter(href => href && href.length > 0)
        );
        
        for (const link of links) {
          if (!listLinks.includes(link)) {
            listLinks.push(link);
          }
        }
      } catch (error) {
        this.logger.debug(`Error aplicando selector de lista "${selector}": ${error.message}`);
      }
    }

    return listLinks;
  }

  private async processChImagesElements(page: puppeteer.Page, baseUrl: string, timeout: number): Promise<{
    images: string[];
    navigatedUrls: string[];
  }> {
    const allImages: string[] = [];
    const navigatedUrls: string[] = [];

    try {
      this.logger.log(`Buscando elementos ch-images en ${baseUrl}`);

      // Esperar a que aparezcan elementos ch-images (opcional)
      try {
        await page.waitForSelector('ch-images', { timeout });
        this.logger.log('Elementos ch-images encontrados, procesando...');
      } catch (error) {
        this.logger.debug('No se encontraron elementos ch-images, continuando sin procesamiento especial');
        return { images: [], navigatedUrls: [] };
      }

      // Esperar a que la página se renderice completamente
      await page.waitForTimeout(2000);

      // Buscar dropdown-menu open
      const dropdownMenus = await page.$$('.dropdown-menu.open');
      
      if (dropdownMenus.length === 0) {
        this.logger.debug('No se encontró dropdown-menu open, extrayendo imágenes directamente');
        // Extraer imágenes img-responsive directamente
        const directImages = await page.$$eval('.img-responsive', imgs =>
          imgs.map(img => (img as HTMLImageElement).src).filter(src => src && src.length > 0)
        );
        allImages.push(...directImages);
        return { images: allImages, navigatedUrls: [] };
      }

      // Obtener todos los elementos rel del dropdown y ordenarlos
      const relElements = await page.$$eval('.dropdown-menu.open [rel]', elements =>
        elements.map(el => el.getAttribute('rel')).filter(rel => rel && rel.length > 0)
      );

      if (relElements.length === 0) {
        this.logger.debug('No se encontraron elementos rel en dropdown-menu');
        return { images: allImages, navigatedUrls: [] };
      }

      // Ordenar elementos rel alfabéticamente
      const sortedRelElements = relElements.sort((a, b) => a.localeCompare(b));
      this.logger.log(`Encontrados ${sortedRelElements.length} elementos rel para navegar (ordenados)`);

      // Navegar por cada rel uno a uno
      const results = await this.navigateAndExtractImages(page, baseUrl, sortedRelElements, '.img-responsive');
      allImages.push(...results.images);
      navigatedUrls.push(...results.navigatedUrls);

      this.logger.log(`Procesamiento ch-images completado. Total imágenes: ${allImages.length}, URLs navegadas: ${navigatedUrls.length}`);

    } catch (error) {
      this.logger.error(`Error procesando ch-images: ${error.message}`);
    }

    return { images: allImages, navigatedUrls: navigatedUrls };
  }

  private async processGeneralDropdowns(
    page: puppeteer.Page, 
    baseUrl: string, 
    customSelectors: string[], 
    sortValues: boolean = true
  ): Promise<{
    images: string[];
    navigatedUrls: string[];
  }> {
    const allImages: string[] = [];
    const navigatedUrls: string[] = [];

    try {
      this.logger.log(`Buscando dropdowns generales en ${baseUrl}`);

      // Selectores por defecto para dropdowns
      const defaultSelectors = [
        '.dropdown',
        '.dropdown-menu',
        '.select-menu',
        '.menu-dropdown',
        '.navigation-dropdown',
        'select',
        '.dropdown-content',
        '.dropdown-list',
        '[role="listbox"]',
        '[role="menu"]'
      ];

      const allSelectors = [...defaultSelectors, ...customSelectors];
      let foundDropdownValues: string[] = [];

      // Buscar en cada tipo de dropdown
      for (const selector of allSelectors) {
        try {
          const dropdownExists = await page.$(selector);
          if (!dropdownExists) continue;

          this.logger.debug(`Dropdown encontrado con selector: ${selector}`);

          // Diferentes estrategias según el tipo de dropdown
          if (selector === 'select') {
            // Para elementos select tradicionales
            const options = await page.$$eval(`${selector} option`, options =>
              options.map(option => option.value || option.textContent?.trim()).filter(val => val && val.length > 0)
            );
            foundDropdownValues.push(...options);
          } else {
            // Para dropdowns personalizados, buscar elementos con atributos comunes
            const dropdownValues = await this.extractDropdownValues(page, selector);
            foundDropdownValues.push(...dropdownValues);
          }

        } catch (error) {
          this.logger.debug(`Error procesando selector ${selector}: ${error.message}`);
        }
      }

      if (foundDropdownValues.length === 0) {
        this.logger.debug('No se encontraron valores en dropdowns');
        return { images: [], navigatedUrls: [] };
      }

      // Eliminar duplicados y ordenar si es necesario
      const uniqueValues = [...new Set(foundDropdownValues)];
      const finalValues = sortValues ? uniqueValues.sort((a, b) => a.localeCompare(b)) : uniqueValues;

      this.logger.log(`Encontrados ${finalValues.length} valores únicos en dropdowns${sortValues ? ' (ordenados)' : ''}`);

      // Navegar por cada valor del dropdown
      const results = await this.navigateAndExtractImages(page, baseUrl, finalValues, 'img');
      allImages.push(...results.images);
      navigatedUrls.push(...results.navigatedUrls);

      this.logger.log(`Procesamiento de dropdowns completado. Total imágenes: ${allImages.length}, URLs navegadas: ${navigatedUrls.length}`);

    } catch (error) {
      this.logger.error(`Error procesando dropdowns: ${error.message}`);
    }

    return { images: allImages, navigatedUrls: navigatedUrls };
  }

  private async extractDropdownValues(page: puppeteer.Page, selector: string): Promise<string[]> {
    const values: string[] = [];

    try {
      // Buscar elementos con atributos rel, value, data-value, href
      const relValues = await page.$$eval(`${selector} [rel]`, elements =>
        elements.map(el => el.getAttribute('rel')).filter(val => val && val.length > 0)
      );
      values.push(...relValues);

      const dataValues = await page.$$eval(`${selector} [data-value]`, elements =>
        elements.map(el => el.getAttribute('data-value')).filter(val => val && val.length > 0)
      );
      values.push(...dataValues);

      const hrefValues = await page.$$eval(`${selector} a[href]`, elements =>
        elements.map(el => {
          const href = el.getAttribute('href');
          if (href && href.startsWith('/')) {
            // Extraer la última parte del path
            const parts = href.split('/').filter(part => part.length > 0);
            return parts[parts.length - 1];
          }
          return href;
        }).filter(val => val && val.length > 0)
      );
      values.push(...hrefValues);

      // También extraer texto de elementos clickeables
      const textValues = await page.$$eval(`${selector} [role="option"], ${selector} li, ${selector} .option`, elements =>
        elements.map(el => el.textContent?.trim()).filter(val => val && val.length > 0 && val.length < 50)
      );
      values.push(...textValues);

    } catch (error) {
      this.logger.debug(`Error extrayendo valores de dropdown ${selector}: ${error.message}`);
    }

    return values;
  }

  private async navigateAndExtractImages(
    page: puppeteer.Page, 
    baseUrl: string, 
    values: string[], 
    imageSelector: string = 'img'
  ): Promise<{
    images: string[];
    navigatedUrls: string[];
  }> {
    const allImages: string[] = [];
    const navigatedUrls: string[] = [];

    for (const value of values) {
      try {
        const currentPath = new URL(page.url()).pathname;
        // Construir URL como base-path/value
        const newUrl = new URL(currentPath.endsWith('/') ? currentPath + value : currentPath + '/' + value, baseUrl).href;
        
        this.logger.log(`Navegando a: ${newUrl}`);
        
        // Navegar a la nueva URL
        await page.goto(newUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Extraer todas las imágenes de esta página
        const pageImages = await page.$$eval(imageSelector, imgs =>
          imgs.map(img => (img as HTMLImageElement).src).filter(src => src && src.length > 0)
        );

        allImages.push(...pageImages);
        navigatedUrls.push(newUrl);

        this.logger.log(`Extraídas ${pageImages.length} imágenes de ${newUrl}`);

        // Pequeña pausa entre navegaciones para no sobrecargar el servidor
        await page.waitForTimeout(500);

      } catch (error) {
        this.logger.warn(`Error navegando a valor "${value}": ${error.message}`);
      }
    }

    return { images: allImages, navigatedUrls: navigatedUrls };
  }

  private shouldProcessUrl(url: string, includePatterns: string[], excludePatterns: string[]): boolean {
    // Verificar patrones de exclusión
    if (excludePatterns.length > 0) {
      for (const pattern of excludePatterns) {
        if (url.includes(pattern)) {
          return false;
        }
      }
    }

    // Verificar patrones de inclusión
    if (includePatterns.length > 0) {
      for (const pattern of includePatterns) {
        if (url.includes(pattern)) {
          return true;
        }
      }
      return false; // Si hay patrones de inclusión y ninguno coincide
    }

    return true; // Si no hay restricciones, procesar la URL
  }

  private async filterLinksByKeywords(
    currentUrl: string, 
    links: string[], 
    includeKeywords: string[], 
    excludeKeywords: string[]
  ): Promise<string[]> {
    // Si hay linkKeywords definidos, SOLO considerar enlaces que los contengan
    if (includeKeywords.length === 0 && excludeKeywords.length === 0) {
      return links;
    }

    const filteredLinks: string[] = [];

    for (const link of links) {
      try {
        // Obtener el texto del enlace para análisis más completo
        const linkText = await this.getLinkText(currentUrl, link);
        const fullLinkContent = `${link} ${linkText}`.toLowerCase();

        // FILTRO ESTRICTO: Si hay linkKeywords, el enlace DEBE contener al menos una
        if (includeKeywords.length > 0) {
          const hasRequiredKeyword = includeKeywords.some(keyword => 
            fullLinkContent.includes(keyword.toLowerCase())
          );
          
          // Si no contiene ninguna palabra clave requerida, OMITIR completamente
          if (!hasRequiredKeyword) {
            this.logger.debug(`Enlace omitido (no contiene keywords requeridas): ${link}`);
            continue;
          }
        }

        // Verificar palabras clave de exclusión (solo si pasó el filtro de inclusión)
        if (excludeKeywords.length > 0) {
          const hasExcludedKeyword = excludeKeywords.some(keyword => 
            fullLinkContent.includes(keyword.toLowerCase())
          );
          if (hasExcludedKeyword) {
            this.logger.debug(`Enlace omitido (contiene keyword excluida): ${link}`);
            continue;
          }
        }

        // Si llegó hasta aquí, el enlace es válido
        filteredLinks.push(link);
        this.logger.debug(`Enlace aceptado: ${link}`);

      } catch (error) {
        this.logger.debug(`Error procesando enlace ${link}: ${error.message}`);
        // En caso de error, OMITIR el enlace si hay restricciones de inclusión
        if (includeKeywords.length === 0) {
          filteredLinks.push(link);
        }
      }
    }

    const totalOriginal = links.length;
    const totalFiltered = filteredLinks.length;
    this.logger.log(`Filtrado de enlaces: ${totalFiltered}/${totalOriginal} enlaces aceptados`);

    return filteredLinks;
  }

  private async getLinkText(currentUrl: string, link: string): Promise<string> {
    try {
      // Intentar obtener el texto del enlace desde la página actual
      const response = await axios.get(currentUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      let linkText = '';

      $(`a[href="${link}"]`).each((_, element) => {
        const text = $(element).text().trim();
        if (text.length > linkText.length) {
          linkText = text;
        }
      });

      return linkText;
    } catch (error) {
      return '';
    }
  }

  private pageMatchesFilterCriteria(
    scrapedData: ScrapedData,
    linkKeywords: string[],
    excludeKeywords: string[],
    includePatterns: string[],
    excludePatterns: string[],
    request?: CrawlRequestDto
  ): boolean {
    const content = JSON.stringify(scrapedData.content).toLowerCase();
    const url = scrapedData.url.toLowerCase();
    const title = (scrapedData.title || '').toLowerCase();
    
    const searchableContent = `${content} ${url} ${title}`;

    // Verificar palabras clave de exclusión de enlaces
    if (excludeKeywords.length > 0) {
      const hasExcludedContent = excludeKeywords.some(keyword => 
        searchableContent.includes(keyword.toLowerCase())
      );
      if (hasExcludedContent) {
        return false;
      }
    }

    // FILTRO ESTRICTO: Si hay linkKeywords, la página DEBE contener al menos una
    if (linkKeywords.length > 0) {
      const hasRequiredKeyword = linkKeywords.some(keyword => 
        searchableContent.includes(keyword.toLowerCase())
      );
      if (!hasRequiredKeyword) {
        this.logger.debug(`Página omitida (no contiene linkKeywords requeridas): ${scrapedData.url}`);
        return false;
      }
    }

    // Verificar patrones de URL
    if (!this.shouldProcessUrl(scrapedData.url, includePatterns, excludePatterns)) {
      return false;
    }

    // ===== NUEVA LÓGICA DE COINCIDENCIAS DE CONTENIDO =====
    if (request) {
      const contentMatches = this.analyzeContentMatches(scrapedData, request);
      if (!contentMatches.isRelevant) {
        this.logger.debug(`Página ${scrapedData.url} no cumple criterios de contenido: ${contentMatches.reason}`);
        return false;
      }
      
      // Agregar información de coincidencias a los metadatos
      if (!scrapedData.metadata) scrapedData.metadata = { responseTime: 0 };
      (scrapedData.metadata as any).contentAnalysis = {
        keywordMatches: contentMatches.keywordMatches,
        patternMatches: contentMatches.patternMatches,
        relevanceScore: contentMatches.relevanceScore,
        totalMatches: contentMatches.totalMatches
      };
    }

    return true;
  }

  private analyzeContentMatches(scrapedData: ScrapedData, request: CrawlRequestDto): {
    isRelevant: boolean;
    reason?: string;
    keywordMatches: string[];
    patternMatches: string[];
    relevanceScore: number;
    totalMatches: number;
  } {
    const {
      contentKeywords = [],
      excludeContentKeywords = [],
      contentPatterns = [],
      minContentMatches = 1,
      contentSearchSelectors = []
    } = request;

    // Si no hay criterios de contenido, considerar relevante
    if (contentKeywords.length === 0 && excludeContentKeywords.length === 0 && contentPatterns.length === 0) {
      return {
        isRelevant: true,
        keywordMatches: [],
        patternMatches: [],
        relevanceScore: 1.0,
        totalMatches: 0
      };
    }

    // Extraer texto para búsqueda
    const searchText = this.extractSearchableText(scrapedData, contentSearchSelectors);
    
    // Verificar palabras clave de exclusión de contenido
    if (excludeContentKeywords.length > 0) {
      const foundExcluded = excludeContentKeywords.filter(keyword => 
        searchText.includes(keyword.toLowerCase())
      );
      
      if (foundExcluded.length > 0) {
        return {
          isRelevant: false,
          reason: `Contiene palabras excluidas: ${foundExcluded.join(', ')}`,
          keywordMatches: [],
          patternMatches: [],
          relevanceScore: 0,
          totalMatches: 0
        };
      }
    }

    // Buscar coincidencias de palabras clave
    const keywordMatches = contentKeywords.filter(keyword => 
      searchText.includes(keyword.toLowerCase())
    );

    // Buscar coincidencias de patrones
    const patternMatches: string[] = [];
    for (const pattern of contentPatterns) {
      try {
        const regex = new RegExp(pattern, 'gi');
        const matches = searchText.match(regex);
        if (matches) {
          patternMatches.push(...matches);
        }
      } catch (error) {
        this.logger.warn(`Error en patrón regex "${pattern}": ${error.message}`);
      }
    }

    const totalMatches = keywordMatches.length + patternMatches.length;
    
    // Verificar si cumple el mínimo de coincidencias
    if (contentKeywords.length > 0 && keywordMatches.length < minContentMatches) {
      return {
        isRelevant: false,
        reason: `Insuficientes coincidencias de palabras clave: ${keywordMatches.length}/${minContentMatches} requeridas`,
        keywordMatches,
        patternMatches,
        relevanceScore: totalMatches / Math.max(contentKeywords.length + contentPatterns.length, 1),
        totalMatches
      };
    }

    // Calcular puntuación de relevancia
    const maxPossibleMatches = contentKeywords.length + contentPatterns.length;
    const relevanceScore = maxPossibleMatches > 0 ? totalMatches / maxPossibleMatches : 1.0;

    this.logger.log(`Página relevante encontrada: ${scrapedData.url} (${totalMatches} coincidencias, score: ${relevanceScore.toFixed(2)})`);

    return {
      isRelevant: true,
      keywordMatches,
      patternMatches,
      relevanceScore,
      totalMatches
    };
  }

  private extractSearchableText(scrapedData: ScrapedData, selectors: string[]): string {
    let searchableText = '';

    // Si hay selectores específicos, usar solo esos
    if (selectors.length > 0) {
      for (const selector of selectors) {
        if (scrapedData.content[selector]) {
          const selectorContent = scrapedData.content[selector];
          if (Array.isArray(selectorContent)) {
            searchableText += ' ' + selectorContent.map(item => 
              typeof item === 'object' ? (item.text || '') : String(item)
            ).join(' ');
          } else {
            searchableText += ' ' + String(selectorContent);
          }
        }
      }
    } else {
      // Usar todo el contenido disponible
      searchableText = JSON.stringify(scrapedData.content);
    }

    // Agregar título y URL para búsqueda más completa
    searchableText += ' ' + (scrapedData.title || '');
    searchableText += ' ' + scrapedData.url;

    return searchableText.toLowerCase();
  }

  private calculateContentStatistics(pages: ScrapedData[], request: CrawlRequestDto): {
    totalKeywordMatches: number;
    totalPatternMatches: number;
    averageRelevanceScore: number;
    pagesWithContent: number;
    topKeywords: { keyword: string; count: number }[];
    topPatterns: { pattern: string; count: number }[];
  } {
    const keywordCounts = new Map<string, number>();
    const patternCounts = new Map<string, number>();
    let totalKeywordMatches = 0;
    let totalPatternMatches = 0;
    let totalRelevanceScore = 0;
    let pagesWithContent = 0;

    for (const page of pages) {
      const analysis = (page.metadata as any)?.contentAnalysis;
      if (analysis) {
        pagesWithContent++;
        totalKeywordMatches += analysis.keywordMatches.length;
        totalPatternMatches += analysis.patternMatches.length;
        totalRelevanceScore += analysis.relevanceScore;

        // Contar palabras clave
        for (const keyword of analysis.keywordMatches) {
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
        }

        // Contar patrones
        for (const pattern of analysis.patternMatches) {
          patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
        }
      }
    }

    // Ordenar y obtener top keywords
    const topKeywords = Array.from(keywordCounts.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Ordenar y obtener top patterns
    const topPatterns = Array.from(patternCounts.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageRelevanceScore = pagesWithContent > 0 ? totalRelevanceScore / pagesWithContent : 0;

    return {
      totalKeywordMatches,
      totalPatternMatches,
      averageRelevanceScore,
      pagesWithContent,
      topKeywords,
      topPatterns
    };
  }

  private resolveUrl(url: string, baseUrl: string): string | null {
    try {
      return new URL(url, baseUrl).href;
    } catch (error) {
      this.logger.debug(`Error resolviendo URL ${url} con base ${baseUrl}: ${error.message}`);
      return null;
    }
  }

  // Método para simular comportamiento humano en sitios problemáticos
  private async simulateHumanBehavior(page: puppeteer.Page): Promise<void> {
    try {
      // Simular movimientos de mouse aleatorios
      const viewport = page.viewport();
      if (viewport) {
        const randomX = Math.floor(Math.random() * viewport.width);
        const randomY = Math.floor(Math.random() * viewport.height);
        await page.mouse.move(randomX, randomY);
        await this.randomDelay(100, 500);
      }

      // Simular scroll aleatorio
      const scrollDistance = Math.floor(Math.random() * 300) + 100;
      await page.evaluate((distance) => {
        window.scrollBy(0, distance);
      }, scrollDistance);
      
      await this.randomDelay(500, 1000);

      // Simular scroll hacia arriba ocasionalmente
      if (Math.random() > 0.7) {
        await page.evaluate(() => {
          window.scrollBy(0, -150);
        });
        await this.randomDelay(200, 500);
      }

    } catch (error) {
      this.logger.debug(`Error simulando comportamiento humano: ${error.message}`);
    }
  }
} 