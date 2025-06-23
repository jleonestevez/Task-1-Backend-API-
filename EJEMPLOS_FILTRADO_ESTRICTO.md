# Ejemplos de Filtrado Estricto y Dropdowns

## 🎯 Filtrado Estricto por linkKeywords

Con la nueva implementación, los `linkKeywords` funcionan como un **filtro estricto**: solo se consideran enlaces que contengan las frases especificadas, todos los demás se omiten completamente.

## 🚀 Ejemplos Prácticos

### 1. Crawling con Filtrado Estricto Básico

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://blog.example.com",
    "maxDepth": 3,
    "maxPages": 20,
    "linkKeywords": ["tutorial", "guía", "programación"],
    "selectors": ["h1", "h2", ".content", ".author"]
  }'
```

**Comportamiento**: Solo seguirá enlaces que contengan "tutorial", "guía" o "programación" en la URL o texto del enlace.

### 2. Crawling con Dropdowns y Filtrado Estricto

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://gallery.example.com",
    "maxDepth": 2,
    "maxPages": 30,
    "linkKeywords": ["galería", "foto", "imagen"],
    "processDropdowns": true,
    "dropdownSelectors": [".category-dropdown", ".filter-menu"],
    "sortDropdownValues": true,
    "downloadImages": true,
    "selectors": ["h1", ".description", ".metadata"]
  }'
```

**Comportamiento**: 
- Solo sigue enlaces con "galería", "foto" o "imagen"
- Detecta dropdowns y navega por sus valores ordenados
- Descarga imágenes de cada página navegada

### 3. Crawling Completo con Análisis de Contenido

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://docs.example.com",
    "maxDepth": 4,
    "maxPages": 50,
    "linkKeywords": ["API", "documentación", "endpoint"],
    "excludeKeywords": ["deprecated", "obsoleto"],
    "contentKeywords": ["parámetros", "respuesta", "ejemplo"],
    "excludeContentKeywords": ["error 404", "no disponible"],
    "contentPatterns": ["\\{.*\\}", "HTTP \\d{3}"],
    "minContentMatches": 2,
    "processDropdowns": true,
    "processChImages": true,
    "targetFilteredPages": 25,
    "selectors": [".endpoint", ".parameters", ".response", ".example"]
  }'
```

### 4. E-commerce con Detección de Productos

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://tienda.example.com",
    "maxDepth": 3,
    "maxPages": 40,
    "linkKeywords": ["producto", "categoría", "oferta"],
    "contentKeywords": ["precio", "stock", "disponible"],
    "contentPatterns": ["\\$\\d+\\.\\d{2}", "\\d+\\s*unidades"],
    "processDropdowns": true,
    "dropdownSelectors": [".price-filter", ".category-select", ".brand-dropdown"],
    "downloadImages": true,
    "createImageSubdirectories": true,
    "selectors": [".product-title", ".price", ".description", ".availability"]
  }'
```

## 🔍 Detección Avanzada de Dropdowns

### Selectores Automáticos
El sistema detecta automáticamente estos elementos:
```css
.dropdown
.dropdown-menu
.select-menu
.menu-dropdown
.navigation-dropdown
select
.dropdown-content
.dropdown-list
[role="listbox"]
[role="menu"]
```

### Extracción de Valores
Para cada dropdown encontrado, extrae valores de:
- Atributos `rel`
- Atributos `data-value`
- Enlaces `href` (última parte del path)
- Texto de opciones y elementos clickeables

### Navegación Inteligente
1. **Ordena valores** alfabéticamente (configurable)
2. **Construye URLs** como `base-path/valor`
3. **Navega secuencialmente** con pausas entre requests
4. **Extrae imágenes** de cada página visitada

## 📊 Respuesta con Análisis Completo

```json
{
  "baseUrl": "https://gallery.example.com",
  "pages": [
    {
      "url": "https://gallery.example.com/galería/naturaleza",
      "title": "Galería de Naturaleza",
      "content": {
        "h1": [{"text": "Fotos de Naturaleza"}],
        ".description": [{"text": "Colección de imágenes naturales"}]
      },
      "links": [
        "https://gallery.example.com/galería/naturaleza/bosques",
        "https://gallery.example.com/galería/naturaleza/océanos"
      ],
      "images": [
        "https://gallery.example.com/images/nature1.jpg",
        "https://gallery.example.com/images/nature2.jpg"
      ],
      "metadata": {
        "contentAnalysis": {
          "keywordMatches": ["galería", "imagen"],
          "patternMatches": [],
          "relevanceScore": 0.85,
          "totalMatches": 2
        }
      }
    }
  ],
  "summary": {
    "totalPages": 25,
    "filteredPages": 23,
    "totalLinks": 150,
    "totalImages": 89,
    "contentMatches": {
      "totalKeywordMatches": 45,
      "totalPatternMatches": 12,
      "averageRelevanceScore": 0.78,
      "pagesWithContent": 23,
      "topKeywords": [
        {"keyword": "galería", "count": 15},
        {"keyword": "imagen", "count": 12}
      ]
    }
  },
  "imageDownloadResult": {
    "totalImages": 89,
    "downloadedImages": 87,
    "downloadDirectory": "./downloads/gallery_example_com_2024-06-23"
  }
}
```

## 🎨 Casos de Uso Específicos

### Portfolio de Fotografía
```json
{
  "baseUrl": "https://photographer.com",
  "linkKeywords": ["portfolio", "galería", "proyecto"],
  "processDropdowns": true,
  "dropdownSelectors": [".year-selector", ".category-filter"],
  "processChImages": true,
  "downloadImages": true,
  "contentKeywords": ["fotografía", "proyecto", "cliente"]
}
```

### Documentación Técnica
```json
{
  "baseUrl": "https://api-docs.com",
  "linkKeywords": ["endpoint", "API", "documentación"],
  "contentKeywords": ["parámetros", "respuesta", "ejemplo"],
  "contentPatterns": ["GET|POST|PUT|DELETE", "\\{.*\\}"],
  "contentSearchSelectors": [".endpoint-doc", ".parameters", ".response"]
}
```

### Catálogo de Productos
```json
{
  "baseUrl": "https://catalog.com",
  "linkKeywords": ["producto", "categoría"],
  "processDropdowns": true,
  "dropdownSelectors": [".filters", ".categories", ".brands"],
  "contentKeywords": ["precio", "stock"],
  "contentPatterns": ["\\$\\d+", "\\d+\\s*disponibles"],
  "downloadImages": true
}
```

## 🔧 Configuración Avanzada

### Filtrado Ultra-Estricto
```json
{
  "linkKeywords": ["específico", "exacto"],
  "excludeKeywords": ["no-deseado", "spam"],
  "contentKeywords": ["contenido-relevante"],
  "excludeContentKeywords": ["error", "no-encontrado"],
  "minContentMatches": 3
}
```

### Procesamiento Completo de Dropdowns
```json
{
  "processDropdowns": true,
  "processChImages": true,
  "dropdownSelectors": [".custom-dropdown", ".mega-menu"],
  "sortDropdownValues": true,
  "chImagesTimeout": 15000
}
```

## 🚨 Logging y Depuración

El sistema ahora proporciona logging detallado:

```
[LOG] Filtrado de enlaces: 5/25 enlaces aceptados
[DEBUG] Enlace omitido (no contiene keywords requeridas): /admin/login
[DEBUG] Enlace aceptado: /galería/naturaleza
[LOG] Dropdown encontrado con selector: .category-dropdown
[LOG] Encontrados 8 valores únicos en dropdowns (ordenados)
[LOG] Navegando a: https://gallery.com/categoría/paisajes
[LOG] Extraídas 12 imágenes de https://gallery.com/categoría/paisajes
[LOG] Página relevante encontrada: https://gallery.com/galería/arte (3 coincidencias, score: 0.85)
```

## 💡 Tips de Optimización

1. **Usar linkKeywords específicas** para reducir ruido
2. **Combinar con contentKeywords** para doble filtrado
3. **Configurar timeouts apropiados** para dropdowns complejos
4. **Usar excludeKeywords** para evitar secciones no deseadas
5. **Monitorear logs** para ajustar filtros

## 🔗 Endpoints Relacionados

- **Health Check**: `GET /scraper/health`
- **Scraping Simple**: `POST /scraper/scrape`
- **Crawling Inteligente**: `POST /scraper/crawl`
- **Exportación Excel**: `POST /scraper/export-excel`
- **Documentación**: http://localhost:3000/api 