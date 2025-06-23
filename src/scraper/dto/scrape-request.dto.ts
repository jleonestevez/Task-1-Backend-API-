import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUrl, IsOptional, IsBoolean, IsNumber, Min, Max, IsArray, IsString } from 'class-validator';

export class ScrapeRequestDto {
  @ApiProperty({
    description: 'URL del sitio web a hacer scraping',
    example: 'https://example.com'
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Selectores CSS para extraer contenido específico',
    example: ['h1', '.content', '#main-article']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectors?: string[];

  @ApiPropertyOptional({
    description: 'Ejecutar JavaScript en la página antes del scraping',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  executeJavaScript?: boolean;

  @ApiPropertyOptional({
    description: 'Tiempo de espera en milisegundos después de cargar la página',
    default: 1000,
    minimum: 0,
    maximum: 10000
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  waitTime?: number;

  @ApiPropertyOptional({
    description: 'Headers HTTP personalizados',
    example: { 'Authorization': 'Bearer token123' }
  })
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Detectar y explorar automáticamente enlaces en listados (ul, ol, nav, .menu, etc.)',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  exploreLists?: boolean;

  @ApiPropertyOptional({
    description: 'Selectores CSS adicionales para detectar listados personalizados',
    example: ['.menu', '.navigation', '.sidebar-links', '.category-list']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listSelectors?: string[];
}

export class CrawlRequestDto {
  @ApiProperty({
    description: 'URL base del sitio web para iniciar el crawling',
    example: 'https://example.com'
  })
  @IsUrl()
  baseUrl: string;

  @ApiPropertyOptional({
    description: 'Profundidad máxima de crawling',
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
    default: 10,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxPages?: number;

  @ApiPropertyOptional({
    description: 'Patrones de URL que deben incluirse en el crawling',
    example: ['/products/', '/categories/']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Patrones de URL que deben excluirse del crawling',
    example: ['/admin/', '/login/', '.pdf']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Selectores CSS para extraer contenido específico',
    example: ['h1', '.content', '#main-article']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectors?: string[];

  @ApiPropertyOptional({
    description: 'Palabras clave que deben contener los enlaces para ser seguidos durante el crawling',
    example: ['producto', 'categoria', 'articulo']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Palabras clave que deben ser excluidas de los enlaces durante el crawling',
    example: ['admin', 'login', 'logout', 'password']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Número objetivo de páginas filtradas exitosas para detener la búsqueda automáticamente',
    default: 0,
    minimum: 0,
    maximum: 50,
    example: 15
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  targetFilteredPages?: number;

  @ApiPropertyOptional({
    description: 'Descargar automáticamente las imágenes encontradas en directorios organizados',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  downloadImages?: boolean;

  @ApiPropertyOptional({
    description: 'Detectar y explorar automáticamente enlaces en listados (ul, ol, nav, .menu, etc.)',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  exploreLists?: boolean;

  @ApiPropertyOptional({
    description: 'Selectores CSS adicionales para detectar listados personalizados',
    example: ['.menu', '.navigation', '.sidebar-links', '.category-list']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  listSelectors?: string[];

  @ApiPropertyOptional({
    description: 'Crear subdirectorios por página para organizar las imágenes descargadas',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  createImageSubdirectories?: boolean;

  @ApiPropertyOptional({
    description: 'Esperar y procesar elementos ch-images con navegación por dropdown-menu',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  processChImages?: boolean;

  @ApiPropertyOptional({
    description: 'Tiempo de espera máximo para que aparezcan elementos ch-images (en milisegundos)',
    default: 10000,
    minimum: 1000,
    maximum: 30000
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(30000)
  chImagesTimeout?: number;

  @ApiPropertyOptional({
    description: 'Detectar y procesar automáticamente dropdowns generales (no solo ch-images)',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  processDropdowns?: boolean;

  @ApiPropertyOptional({
    description: 'Selectores CSS personalizados para detectar dropdowns',
    example: ['.dropdown', '.select-menu', '.menu-dropdown', '.navigation-dropdown']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dropdownSelectors?: string[];

  @ApiPropertyOptional({
    description: 'Ordenar los valores del dropdown antes de navegar (alfabético)',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  sortDropdownValues?: boolean;

  @ApiPropertyOptional({
    description: 'Palabras clave que debe contener el contenido de la página para considerarla relevante',
    example: ['react', 'javascript', 'tutorial', 'programación']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Palabras clave que si están presentes en el contenido, excluyen la página',
    example: ['error 404', 'página no encontrada', 'acceso denegado']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeContentKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Buscar contenido que coincida con patrones específicos (regex permitido)',
    example: ['email.*@.*\\.com', 'precio.*\\$\\d+', 'fecha.*\\d{2}/\\d{2}/\\d{4}']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentPatterns?: string[];

  @ApiPropertyOptional({
    description: 'Número mínimo de coincidencias de palabras clave requeridas para considerar la página relevante',
    default: 1,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  minContentMatches?: number;

  @ApiPropertyOptional({
    description: 'Buscar solo en elementos específicos del contenido (por defecto busca en todo)',
    example: ['p', '.content', '.article-body', 'h1', 'h2', 'h3']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contentSearchSelectors?: string[];
} 