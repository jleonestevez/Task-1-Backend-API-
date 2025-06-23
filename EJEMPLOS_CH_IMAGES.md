# Ejemplos de Uso - Funcionalidad ch-images

## 🎯 Procesamiento Especializado ch-images

Esta funcionalidad está diseñada para sitios web que utilizan elementos `ch-images` con navegación por dropdown-menu y elementos `rel`.

## 🚀 Ejemplos de Prueba

### 1. Scraping Simple con ch-images

```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example-gallery.com/collections/nature",
    "processChImages": true,
    "chImagesTimeout": 15000,
    "executeJavaScript": true
  }'
```

### 2. Crawling Completo con ch-images

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://art-gallery.com",
    "maxDepth": 2,
    "maxPages": 20,
    "processChImages": true,
    "chImagesTimeout": 12000,
    "downloadImages": true,
    "createImageSubdirectories": true,
    "linkKeywords": ["gallery", "collection", "artwork"],
    "excludeKeywords": ["admin", "login"]
  }'
```

### 3. Exportación a Excel con ch-images

```bash
curl -X POST http://localhost:3000/scraper/export-excel \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://photography-site.com",
    "maxDepth": 3,
    "maxPages": 50,
    "processChImages": true,
    "chImagesTimeout": 20000,
    "downloadImages": true,
    "exploreLists": true,
    "fileName": "photography-analysis"
  }' \
  --output photography-analysis.xlsx
```

## 🔍 Cómo Funciona

### Detección de Elementos
1. **Busca elementos `ch-images`** en la página
2. **Si no encuentra**: Continúa con scraping normal
3. **Si encuentra**: Activa procesamiento especial

### Procesamiento Dropdown-Menu
1. **Espera renderizado completo** (2 segundos)
2. **Busca `.dropdown-menu.open`**
3. **Extrae atributos `rel`** de elementos dentro del dropdown
4. **Construye URLs**: `path-actual/rel`
5. **Navega secuencialmente** a cada URL
6. **Extrae imágenes `.img-responsive`**

### Organización de Archivos
```
downloads/
└── art-gallery_com_2024-06-23/
    ├── nature/                    # Último elemento del path
    │   ├── forest_a1b2c3d4.jpg
    │   ├── ocean_e5f6g7h8.jpg
    │   └── mountains_i9j0k1l2.jpg
    └── abstract/
        ├── colors_m3n4o5p6.jpg
        └── shapes_q7r8s9t0.jpg
```

## 📊 Estructura de Respuesta

### Scraping Simple
```json
{
  "url": "https://gallery.com/collections/nature",
  "title": "Nature Collection",
  "content": {
    "h1": [{"text": "Beautiful Nature Photos"}]
  },
  "links": [
    "https://gallery.com/collections/nature/forest",
    "https://gallery.com/collections/nature/ocean"
  ],
  "images": [
    "https://gallery.com/images/nature1.jpg",
    "https://gallery.com/images/nature2.jpg"
  ],
  "timestamp": "2024-06-23T01:15:32.237Z"
}
```

### Crawling Completo
```json
{
  "baseUrl": "https://gallery.com",
  "summary": {
    "totalPages": 15,
    "filteredPages": 12,
    "totalImages": 85,
    "listLinksFound": 30,
    "listLinksExplored": 25
  },
  "imageDownloadResult": {
    "totalImages": 85,
    "downloadedImages": [
      {
        "originalUrl": "https://gallery.com/images/nature1.jpg",
        "fileName": "nature1_a1b2c3d4.jpg",
        "filePath": "./downloads/gallery_com_2024-06-23/nature/nature1_a1b2c3d4.jpg",
        "size": 254280,
        "mimeType": "image/jpeg",
        "downloadTime": 1250,
        "sourcePageUrl": "https://gallery.com/collections/nature"
      }
    ],
    "failedDownloads": [],
    "downloadDirectory": "./downloads/gallery_com_2024-06-23"
  }
}
```

## 🎨 Casos de Uso Específicos

### Galería de Arte
```json
{
  "baseUrl": "https://museum.com/exhibitions",
  "processChImages": true,
  "selectors": [".artwork-title", ".artist-name", ".year"],
  "linkKeywords": ["exhibition", "artwork", "artist"],
  "downloadImages": true
}
```

### Catálogo de Productos
```json
{
  "baseUrl": "https://catalog.com/products",
  "processChImages": true,
  "chImagesTimeout": 15000,
  "selectors": [".product-name", ".price", ".description"],
  "exploreLists": true,
  "listSelectors": [".category-menu", ".filter-options"]
}
```

### Portfolio Fotográfico
```json
{
  "baseUrl": "https://photographer.com/portfolio",
  "processChImages": true,
  "chImagesTimeout": 25000,
  "downloadImages": true,
  "createImageSubdirectories": true,
  "maxDepth": 4
}
```

## 🛠️ Configuración Avanzada

### Timeouts Recomendados
- **Sitios rápidos**: 5000-10000ms
- **Sitios normales**: 10000-15000ms  
- **Sitios lentos**: 15000-30000ms

### Selectores Especializados
```css
/* Elementos que el sistema busca automáticamente */
ch-images                    /* Elemento principal */
.dropdown-menu.open         /* Menú desplegable */
[rel]                       /* Elementos con atributo rel */
.img-responsive            /* Imágenes a descargar */
```

### Parámetros Opcionales
```json
{
  "processChImages": true,        // Activar procesamiento
  "chImagesTimeout": 15000,      // Timeout en milisegundos
  "downloadImages": true,         // Descargar imágenes
  "createImageSubdirectories": true,  // Subdirectorios por página
  "exploreLists": true           // Explorar listados también
}
```

## 🚨 Resolución de Problemas

### Error: "No se encontraron elementos ch-images"
- **Causa**: La página no contiene elementos `ch-images`
- **Solución**: Normal, el sistema continúa con scraping estándar

### Error: "Timeout esperando ch-images"
- **Causa**: Los elementos tardan en cargar
- **Solución**: Aumentar `chImagesTimeout`

### Error: "No se encontró dropdown-menu open"
- **Causa**: El dropdown no está abierto o usa clases diferentes
- **Solución**: Verificar estructura HTML del sitio

### Error: "No se encontraron elementos rel"
- **Causa**: Los elementos del dropdown no tienen atributo `rel`
- **Solución**: Verificar que los elementos tengan `rel="valor"`

## 📈 Métricas y Logging

El sistema proporciona logging detallado:

```
[LOG] Buscando elementos ch-images en https://gallery.com/nature
[LOG] Elementos ch-images encontrados, procesando...
[LOG] Encontrados 3 elementos rel para navegar
[LOG] Navegando a: https://gallery.com/nature/forest
[LOG] Extraídas 15 imágenes de https://gallery.com/nature/forest
[LOG] Procesamiento ch-images completado. Total imágenes: 45, URLs navegadas: 3
```

## 🔗 Enlaces Útiles

- **Swagger UI**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/scraper/health
- **Documentación**: README.md

## 💡 Tips de Optimización

1. **Usar JavaScript selectivamente**: Solo activar cuando sea necesario
2. **Configurar timeouts apropiados**: Según la velocidad del sitio
3. **Filtrar por keywords**: Para crawling más eficiente
4. **Monitorear logs**: Para detectar problemas temprano
5. **Organizar descargas**: Usar subdirectorios para mejor organización 