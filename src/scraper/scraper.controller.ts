import { Controller, Post, Body, Get, HttpCode, HttpStatus, Res, Header, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ScraperService, ScrapedData, CrawledData, JobStatus } from './scraper.service';
import { ScrapeRequestDto, CrawlRequestDto } from './dto/scrape-request.dto';
import { ExportExcelRequestDto } from './dto/export-request.dto';
import { ExcelExportService } from './services/excel-export.service';

@ApiTags('scraper')
@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly excelExportService: ExcelExportService
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar estado del servicio' })
  @ApiResponse({ status: 200, description: 'Servicio funcionando correctamente' })
  health() {
    return {
      status: 'OK',
      message: 'Servicio de web scraping funcionando correctamente',
      timestamp: new Date().toISOString()
    };
  }

  @Post('scrape')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Hacer scraping de una URL específica',
    description: 'Extrae datos de una página web específica usando selectores CSS opcionales'
  })
  @ApiBody({ type: ScrapeRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Datos extraídos exitosamente',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://example.com' },
        title: { type: 'string', example: 'Título de la página' },
        content: { 
          type: 'object',
          description: 'Contenido extraído basado en selectores'
        },
        links: { 
          type: 'array',
          items: { type: 'string' },
          example: ['https://example.com/page1', 'https://example.com/page2']
        },
        images: {
          type: 'array', 
          items: { type: 'string' },
          example: ['https://example.com/image1.jpg', 'https://example.com/image2.png']
        },
        timestamp: { type: 'string', format: 'date-time' },
        metadata: {
          type: 'object',
          properties: {
            responseTime: { type: 'number', example: 1500 },
            statusCode: { type: 'number', example: 200 },
            contentType: { type: 'string', example: 'text/html' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async scrapeUrl(@Body() scrapeRequest: ScrapeRequestDto): Promise<ScrapedData> {
    return this.scraperService.scrapeUrl(scrapeRequest);
  }

  @Post('crawl')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Realizar crawling inteligente de un sitio web (síncrono)',
    description: 'Navega por múltiples páginas siguiendo SOLO enlaces que contengan las palabras clave especificadas (linkKeywords). Si se definen linkKeywords, todos los demás enlaces serán omitidos completamente. Incluye análisis de contenido, detección de dropdowns y procesamiento especializado. NOTA: Para sitios grandes, use /crawl-async para mejor rendimiento.'
  })
  @ApiBody({ type: CrawlRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Crawling completado exitosamente',
    schema: {
      type: 'object',
      properties: {
        baseUrl: { type: 'string', example: 'https://example.com' },
        pages: {
          type: 'array',
          description: 'Array de páginas scrapeadas'
        },
        summary: {
          type: 'object',
          properties: {
            totalPages: { type: 'number', example: 15 },
            totalLinks: { type: 'number', example: 150 },
            totalImages: { type: 'number', example: 45 },
            crawlDuration: { type: 'number', example: 30000 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async crawlWebsite(@Body() crawlRequest: CrawlRequestDto): Promise<CrawledData> {
    return this.scraperService.crawlWebsite(crawlRequest);
  }

  @Post('crawl-async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ 
    summary: 'Iniciar crawling asíncrono de un sitio web',
    description: 'Inicia un proceso de crawling en background y devuelve inmediatamente un jobId para consultar el progreso. Recomendado para sitios grandes o procesos que pueden tomar mucho tiempo.'
  })
  @ApiBody({ type: CrawlRequestDto })
  @ApiResponse({ 
    status: 202, 
    description: 'Crawling iniciado exitosamente',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', example: 'crawl_1640995200000_abc123def' },
        message: { type: 'string', example: 'Crawling iniciado. Use el jobId para consultar el progreso.' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async startAsyncCrawl(@Body() crawlRequest: CrawlRequestDto): Promise<{ jobId: string; message: string }> {
    return this.scraperService.startAsyncCrawl(crawlRequest);
  }

  @Get('job/:jobId')
  @ApiOperation({ 
    summary: 'Consultar estado de un job de crawling',
    description: 'Obtiene el estado actual, progreso y resultado (si está disponible) de un job de crawling asíncrono'
  })
  @ApiParam({ name: 'jobId', description: 'ID del job a consultar', example: 'crawl_1640995200000_abc123def' })
  @ApiResponse({ 
    status: 200, 
    description: 'Estado del job obtenido exitosamente',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed'] },
        progress: {
          type: 'object',
          properties: {
            currentPage: { type: 'number' },
            totalPages: { type: 'number' },
            filteredPages: { type: 'number' },
            currentUrl: { type: 'string' },
            message: { type: 'string' }
          }
        },
        result: { type: 'object', description: 'Resultado del crawling (disponible cuando status = completed)' },
        error: { type: 'string', description: 'Mensaje de error (disponible cuando status = failed)' },
        startTime: { type: 'string', format: 'date-time' },
        endTime: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Job no encontrado' })
  getJobStatus(@Param('jobId') jobId: string): JobStatus | null {
    const job = this.scraperService.getJobStatus(jobId);
    if (!job) {
      return null;
    }
    return job;
  }

  @Get('jobs')
  @ApiOperation({ 
    summary: 'Listar todos los jobs de crawling',
    description: 'Obtiene una lista de todos los jobs de crawling con su estado actual'
  })
  @ApiQuery({ name: 'status', required: false, description: 'Filtrar por estado específico', enum: ['pending', 'running', 'completed', 'failed'] })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de jobs obtenida exitosamente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          status: { type: 'string' },
          progress: { type: 'object' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' }
        }
      }
    }
  })
  getAllJobs(@Query('status') status?: string): JobStatus[] {
    const jobs = this.scraperService.getAllJobs();
    if (status) {
      return jobs.filter(job => job.status === status);
    }
    return jobs;
  }

  @Post('jobs/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Limpiar jobs completados',
    description: 'Elimina jobs completados o fallidos que tengan más de 1 hora de antigüedad'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Limpieza completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Jobs limpiados exitosamente' }
      }
    }
  })
  cleanupJobs(): { message: string } {
    this.scraperService.cleanupCompletedJobs();
    return { message: 'Jobs limpiados exitosamente' };
  }

  @Post('export-excel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Exportar análisis completo del sitio web a Excel',
    description: 'Realiza crawling del sitio web y genera un archivo Excel con representación en árbol del sitio filtrado y análisis detallado de cada página en pestañas separadas'
  })
  @ApiBody({ type: ExportExcelRequestDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Archivo Excel generado exitosamente',
    headers: {
      'Content-Type': {
        description: 'Tipo de contenido del archivo Excel',
        schema: { type: 'string', example: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      },
      'Content-Disposition': {
        description: 'Disposición del contenido para descarga',
        schema: { type: 'string', example: 'attachment; filename="sitemap-analysis-2024-01-15.xlsx"' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Petición inválida' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportToExcel(
    @Body() exportRequest: ExportExcelRequestDto,
    @Res() res: Response
  ): Promise<void> {
    // Realizar crawling usando los parámetros de exportación
    const crawlData = await this.scraperService.crawlWebsite({
      baseUrl: exportRequest.baseUrl,
      maxDepth: exportRequest.maxDepth,
      maxPages: exportRequest.maxPages,
      linkKeywords: exportRequest.linkKeywords,
      excludeKeywords: exportRequest.excludeKeywords,
      targetFilteredPages: exportRequest.targetFilteredPages,
      selectors: exportRequest.selectors
    });

    // Generar archivo Excel
    const excelData = await this.excelExportService.exportCrawlDataToExcel(
      crawlData,
      exportRequest.includeDetailedAnalysis !== false,
      exportRequest.fileName || 'sitemap-analysis'
    );

    // Configurar headers para descarga
    res.set({
      'Content-Type': excelData.contentType,
      'Content-Disposition': `attachment; filename="${excelData.fileName}"`
    });

    // Enviar el archivo
    res.send(excelData.buffer);
  }
} 