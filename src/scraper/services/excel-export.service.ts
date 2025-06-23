import { Injectable, Logger } from '@nestjs/common';
import { Workbook, Worksheet } from 'exceljs';
import { ScrapedData, CrawledData } from '../scraper.service';

export interface SiteTreeNode {
  url: string;
  title: string;
  depth: number;
  parentUrl?: string;
  children: SiteTreeNode[];
  isFiltered: boolean;
  metadata: {
    statusCode?: number;
    responseTime: number;
    linksCount: number;
    imagesCount: number;
  };
}

export interface ExcelExportData {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  async exportCrawlDataToExcel(
    crawlData: CrawledData,
    includeDetailedAnalysis: boolean = true,
    fileName: string = 'sitemap-analysis'
  ): Promise<ExcelExportData> {
    try {
      const workbook = new Workbook();
      
      // Configurar propiedades del workbook
      workbook.creator = 'Web Scraper API';
      workbook.created = new Date();
      workbook.modified = new Date();
      workbook.lastPrinted = new Date();

      // Crear estructura de árbol
      const siteTree = this.buildSiteTree(crawlData);
      
      // Crear hoja principal con árbol del sitio
      await this.createSiteTreeWorksheet(workbook, siteTree, crawlData);
      
      // Crear hoja de resumen
      await this.createSummaryWorksheet(workbook, crawlData, siteTree);

      // Crear pestañas detalladas para cada página filtrada
      if (includeDetailedAnalysis) {
        await this.createDetailedAnalysisWorksheets(workbook, crawlData);
      }

      // Generar buffer del archivo Excel
      const buffer = await workbook.xlsx.writeBuffer();
      
      return {
        buffer: Buffer.from(buffer),
        fileName: `${fileName}-${new Date().toISOString().split('T')[0]}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };

    } catch (error) {
      this.logger.error('Error al exportar datos a Excel:', error);
      throw new Error(`Error al generar archivo Excel: ${error.message}`);
    }
  }

  private buildSiteTree(crawlData: CrawledData): SiteTreeNode[] {
    const urlToNodeMap = new Map<string, SiteTreeNode>();
    const rootNodes: SiteTreeNode[] = [];

    // Crear nodos para todas las páginas
    for (const page of crawlData.pages) {
      const node: SiteTreeNode = {
        url: page.url,
        title: page.title || this.extractTitleFromUrl(page.url),
        depth: this.calculateDepth(page.url, crawlData.baseUrl),
        children: [],
        isFiltered: true, // Todas las páginas en crawlData ya están filtradas
        metadata: {
          statusCode: page.metadata?.statusCode,
          responseTime: page.metadata?.responseTime || 0,
          linksCount: page.links?.length || 0,
          imagesCount: page.images?.length || 0
        }
      };
      urlToNodeMap.set(page.url, node);
    }

    // Construir relaciones padre-hijo basándose en enlaces
    for (const page of crawlData.pages) {
      const currentNode = urlToNodeMap.get(page.url);
      if (!currentNode) continue;

      if (page.links) {
        for (const link of page.links) {
          const absoluteLink = this.resolveUrl(link, page.url);
          const childNode = urlToNodeMap.get(absoluteLink);
          
          if (childNode && childNode !== currentNode) {
            // Evitar ciclos
            if (!this.wouldCreateCycle(currentNode, childNode)) {
              childNode.parentUrl = currentNode.url;
              currentNode.children.push(childNode);
            }
          }
        }
      }
    }

    // Identificar nodos raíz (sin padre o cuyo padre no está en el conjunto)
    for (const node of urlToNodeMap.values()) {
      if (!node.parentUrl || !urlToNodeMap.has(node.parentUrl)) {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  private async createSiteTreeWorksheet(workbook: Workbook, siteTree: SiteTreeNode[], crawlData: CrawledData): Promise<void> {
    const worksheet = workbook.addWorksheet('🌳 Árbol del Sitio');
    
    // Configurar columnas
    worksheet.columns = [
      { header: 'Nivel', key: 'level', width: 8 },
      { header: 'Estructura', key: 'structure', width: 60 },
      { header: 'URL', key: 'url', width: 80 },
      { header: 'Título', key: 'title', width: 40 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Tiempo (ms)', key: 'responseTime', width: 12 },
      { header: 'Enlaces', key: 'links', width: 10 },
      { header: 'Imágenes', key: 'images', width: 10 }
    ];

    // Estilo de encabezados
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '366092' } };

    let rowIndex = 2;

    // Función recursiva para agregar nodos al worksheet
    const addNodeToWorksheet = (node: SiteTreeNode, level: number, prefix: string = '') => {
      const indent = '  '.repeat(level);
      const structure = `${prefix}${node.title}`;
      
      worksheet.addRow({
        level: level,
        structure: `${indent}${structure}`,
        url: node.url,
        title: node.title,
        status: node.metadata.statusCode || 'OK',
        responseTime: node.metadata.responseTime,
        links: node.metadata.linksCount,
        images: node.metadata.imagesCount
      });

      // Colorear filas según filtrado
      const currentRow = worksheet.getRow(rowIndex);
      if (node.isFiltered) {
        currentRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E8F5E8' } };
      }

      rowIndex++;

      // Agregar hijos
      node.children.forEach((child, index) => {
        const isLast = index === node.children.length - 1;
        const childPrefix = isLast ? '└── ' : '├── ';
        addNodeToWorksheet(child, level + 1, childPrefix);
      });
    };

    // Agregar nodos raíz
    siteTree.forEach(rootNode => {
      addNodeToWorksheet(rootNode, 0);
    });

    // Autoajustar columnas
    worksheet.columns.forEach(column => {
      if (column.key !== 'structure') {
        column.width = Math.max(column.width || 10, 15);
      }
    });

    // Agregar filtros
    worksheet.autoFilter = {
      from: 'A1',
      to: `H${rowIndex - 1}`
    };
  }

  private async createSummaryWorksheet(workbook: Workbook, crawlData: CrawledData, siteTree: SiteTreeNode[]): Promise<void> {
    const worksheet = workbook.addWorksheet('📊 Resumen');

    // Título principal
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = 'Reporte de Análisis del Sitio Web';
    worksheet.getCell('A1').font = { size: 18, bold: true };
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    let row = 3;

    // Información general
    worksheet.getCell(`A${row}`).value = 'URL Base:';
    worksheet.getCell(`A${row}`).font = { bold: true };
    worksheet.getCell(`B${row}`).value = crawlData.baseUrl;
    row++;

    worksheet.getCell(`A${row}`).value = 'Fecha del Análisis:';
    worksheet.getCell(`A${row}`).font = { bold: true };
    worksheet.getCell(`B${row}`).value = new Date().toLocaleString('es-ES');
    row += 2;

    // Estadísticas del crawling
    worksheet.getCell(`A${row}`).value = 'Estadísticas del Crawling';
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const stats = [
      ['Total de Páginas Procesadas:', crawlData.summary.totalPages],
      ['Páginas Filtradas (Relevantes):', crawlData.summary.filteredPages],
      ['Objetivo de Páginas:', crawlData.summary.targetFilteredPages || 'Sin límite'],
      ['Objetivo Alcanzado:', crawlData.summary.reachedTarget ? 'Sí' : 'No'],
      ['Total de Enlaces Encontrados:', crawlData.summary.totalLinks],
      ['Total de Imágenes Encontradas:', crawlData.summary.totalImages],
      ['Duración del Crawling (ms):', crawlData.summary.crawlDuration]
    ];

    stats.forEach(([label, value]) => {
      worksheet.getCell(`A${row}`).value = label;
      worksheet.getCell(`A${row}`).font = { bold: true };
      worksheet.getCell(`B${row}`).value = value;
      row++;
    });

    row += 2;

    // Análisis de profundidad
    worksheet.getCell(`A${row}`).value = 'Análisis por Profundidad';
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
    row++;

    const depthAnalysis = this.analyzeDepth(siteTree);
    worksheet.getCell(`A${row}`).value = 'Nivel';
    worksheet.getCell(`A${row}`).font = { bold: true };
    worksheet.getCell(`B${row}`).value = 'Páginas';
    worksheet.getCell(`B${row}`).font = { bold: true };
    row++;

    Object.entries(depthAnalysis).forEach(([depth, count]) => {
      worksheet.getCell(`A${row}`).value = `Nivel ${depth}`;
      worksheet.getCell(`B${row}`).value = count;
      row++;
    });

    // Autoajustar columnas
    worksheet.columns = [
      { width: 30 },
      { width: 40 },
      { width: 20 },
      { width: 20 }
    ];
  }

  private async createDetailedAnalysisWorksheets(workbook: Workbook, crawlData: CrawledData): Promise<void> {
    let sheetCounter = 1;
    
    for (const page of crawlData.pages) {
      // Limitar nombre de pestaña a 31 caracteres (límite de Excel)
      const safeName = this.createSafeSheetName(page.title || page.url, sheetCounter);
      const worksheet = workbook.addWorksheet(safeName);

      // Título de la página
      worksheet.mergeCells('A1:C1');
      worksheet.getCell('A1').value = page.title || 'Sin Título';
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      let row = 3;

      // Información básica
      const basicInfo = [
        ['URL:', page.url],
        ['Título:', page.title || 'Sin título'],
        ['Fecha de Análisis:', page.timestamp.toLocaleString('es-ES')],
        ['Tiempo de Respuesta (ms):', page.metadata?.responseTime || 'N/A'],
        ['Código de Estado:', page.metadata?.statusCode || 'N/A'],
        ['Tipo de Contenido:', page.metadata?.contentType || 'N/A']
      ];

      worksheet.getCell(`A${row}`).value = 'Información General';
      worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
      row++;

      basicInfo.forEach(([label, value]) => {
        worksheet.getCell(`A${row}`).value = label;
        worksheet.getCell(`A${row}`).font = { bold: true };
        worksheet.getCell(`B${row}`).value = value;
        row++;
      });

      row += 2;

      // Contenido extraído
      if (page.content && Object.keys(page.content).length > 0) {
        worksheet.getCell(`A${row}`).value = 'Contenido Extraído';
        worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
        row++;

        Object.entries(page.content).forEach(([selector, content]) => {
          worksheet.getCell(`A${row}`).value = `Selector: ${selector}`;
          worksheet.getCell(`A${row}`).font = { bold: true };
          row++;

          if (Array.isArray(content)) {
            content.forEach((item, index) => {
              worksheet.getCell(`B${row}`).value = `${index + 1}. ${item}`;
              row++;
            });
          } else {
            worksheet.getCell(`B${row}`).value = String(content);
            row++;
          }
          row++;
        });
      }

      // Enlaces encontrados
      if (page.links && page.links.length > 0) {
        worksheet.getCell(`A${row}`).value = `Enlaces Encontrados (${page.links.length})`;
        worksheet.getCell(`A${row}`).font = { size: 14, bold: true };
        row++;

        page.links.slice(0, 50).forEach((link, index) => { // Limitar a 50 enlaces
          worksheet.getCell(`A${row}`).value = `${index + 1}.`;
          worksheet.getCell(`B${row}`).value = link;
          row++;
        });

        if (page.links.length > 50) {
          worksheet.getCell(`B${row}`).value = `... y ${page.links.length - 50} enlaces más`;
          row++;
        }
      }

      // Autoajustar columnas
      worksheet.columns = [
        { width: 20 },
        { width: 80 },
        { width: 20 }
      ];

      sheetCounter++;
    }
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      return pathParts.length > 0 ? pathParts[pathParts.length - 1] : urlObj.hostname;
    } catch {
      return url;
    }
  }

  private calculateDepth(url: string, baseUrl: string): number {
    try {
      const baseUrlObj = new URL(baseUrl);
      const urlObj = new URL(url);
      
      if (urlObj.hostname !== baseUrlObj.hostname) {
        return 0; // URL externa
      }

      const baseParts = baseUrlObj.pathname.split('/').filter(part => part.length > 0);
      const urlParts = urlObj.pathname.split('/').filter(part => part.length > 0);
      
      return Math.max(0, urlParts.length - baseParts.length);
    } catch {
      return 0;
    }
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  private wouldCreateCycle(parentNode: SiteTreeNode, childNode: SiteTreeNode): boolean {
    let current = parentNode;
    while (current.parentUrl) {
      if (current.parentUrl === childNode.url) {
        return true;
      }
      // Buscar el nodo padre
      // En una implementación más robusta, mantendríamos una referencia al mapa
      break;
    }
    return false;
  }

  private analyzeDepth(siteTree: SiteTreeNode[]): Record<string, number> {
    const depthCount: Record<string, number> = {};

    const countDepth = (nodes: SiteTreeNode[], currentDepth: number = 0) => {
      nodes.forEach(node => {
        const depth = currentDepth.toString();
        depthCount[depth] = (depthCount[depth] || 0) + 1;
        countDepth(node.children, currentDepth + 1);
      });
    };

    countDepth(siteTree);
    return depthCount;
  }

  private createSafeSheetName(name: string, counter: number): string {
    // Limpiar caracteres no válidos para nombres de hojas de Excel
    const cleanName = name
      .replace(/[\\\/\[\]:*?]/g, '')
      .substring(0, 25); // Dejar espacio para el contador

    return `${counter}. ${cleanName}`.substring(0, 31);
  }
} 