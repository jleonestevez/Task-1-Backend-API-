# Task-1-Backend-API - Proyecto de Ejemplo de Web Scraping

## Descripción

Este es un proyecto de ejemplo desarrollado con **JetBrains AI Assistant (Air IDE)** que demuestra las capacidades de web scraping y crawling automatizado. El proyecto implementa una API backend robusta para la extracción automatizada de contenido web, con enfoque especial en la descarga de imágenes de capítulos de manga.

## Características del Proyecto

### Tecnologías Utilizadas
- **Framework**: NestJS (Node.js)
- **Web Scraping**: Puppeteer, Cheerio
- **HTTP Client**: Axios
- **Validación**: Class-validator, Class-transformer
- **Documentos**: ExcelJS
- **Utilidades**: fs-extra, crawl4ai

### Funcionalidades Principales

1. **Web Scraping Básico**
   - Extracción de contenido HTML con selectores CSS
   - Procesamiento de datos estructurados
   - Manejo de errores y timeouts

2. **Crawling Avanzado**
   - Navegación automatizada por sitios web
   - Control de profundidad de crawling
   - Filtrado por frases objetivo
   - Límite de páginas procesadas

3. **Automatización con Puppeteer**
   - Renderizado completo de páginas JavaScript
   - Detección automática de elementos dinámicos
   - Navegación por dropdowns y menús
   - Descarga masiva de imágenes

## Objetivo del Proyecto

Este proyecto sirve como **demostración técnica** de las capacidades modernas de web scraping, mostrando:

- Implementación de APIs RESTful para scraping
- Manejo de contenido dinámico con Puppeteer
- Procesamiento automatizado de sitios web complejos
- Descarga y organización de recursos multimedia

> **Nota**: Este es un proyecto de ejemplo generado con el **IDE Air de JetBrains**, diseñado para fines educativos y de demostración técnica.

## Ejemplo de Uso: Crawler para Manga

El sistema incluye un crawler especializado para descargar capítulos (imágenes) de manga de sitios como **anzmanga** o similares.

### Configuración de Ejemplo

```json
{
  "url": "https://www.anzmanga25.com/manga/one-piece",
  "maxDepth": 3,
  "targetPhrases": ["one piece"],
  "maxFilteredPages": 5
}
```

### Endpoints Disponibles

#### POST `/scraper/crawl`
Inicia el proceso de crawling con los parámetros especificados:

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.anzmanga25.com/manga/one-piece",
    "maxDepth": 3,
    "targetPhrases": ["one piece"],
    "maxFilteredPages": 5
  }'
```

#### GET `/scraper/quick-scrape`
Scraping rápido de una URL específica:

```bash
curl "http://localhost:3000/scraper/quick-scrape?url=https://example.com&selector=.content"
```

### Proceso de Descarga

El crawler realiza las siguientes operaciones:

1. **Análisis Inicial**: Examina la estructura del sitio web
2. **Detección de Capítulos**: Identifica enlaces a capítulos individuales
3. **Navegación Automatizada**: Accede a cada capítulo secuencialmente
4. **Extracción de Imágenes**: Descarga todas las imágenes del capítulo
5. **Organización**: Estructura los archivos por capítulo y página

### Ubicación de Archivos Descargados

Las imágenes descargadas se almacenan en:

```
/output/images_[timestamp]/
├── page_1_rel_1_img_1_[timestamp].jpg
├── page_1_rel_1_img_2_[timestamp].jpg
├── page_1_rel_2_img_1_[timestamp].jpg
└── ...
```

**Estructura de Nomenclatura:**
- `page_X`: Número de página procesada
- `rel_Y`: Número de relación/capítulo
- `img_Z`: Número de imagen dentro del capítulo
- `[timestamp]`: Marca temporal de descarga

## Instalación y Uso

### Requisitos Previos
- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone [repository-url]

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run start:dev
```

### Scripts Disponibles

```bash
npm run build          # Compilar proyecto
npm run start         # Iniciar en producción
npm run start:dev     # Iniciar en desarrollo
npm run test          # Ejecutar tests
npm run lint          # Linter de código
```

## Consideraciones Importantes

### Aspectos Técnicos
- **Viewport Configurado**: 1920x1080 para simular navegador de escritorio
- **Timeouts Inteligentes**: Espera a que el contenido se cargue completamente
- **Manejo de Errores**: Recuperación automática de fallos de red
- **Límites de Seguridad**: Control de profundidad y número de páginas

### Uso Responsable
- Respetar robots.txt de los sitios web
- Implementar delays entre requests
- No sobrecargar los servidores objetivo
- Cumplir con términos de servicio

### Notas Legales
Este proyecto es únicamente para fines educativos y de demostración. Los usuarios son responsables de cumplir con las leyes aplicables y términos de servicio de los sitios web que scraped.

## Contribución

Este proyecto fue generado como ejemplo usando **JetBrains AI Assistant (Air IDE)** y está abierto a contribuciones para mejoras y nuevas funcionalidades.

## Licencia

UNLICENSED - Proyecto de ejemplo para demostración técnica.