import { IsString, IsUrl, IsOptional, IsArray, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExportExcelRequestDto {
  @ApiProperty({
    description: 'URL base para iniciar el crawling y exportar a Excel',
    example: 'https://blog.example.com'
  })
  @IsUrl({}, { message: 'Debe ser una URL válida' })
  baseUrl: string;

  @ApiPropertyOptional({
    description: 'Profundidad máxima del crawling',
    default: 2,
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  maxDepth?: number;

  @ApiPropertyOptional({
    description: 'Número máximo de páginas a procesar',
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPages?: number;

  @ApiPropertyOptional({
    description: 'Frases que deben contener los enlaces para ser incluidos en el reporte',
    example: ['blog', 'artículo', 'post', 'noticia']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Frases que deben excluirse de los enlaces',
    example: ['admin', 'login', 'register', 'delete']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Número objetivo de páginas filtradas para el reporte',
    default: 0,
    minimum: 0,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  targetFilteredPages?: number;

  @ApiPropertyOptional({
    description: 'Selectores CSS para extraer datos específicos en cada página',
    example: ['h1', '.content', '.author', '.publish-date']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectors?: string[];

  @ApiPropertyOptional({
    description: 'Incluir análisis detallado de contenido en pestañas separadas',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  includeDetailedAnalysis?: boolean;

  @ApiPropertyOptional({
    description: 'Nombre del archivo Excel a generar',
    default: 'sitemap-analysis'
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({
    description: 'Descargar automáticamente las imágenes encontradas',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  downloadImages?: boolean;

  @ApiPropertyOptional({
    description: 'Explorar automáticamente enlaces en listados',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  exploreLists?: boolean;

  @ApiPropertyOptional({
    description: 'Crear subdirectorios por página para las imágenes',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  createImageSubdirectories?: boolean;

  @ApiPropertyOptional({
    description: 'Procesar elementos ch-images con navegación por dropdown-menu',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  processChImages?: boolean;

  @ApiPropertyOptional({
    description: 'Tiempo de espera para elementos ch-images (en milisegundos)',
    default: 10000
  })
  @IsOptional()
  @IsNumber()
  chImagesTimeout?: number;
} 