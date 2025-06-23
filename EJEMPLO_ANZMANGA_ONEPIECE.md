# Ejemplo Específico: AnzManga - One Piece

## 🏴‍☠️ Crawling Inteligente de One Piece en AnzManga

Basado en la estructura de [https://www.anzmanga25.com/](https://www.anzmanga25.com/), aquí tienes ejemplos optimizados para extraer información de One Piece y otros mangas.

## 🎯 Ejemplo 1: Crawling Específico de One Piece

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxDepth": 3,
    "maxPages": 50,
    "linkKeywords": ["One Piece", "one-piece", "capítulo"],
    "excludeKeywords": ["publicidad", "ads", "banner"],
    "contentKeywords": ["capítulo", "leer", "manga"],
    "excludeContentKeywords": ["error 404", "no encontrado"],
    "processDropdowns": true,
    "dropdownSelectors": [".dropdown", ".menu-dropdown", "select"],
    "downloadImages": true,
    "createImageSubdirectories": true,
    "targetFilteredPages": 30,
    "selectors": [
      "h1", 
      "h5", 
      ".manga-title",
      ".chapter-title", 
      ".chapter-number",
      ".update-date",
      ".view-count",
      "a[href*=\"capítulo\"]",
      "a[href*=\"leer\"]"
    ]
  }'
```

## 🔍 Ejemplo 2: Análisis de Mangas Populares

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxDepth": 2,
    "maxPages": 25,
    "linkKeywords": ["manga", "capítulo", "leer"],
    "contentKeywords": ["Tokyo Revengers", "One Punch-Man", "Shuumatsu no Valkyrie", "One Piece"],
    "contentPatterns": ["#\\d+", "\\d{6,7}\\s*views?", "Capítulo #\\d+"],
    "minContentMatches": 1,
    "processDropdowns": true,
    "exploreLists": true,
    "listSelectors": [".manga-list", ".popular-list", ".recent-updates"],
    "selectors": [
      "h5",
      ".manga-title",
      ".view-count", 
      ".chapter-info",
      ".update-date",
      "a[href*=\"manga\"]"
    ]
  }'
```

## 📚 Ejemplo 3: Seguimiento de Actualizaciones Recientes

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxDepth": 2,
    "maxPages": 40,
    "linkKeywords": ["capítulo", "leer", "actualizaciones"],
    "contentKeywords": ["Ayer", "19/6/2025", "18/6/2025", "capítulo"],
    "contentPatterns": ["\\d{1,2}/\\d{1,2}/\\d{4}", "Capítulo #\\d+", "Leer Capítulo"],
    "processDropdowns": true,
    "downloadImages": true,
    "selectors": [
      "h3",
      "h6", 
      ".manga-title",
      ".chapter-title",
      ".date",
      ".chapter-link",
      "a[href*=\"leer\"]",
      "a[href*=\"capítulo\"]"
    ]
  }'
```

## 🎨 Ejemplo 4: Extracción de Imágenes de Manga

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxDepth": 4,
    "maxPages": 60,
    "linkKeywords": ["One Piece", "capítulo", "leer"],
    "contentKeywords": ["Un día muy cruel", "#1152", "capítulo"],
    "processChImages": true,
    "chImagesTimeout": 15000,
    "processDropdowns": true,
    "dropdownSelectors": [".chapter-selector", ".volume-selector"],
    "sortDropdownValues": true,
    "downloadImages": true,
    "createImageSubdirectories": true,
    "selectors": [
      ".manga-page img",
      ".chapter-image",
      ".page-image",
      ".manga-panel"
    ]
  }'
```

## 🔄 Ejemplo 5: Navegación por Dropdowns de Capítulos

```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxDepth": 3,
    "maxPages": 100,
    "linkKeywords": ["One Piece"],
    "processDropdowns": true,
    "dropdownSelectors": [
      ".chapter-dropdown",
      ".episode-selector", 
      "select[name=\"chapter\"]",
      ".chapter-list"
    ],
    "sortDropdownValues": false,
    "contentKeywords": ["capítulo", "leer"],
    "downloadImages": true,
    "selectors": [
      ".chapter-title",
      ".chapter-number", 
      ".manga-content",
      ".page-content"
    ]
  }'
```

## 📊 Respuesta Esperada para One Piece

```json
{
  "baseUrl": "https://www.anzmanga25.com/",
  "pages": [
    {
      "url": "https://www.anzmanga25.com/manga/one-piece",
      "title": "One Piece - AnzManga",
      "content": {
        "h1": [{"text": "One Piece"}],
        "h5": [{"text": "One Piece"}],
        ".view-count": [{"text": "1216280"}],
        ".chapter-title": [{"text": "#1152 Un día muy cruel"}],
        "a[href*=\"capítulo\"]": [
          {"text": "Leer Capítulo #1152. Un día muy cruel", "href": "/one-piece/capitulo-1152"}
        ]
      },
      "links": [
        "https://www.anzmanga25.com/one-piece/capitulo-1152",
        "https://www.anzmanga25.com/one-piece/capitulo-1151"
      ],
      "images": [
        "https://www.anzmanga25.com/images/one-piece-cover.jpg",
        "https://www.anzmanga25.com/images/chapter-1152-page-1.jpg"
      ],
      "metadata": {
        "contentAnalysis": {
          "keywordMatches": ["One Piece", "capítulo"],
          "patternMatches": ["#1152", "1216280"],
          "relevanceScore": 0.95,
          "totalMatches": 4
        }
      }
    }
  ],
  "summary": {
    "totalPages": 45,
    "filteredPages": 42,
    "totalLinks": 180,
    "totalImages": 156,
    "contentMatches": {
      "totalKeywordMatches": 89,
      "totalPatternMatches": 23,
      "averageRelevanceScore": 0.87,
      "pagesWithContent": 42,
      "topKeywords": [
        {"keyword": "One Piece", "count": 25},
        {"keyword": "capítulo", "count": 18},
        {"keyword": "leer", "count": 15}
      ],
      "topPatterns": [
        {"pattern": "#1152", "count": 8},
        {"pattern": "1216280", "count": 3}
      ]
    }
  },
  "imageDownloadResult": {
    "totalImages": 156,
    "downloadedImages": 148,
    "downloadDirectory": "./downloads/anzmanga25_com_2024-06-23"
  }
}
```

## 🎯 Selectores Específicos para AnzManga

### Elementos Principales
```css
h1                    /* Títulos principales */
h5                    /* Títulos de manga */
h6                    /* Subtítulos y fechas */
.manga-title          /* Nombre del manga */
.chapter-title        /* Título del capítulo */
.view-count           /* Número de visualizaciones */
.update-date          /* Fecha de actualización */
```

### Enlaces de Navegación
```css
a[href*="manga"]      /* Enlaces a páginas de manga */
a[href*="capítulo"]   /* Enlaces a capítulos */
a[href*="leer"]       /* Enlaces de lectura */
.chapter-link         /* Enlaces específicos de capítulos */
```

### Listas y Menús
```css
.popular-list         /* Lista de mangas populares */
.recent-updates       /* Actualizaciones recientes */
.manga-list           /* Lista general de mangas */
.dropdown             /* Menús desplegables */
```

## 🚀 Casos de Uso Específicos

### 1. Monitoreo de Nuevos Capítulos
```json
{
  "baseUrl": "https://www.anzmanga25.com/",
  "linkKeywords": ["One Piece", "capítulo"],
  "contentKeywords": ["Ayer", "nuevo", "actualización"],
  "targetFilteredPages": 10
}
```

### 2. Descarga Completa de un Manga
```json
{
  "baseUrl": "https://www.anzmanga25.com/manga/one-piece",
  "linkKeywords": ["capítulo", "leer"],
  "processDropdowns": true,
  "downloadImages": true,
  "maxPages": 200
}
```

### 3. Análisis de Popularidad
```json
{
  "baseUrl": "https://www.anzmanga25.com/",
  "contentKeywords": ["más vistos", "populares"],
  "contentPatterns": ["\\d{6,7}\\s*views?"],
  "selectors": [".view-count", ".manga-title"]
}
```

## 🔧 Configuración Optimizada

### Para Navegación Rápida
```json
{
  "maxDepth": 2,
  "maxPages": 30,
  "linkKeywords": ["One Piece"],
  "excludeKeywords": ["publicidad", "ads"]
}
```

### Para Descarga Completa
```json
{
  "maxDepth": 4,
  "maxPages": 100,
  "downloadImages": true,
  "processDropdowns": true,
  "createImageSubdirectories": true
}
```

### Para Análisis de Contenido
```json
{
  "contentKeywords": ["capítulo", "manga", "leer"],
  "contentPatterns": ["#\\d+", "\\d{4}/\\d{2}/\\d{2}"],
  "minContentMatches": 2
}
```

## 📝 Notas Importantes

1. **Respeta el sitio**: Usa pausas entre requests para no sobrecargar el servidor
2. **Filtrado específico**: Los `linkKeywords` como "One Piece" aseguran que solo se sigan enlaces relevantes
3. **Patrones útiles**: Los patrones regex capturan números de capítulo y fechas
4. **Imágenes**: El sistema puede descargar automáticamente las páginas del manga
5. **Dropdowns**: Detecta selectores de capítulos para navegación completa

## 🎮 Comando de Prueba Rápida

```bash
# Prueba básica para verificar conectividad
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.anzmanga25.com/",
    "selectors": ["h1", "h5", ".manga-title", ".view-count"],
    "executeJavaScript": false
  }'
```

Este ejemplo está optimizado específicamente para la estructura de AnzManga y te permitirá hacer un seguimiento eficiente de One Piece y otros mangas populares del sitio. 