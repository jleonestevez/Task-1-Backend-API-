# 🕷️ Web Scraper API

> **Proyecto generado con IDE Cursor utilizando múltiples modelos de datos de inteligencia artificial**

API REST profesional construida con NestJS para realizar web scraping y crawling automatizado de sitios web, permitiendo la extracción inteligente de datos estructurados y no estructurados de la web.

## 🎯 Objetivo del Proyecto

Este proyecto tiene como objetivo proporcionar una **solución robusta y escalable** para la extracción automatizada de datos web mediante técnicas de scraping y crawling. La API permite a desarrolladores y analistas de datos:

- **Extraer información específica** de páginas web usando selectores CSS personalizados
- **Realizar crawling masivo** de sitios web completos de forma controlada
- **Procesar contenido dinámico** generado por JavaScript usando Puppeteer
- **Obtener datos estructurados** listos para análisis y procesamiento
- **Automatizar la recopilación** de información de múltiples fuentes web

### 🚀 Generado con Tecnología AI

Este proyecto fue desarrollado utilizando el **IDE Cursor** con múltiples modelos de datos de inteligencia artificial, garantizando:
- Código optimizado y siguiendo mejores prácticas
- Arquitectura escalable y mantenible
- Documentación completa y ejemplos de uso
- Validaciones robustas y manejo de errores
- Integración de tecnologías modernas

## ✨ Características Principales

- 🌐 **Web Scraping Inteligente**: Extracción precisa de datos específicos
- 🕷️ **Web Crawling Avanzado**: Navegación automática siguiendo enlaces
- 🎯 **Selectores CSS Flexibles**: Extracción de contenido específico
- ⚡ **Soporte JavaScript**: Procesamiento de páginas dinámicas con Puppeteer
- 📊 **API REST Completa**: Interfaz documentada con Swagger/OpenAPI
- ✅ **Validación Robusta**: Validación automática de parámetros
- 🛡️ **Filtros Avanzados**: Patrones regex + **filtrado por palabras clave en enlaces**
- 🔍 **Crawling Inteligente**: Solo sigue enlaces que contengan frases específicas
- 🎯 **Control de Parada por Objetivos**: Detiene automáticamente al alcanzar número objetivo de páginas filtradas
- 📊 **Exportación a Excel**: Genera reportes completos con árbol jerárquico del sitio y análisis detallado
- 🗂️ **Pestañas Organizadas**: Cada página filtrada en su propia pestaña con análisis granular
- 📈 **Métricas Detalladas**: Información de rendimiento y estadísticas completas
- ⚡ **Procesamiento Asíncrono**: Jobs en background para sitios grandes con seguimiento en tiempo real
- 🔧 **Timeouts Robustos**: Configuración automática de timeouts para sitios lentos
- 🚀 **Optimización de Performance**: Navegación optimizada y manejo inteligente de recursos

## 🛠️ Stack Tecnológico

- **NestJS** - Framework Node.js enterprise-grade
- **Puppeteer** - Automatización y control de navegador
- **Cheerio** - Parser HTML rápido del lado servidor
- **Axios** - Cliente HTTP con interceptors
- **Swagger/OpenAPI** - Documentación automática de API
- **class-validator** - Validación de DTOs
- **TypeScript** - Tipado estático y desarrollo robusto

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd web-scraper-api
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus configuraciones específicas.

### 4. Ejecutar la aplicación

#### Desarrollo
```bash
npm run start:dev
```

#### Producción
```bash
npm run build
npm run start:prod
```

## Uso

### Documentación API

Una vez que la aplicación esté ejecutándose, puedes acceder a la documentación interactiva de Swagger en:

```
http://localhost:3000/api
```

## 📚 Documentación de API

### 🔗 Endpoints Disponibles

#### 1. 🏥 Health Check - Verificación del Estado del Servicio

**Objetivo**: Verificar que el servicio esté funcionando correctamente y obtener información básica del sistema.

```http
GET /scraper/health
```

**Request**: No requiere parámetros

**Response**:
```json
{
  "status": "OK",
  "message": "Servicio de web scraping funcionando correctamente",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Códigos de Estado**:
- `200 OK`: Servicio funcionando correctamente

---

#### 2. 🌐 Web Scraping - Extracción de Datos de URL Específica

**Objetivo**: Extraer datos específicos de una página web utilizando selectores CSS personalizados, con soporte para contenido estático y dinámico.

```http
POST /scraper/scrape
```

**Request Body**:
```json
{
  "url": "https://example.com",
  "selectors": ["h1", ".content", "#main", "meta[name='description']"],
  "executeJavaScript": false,
  "waitTime": 1000,
  "headers": {
    "User-Agent": "Mozilla/5.0 (Custom Bot)"
  }
}
```

**Parámetros**:
- `url` (string, requerido): URL del sitio web a scrapear
- `selectors` (array, opcional): Lista de selectores CSS para extraer contenido específico
- `executeJavaScript` (boolean, opcional): Si debe ejecutar JavaScript (usa Puppeteer)
- `waitTime` (number, opcional): Tiempo de espera en milisegundos (0-30000)
- `headers` (object, opcional): Headers HTTP personalizados

**Response**:
```json
{
  "url": "https://example.com",
  "title": "Página de Ejemplo",
  "content": {
    "h1": ["Título Principal", "Subtítulo"],
    ".content": ["Contenido del artículo..."],
    "#main": ["Contenido principal..."]
  },
  "links": [
    "https://example.com/page1",
    "https://example.com/page2",
    "/relative-link"
  ],
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ],
  "timestamp": "2024-01-15T10:30:00.000Z",
  "metadata": {
    "responseTime": 1500,
    "statusCode": 200,
    "contentType": "text/html; charset=utf-8"
  }
}
```

**Códigos de Estado**:
- `200 OK`: Scraping exitoso
- `400 Bad Request`: URL inválida o parámetros incorrectos
- `500 Internal Server Error`: Error durante el scraping

---

#### 3. 🕷️ Web Crawling - Rastreo Masivo de Sitios Web

**Objetivo**: Realizar crawling automático de múltiples páginas de un sitio web, siguiendo **solo enlaces que contengan frases específicas** de forma inteligente con filtros avanzados y límites de profundidad.

> **🔍 Enfoque Inteligente**: Este endpoint utiliza un sistema de filtrado por palabras clave que analiza tanto la URL como el texto del enlace, permitiendo un crawling más preciso y eficiente al seguir únicamente enlaces relevantes.

```http
POST /scraper/crawl
```

**Request Body**:
```json
{
  "baseUrl": "https://blog.example.com",
  "maxDepth": 3,
  "maxPages": 50,
  "includePatterns": [
    "^https://blog\\.example\\.com/\\d{4}/.*",
    "^https://blog\\.example\\.com/category/.*"
  ],
  "excludePatterns": [
    "^https://blog\\.example\\.com/admin/.*",
    "^https://blog\\.example\\.com/private/.*"
  ],
  "linkKeywords": ["artículo", "post", "blog", "noticia"],
  "excludeKeywords": ["admin", "login", "delete", "edit"],
  "targetFilteredPages": 15,
  "selectors": ["h1", ".post-content", ".author", ".publish-date"]
}
```

**Parámetros**:
- `baseUrl` (string, requerido): URL base para iniciar el crawling
- `maxDepth` (number, opcional): Profundidad máxima del crawling (1-5, default: 2)
- `maxPages` (number, opcional): Número máximo de páginas a procesar (1-100, default: 10)
- `includePatterns` (array, opcional): Patrones regex de URLs a incluir
- `excludePatterns` (array, opcional): Patrones regex de URLs a excluir
- `linkKeywords` (array, opcional): **Frases que deben contener los enlaces para ser seguidos**
- `excludeKeywords` (array, opcional): **Frases que deben excluirse de los enlaces**
- `targetFilteredPages` (number, opcional): **Número objetivo de páginas filtradas para detener automáticamente** (0-50, default: 0 = sin límite)
- `selectors` (array, opcional): Selectores CSS para extraer datos específicos

**Response**:
```json
{
  "baseUrl": "https://blog.example.com",
  "pages": [
    {
      "url": "https://blog.example.com",
      "title": "Blog Principal",
      "content": {
        "h1": ["Bienvenido al Blog"],
        ".post-content": ["Contenido del post..."],
        ".author": ["Juan Pérez"],
        ".publish-date": ["2024-01-15"]
      },
      "links": ["https://blog.example.com/post-1", "https://blog.example.com/post-2"],
      "images": ["https://blog.example.com/hero.jpg"],
      "timestamp": "2024-01-15T10:30:00.000Z",
      "metadata": {
        "responseTime": 1200,
        "statusCode": 200,
        "contentType": "text/html"
      }
    }
  ],
       "summary": {
       "totalPages": 25,
       "filteredPages": 15,
       "targetFilteredPages": 15,
       "reachedTarget": true,
       "totalLinks": 156,
       "totalImages": 89,
       "crawlDuration": 45000
     }
}
```

**Códigos de Estado**:
- `200 OK`: Crawling completado exitosamente
- `400 Bad Request`: URL base inválida o parámetros incorrectos
- `500 Internal Server Error`: Error durante el crawling

---

#### 4. ⚡ Web Crawling Asíncrono - Para Sitios Grandes

**Objetivo**: Iniciar crawling en background para sitios grandes o procesos que pueden tomar mucho tiempo, devolviendo inmediatamente un jobId para consultar el progreso.

> **🚀 Recomendado para sitios grandes**: Para sitios con más de 20 páginas o procesos que pueden tardar más de 30 segundos, use este endpoint para mejor experiencia de usuario.

```http
POST /scraper/crawl-async
```

**Request Body**: (Mismos parámetros que `/crawl`)
```json
{
  "baseUrl": "https://www.anzmanga25.com/",
  "maxPages": 100,
  "linkKeywords": ["one-piece", "capitulo"],
  "processChImages": true,
  "downloadImages": true
}
```

**Response (202 Accepted)**:
```json
{
  "jobId": "crawl_1640995200000_abc123def",
  "message": "Crawling iniciado. Use el jobId para consultar el progreso."
}
```

##### 4.1. Consultar Estado del Job

```http
GET /scraper/job/{jobId}
```

**Response**:
```json
{
  "jobId": "crawl_1640995200000_abc123def",
  "status": "running",
  "progress": {
    "currentPage": 15,
    "totalPages": 100,
    "filteredPages": 8,
    "currentUrl": "https://www.anzmanga25.com/manga/one-piece/capitulo-1095",
    "message": "Procesando página 15/100: https://www.anzmanga25.com/..."
  },
  "startTime": "2024-01-15T10:30:00.000Z",
  "result": null // Disponible cuando status = "completed"
}
```

**Estados posibles**:
- `pending`: Job en cola esperando procesamiento
- `running`: Job ejecutándose actualmente
- `completed`: Job completado exitosamente (resultado disponible)
- `failed`: Job falló (error disponible)

##### 4.2. Listar Todos los Jobs

```http
GET /scraper/jobs?status=running
```

**Response**:
```json
[
  {
    "jobId": "crawl_1640995200000_abc123def",
    "status": "running",
    "progress": {...},
    "startTime": "2024-01-15T10:30:00.000Z"
  },
  {
    "jobId": "crawl_1640995300000_xyz789ghi",
    "status": "completed",
    "progress": {...},
    "startTime": "2024-01-15T10:25:00.000Z",
    "endTime": "2024-01-15T10:28:30.000Z"
  }
]
```

##### 4.3. Limpiar Jobs Completados

```http
POST /scraper/jobs/cleanup
```

**Response**:
```json
{
  "message": "Jobs limpiados exitosamente"
}
```

---

#### 5. 📊 Exportación a Excel - Análisis Completo del Sitio

**Objetivo**: Realizar crawling completo del sitio web y generar un archivo Excel con **representación en árbol del sitio filtrado** y **análisis detallado de cada página** en pestañas separadas.

> **🎯 Funcionalidad Avanzada**: Combina crawling inteligente con generación automática de reportes en Excel, incluyendo estructura jerárquica del sitio y análisis granular de cada página filtrada.

```http
POST /scraper/export-excel
```

**Request Body**:
```json
{
  "baseUrl": "https://blog.example.com",
  "maxDepth": 3,
  "maxPages": 50,
  "linkKeywords": ["artículo", "tutorial", "guía"],
  "excludeKeywords": ["admin", "login"],
  "targetFilteredPages": 20,
  "selectors": ["h1", ".content", ".author", ".publish-date"],
  "includeDetailedAnalysis": true,
  "fileName": "analisis-sitio-web"
}
```

**Parámetros**:
- `baseUrl` (string, requerido): URL base para el análisis
- `maxDepth` (number, opcional): Profundidad máxima (1-5, default: 2)
- `maxPages` (number, opcional): Páginas máximas a procesar (1-100, default: 20)
- `linkKeywords` (array, opcional): Palabras clave para filtrar enlaces
- `excludeKeywords` (array, opcional): Palabras clave para excluir
- `targetFilteredPages` (number, opcional): Número objetivo de páginas filtradas
- `selectors` (array, opcional): Selectores CSS para extracción detallada
- `includeDetailedAnalysis` (boolean, opcional): Incluir pestañas detalladas (default: true)
- `fileName` (string, opcional): Nombre del archivo Excel

**Response**: Archivo Excel con las siguientes pestañas:

1. **🌳 Árbol del Sitio**: Representación jerárquica completa del sitio web filtrado
2. **📊 Resumen**: Estadísticas generales y análisis por profundidad
3. **📄 Páginas Individuales**: Una pestaña por cada página filtrada con análisis detallado

**Códigos de Estado**:
- `200 OK`: Archivo Excel generado exitosamente
- `400 Bad Request`: Parámetros de exportación inválidos
- `500 Internal Server Error`: Error durante la generación del reporte

## 💻 Ejemplos Prácticos de Uso

### 🔍 Ejemplo 1: Scraping de Noticias

```javascript
// Extraer títulos y puntuaciones de Hacker News
const response = await fetch('http://localhost:3000/scraper/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://news.ycombinator.com',
    selectors: ['.titleline > a', '.score'],
    executeJavaScript: false
  })
});

const newsData = await response.json();
console.log('Títulos extraídos:', newsData.content['.titleline > a']);
console.log('Puntuaciones:', newsData.content['.score']);
```

### 📰 Ejemplo 2: Crawling Inteligente de Blog

```javascript
// Crawlear un blog siguiendo solo enlaces con palabras clave específicas
const response = await fetch('http://localhost:3000/scraper/crawl', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    baseUrl: 'https://blog.example.com',
    maxDepth: 3,
    maxPages: 25,
    // Filtros por palabras clave en enlaces (NUEVO)
    linkKeywords: ['artículo', 'tutorial', 'guía', 'post'],
    excludeKeywords: ['admin', 'login', 'register', 'delete', 'edit'],
    // Detener automáticamente al encontrar 20 páginas que cumplan criterios
    targetFilteredPages: 20,
    // Filtros tradicionales por URL
    includePatterns: [
      '^https://blog\\.example\\.com/\\d{4}/.*',
      '^https://blog\\.example\\.com/category/.*'
    ],
    excludePatterns: [
      '^https://blog\\.example\\.com/admin/.*'
    ],
    selectors: ['h1', '.post-content', '.author', '.publish-date']
  })
});

const crawlData = await response.json();
console.log(`✅ Crawling completado:`);
console.log(`📄 Páginas procesadas: ${crawlData.summary.totalPages}`);
console.log(`🎯 Páginas filtradas encontradas: ${crawlData.summary.filteredPages}`);
console.log(`🏁 Objetivo alcanzado: ${crawlData.summary.reachedTarget ? 'SÍ' : 'NO'}`);
console.log(`🔗 Enlaces encontrados: ${crawlData.summary.totalLinks}`);
console.log(`🖼️ Imágenes encontradas: ${crawlData.summary.totalImages}`);
console.log(`⏱️ Tiempo total: ${crawlData.summary.crawlDuration}ms`);
```

### 🛍️ Ejemplo 3: Scraping de E-commerce

```javascript
// Extraer información de productos
const response = await fetch('http://localhost:3000/scraper/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    url: 'https://ecommerce.example.com/product/123',
    selectors: [
      '.product-title',
      '.price',
      '.description',
      '.rating',
      '.availability'
    ],
    executeJavaScript: true,
    waitTime: 2000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Scraper Bot) WebScraper/1.0'
    }
  })
});

const productData = await response.json();
console.log('Información del producto:', productData.content);
```

### 📊 Ejemplo 4: Crawling con Control de Objetivos

```javascript
// Buscar exactamente 10 artículos técnicos, sin importar cuántas páginas se procesen
const response = await fetch('http://localhost:3000/scraper/crawl', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    baseUrl: 'https://tech-blog.example.com',
    maxPages: 200,                           // Límite máximo de páginas a procesar
    targetFilteredPages: 10,                 // OBJETIVO: encontrar exactamente 10 páginas relevantes
    linkKeywords: ['javascript', 'tutorial', 'programming', 'code'],
    excludeKeywords: ['advertising', 'sponsor'],
    selectors: ['h1', '.content', '.code-snippet', '.author']
  })
});

const result = await response.json();

console.log(`🎯 Objetivo: ${result.summary.targetFilteredPages} páginas`);
console.log(`✅ Encontradas: ${result.summary.filteredPages} páginas filtradas`);
console.log(`🏁 Completado: ${result.summary.reachedTarget ? 'Objetivo alcanzado' : 'Límite máximo alcanzado'}`);
console.log(`📄 Total procesadas: ${result.summary.totalPages} páginas`);
```

### ⚡ Ejemplo 5: Crawling Asíncrono para Sitios Grandes

```javascript
// Para sitios grandes, usar crawling asíncrono
async function crawlLargeSite() {
  // 1. Iniciar crawling asíncrono
  const startResponse = await fetch('http://localhost:3000/scraper/crawl-async', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      baseUrl: 'https://www.anzmanga25.com/',
      maxPages: 200,
      linkKeywords: ['one-piece', 'capitulo'],
      processChImages: true,
      downloadImages: true,
      targetFilteredPages: 50
    })
  });

  const { jobId } = await startResponse.json();
  console.log(`🚀 Crawling iniciado con jobId: ${jobId}`);

  // 2. Monitorear progreso
  let status = 'pending';
  while (status === 'pending' || status === 'running') {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
    
    const statusResponse = await fetch(`http://localhost:3000/scraper/job/${jobId}`);
    const jobStatus = await statusResponse.json();
    
    status = jobStatus.status;
    console.log(`📊 Estado: ${status}`);
    console.log(`📄 Progreso: ${jobStatus.progress.currentPage}/${jobStatus.progress.totalPages} páginas`);
    console.log(`🎯 Filtradas: ${jobStatus.progress.filteredPages} páginas`);
    console.log(`🔗 URL actual: ${jobStatus.progress.currentUrl}`);
    console.log(`💬 Mensaje: ${jobStatus.progress.message}`);
    console.log('---');
  }

  // 3. Obtener resultado final
  const finalResponse = await fetch(`http://localhost:3000/scraper/job/${jobId}`);
  const finalResult = await finalResponse.json();
  
  if (status === 'completed') {
    console.log('✅ Crawling completado exitosamente!');
    console.log(`📊 Resultado final:`, finalResult.result.summary);
    return finalResult.result;
  } else {
    console.error('❌ Crawling falló:', finalResult.error);
    throw new Error(finalResult.error);
  }
}

// Ejecutar
crawlLargeSite()
  .then(result => console.log('Datos obtenidos:', result.pages.length, 'páginas'))
  .catch(error => console.error('Error:', error));
```

### 📊 Ejemplo 6: Exportación Completa a Excel

```javascript
// Generar reporte completo en Excel del sitio web
const response = await fetch('http://localhost:3000/scraper/export-excel', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    baseUrl: 'https://docs.example.com',
    maxDepth: 4,
    maxPages: 100,
    targetFilteredPages: 30,
    linkKeywords: ['documentation', 'guide', 'tutorial', 'api'],
    excludeKeywords: ['deprecated', 'legacy', 'old'],
    selectors: [
      'h1', 'h2', 'h3',                    // Títulos
      '.content', '.description',          // Contenido principal
      '.author', '.last-updated',          // Metadatos
      'code', '.code-block'                // Código
    ],
    includeDetailedAnalysis: true,
    fileName: 'documentacion-completa'
  })
});

// Descargar el archivo Excel
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'documentacion-completa.xlsx';
a.click();

console.log('📊 Reporte Excel generado y descargado exitosamente');
```

### 🔧 Ejemplo 6: Análisis de Redes Sociales

```bash
# Usando cURL para extraer datos de redes sociales
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://social.example.com/profile/username",
    "selectors": [".post-text", ".engagement-count", ".hashtags"],
    "executeJavaScript": true,
    "waitTime": 3000
  }'
```

### 🧠 Cómo Funciona el Filtrado Inteligente por Palabras Clave

El sistema de crawling analiza cada enlace encontrado y evalúa:

1. **📝 Texto del enlace**: El contenido visible del enlace (ej: "Leer artículo completo")
2. **🔗 URL del enlace**: La dirección web del enlace
3. **🎯 Palabras clave de inclusión**: Solo sigue enlaces que contengan estas frases
4. **🚫 Palabras clave de exclusión**: Evita enlaces que contengan estas frases

**Ejemplo práctico**:
```html
<!-- Este enlace SÍ será seguido -->
<a href="/blog/articulo-tutorial">Ver tutorial completo</a>

<!-- Este enlace NO será seguido (contiene "admin") -->
<a href="/admin/panel">Panel de administración</a>
```

### 🎯 Control Inteligente de Parada por Objetivos

Además del filtrado por palabras clave, el sistema incluye **control automático de parada** que permite definir exactamente cuántas páginas que cumplan los criterios deseas encontrar:

**Parámetro**: `targetFilteredPages`
- **Valor 0 (default)**: Sin límite, continúa hasta alcanzar `maxPages`
- **Valor > 0**: Se detiene automáticamente al encontrar ese número de páginas filtradas

**Ejemplo práctico**:
```json
{
  "baseUrl": "https://news.example.com",
  "maxPages": 100,
  "targetFilteredPages": 20,
  "linkKeywords": ["noticia", "artículo"]
}
```

**Resultado**: El crawler procesará hasta 100 páginas, pero **se detendrá automáticamente** cuando encuentre exactamente 20 páginas que contengan "noticia" o "artículo", optimizando tiempo y recursos.

**Ventajas**:
- 🎯 **Control preciso**: Obtienes exactamente el número de páginas relevantes que necesitas
- ⚡ **Eficiencia**: Evita procesamiento innecesario una vez alcanzado el objetivo
- 📊 **Predictibilidad**: Resultados consistentes independientemente del tamaño del sitio

## 📊 Estructura del Archivo Excel Generado

### 🌳 **Pestaña 1: Árbol del Sitio**
Representación jerárquica visual del sitio web crawleado:

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| **Nivel** | Profundidad en la jerarquía | 0, 1, 2, 3... |
| **Estructura** | Representación visual del árbol | `├── Página Principal` |
| **URL** | Dirección completa de la página | `https://blog.com/post/123` |
| **Título** | Título extraído de la página | `"Guía de JavaScript Avanzado"` |
| **Estado** | Código de respuesta HTTP | `200`, `404`, `500` |
| **Tiempo (ms)** | Tiempo de respuesta | `1500` |
| **Enlaces** | Número de enlaces encontrados | `25` |
| **Imágenes** | Número de imágenes encontradas | `8` |

### 📊 **Pestaña 2: Resumen Ejecutivo**
Estadísticas generales del análisis:

- **📈 Métricas Globales**: Total de páginas, filtradas, objetivos alcanzados
- **🕰️ Información Temporal**: Fecha del análisis, duración del crawling
- **📊 Análisis por Profundidad**: Distribución de páginas por nivel jerárquico
- **🎯 Cumplimiento de Objetivos**: Porcentaje de objetivos alcanzados

### 📄 **Pestañas 3+: Análisis Detallado por Página**
Una pestaña individual para cada página filtrada que contiene:

#### 📋 **Información General**
- URL completa de la página
- Título extraído
- Fecha y hora del análisis
- Métricas de rendimiento (tiempo de respuesta, código de estado)
- Tipo de contenido detectado

#### 🎯 **Contenido Extraído por Selectores**
Datos organizados por cada selector CSS utilizado:
```
Selector: h1
1. Título Principal de la Página
2. Subtítulo Importante

Selector: .content
1. Párrafo de introducción...
2. Contenido del artículo...

Selector: .author
1. Juan Pérez
```

#### 🔗 **Enlaces Detectados** (hasta 50 por página)
Lista numerada de todos los enlaces encontrados en la página

#### 🖼️ **Recursos Multimedia**
Enlaces a imágenes y otros recursos multimedia detectados

### ✨ **Características Avanzadas del Excel**

- **🎨 Codificación por Colores**: Páginas filtradas resaltadas en verde
- **📊 Filtros Automáticos**: Cada columna incluye filtros para análisis rápido
- **📏 Columnas Autoajustadas**: Anchos optimizados para mejor legibilidad
- **🏷️ Nombres Inteligentes**: Pestañas nombradas automáticamente basándose en el título de la página
- **📈 Formato Profesional**: Estilos empresariales para presentaciones

## Configuración avanzada

### Variables de entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `MAX_CONCURRENT_REQUESTS` | Máximo de peticiones concurrentes | `5` |
| `DEFAULT_REQUEST_TIMEOUT` | Timeout por defecto (ms) | `10000` |
| `PUPPETEER_EXECUTABLE_PATH` | Ruta del ejecutable de Chrome/Chromium | Sistema |

### Selectores CSS

Puedes usar cualquier selector CSS válido:

- `h1, h2, h3` - Títulos
- `.class-name` - Por clase CSS
- `#element-id` - Por ID
- `[attribute="value"]` - Por atributo
- `div > p` - Selectores descendientes
- `a[href*="github"]` - Enlaces que contengan "github"

## Desarrollo

### Scripts disponibles

```bash
npm run start:dev    # Modo desarrollo con hot reload
npm run build        # Construir para producción
npm run test         # Ejecutar tests
npm run test:watch   # Tests en modo watch
npm run lint         # Verificar código con ESLint
npm run format       # Formatear código con Prettier
```

### Testing

```bash
# Tests unitarios
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

## ⚠️ Limitaciones y Consideraciones Éticas

### 🚦 Buenas Prácticas de Web Scraping

- **🕰️ Rate Limiting**: Implementa delays entre peticiones para no sobrecargar los servidores
- **🤖 robots.txt**: Siempre verifica y respeta el archivo robots.txt del sitio web
- **📜 Términos de Servicio**: Asegúrate de cumplir con los ToS del sitio objetivo
- **⚖️ Uso Responsable**: Utiliza la herramienta de forma ética y legal
- **🔒 Datos Personales**: No extraigas información personal sin consentimiento
- **🛡️ Detección de Bots**: Algunos sitios implementan medidas anti-bot

### 📈 Consideraciones de Rendimiento

- **💾 Memoria**: El crawling de sitios grandes puede consumir memoria significativa
- **🔄 Concurrencia**: Limita las peticiones concurrentes para evitar sobrecargar el sistema
- **⏱️ Timeouts**: Configura timeouts apropiados para evitar bloqueos
- **📊 Monitoreo**: Supervisa el uso de recursos durante operaciones intensivas

## 🚀 Despliegue y Producción

### 🐳 Docker (Recomendado)

```dockerfile
# Crear Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

```bash
# Construir y ejecutar
docker build -t web-scraper-api .
docker run -p 3000:3000 web-scraper-api
```

### ☁️ Variables de Entorno para Producción

```bash
PORT=3000
NODE_ENV=production
MAX_CONCURRENT_REQUESTS=3
DEFAULT_REQUEST_TIMEOUT=15000
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
LOG_LEVEL=info
```

## 🔧 Personalización y Extensión

### 🎨 Agregando Nuevos Extractores

```typescript
// src/scraper/extractors/custom-extractor.ts
export class CustomExtractor {
  async extractData(page: Page, selectors: string[]): Promise<any> {
    // Lógica personalizada de extracción
  }
}
```

### 📡 Integraciones Adicionales

- **🗄️ Base de Datos**: MongoDB, PostgreSQL para almacenar resultados
- **📬 Colas**: Redis/Bull para procesamiento asíncrono
- **📊 Métricas**: Prometheus/Grafana para monitoreo
- **🔐 Autenticación**: JWT para acceso controlado

## 🎯 Casos de Uso Comunes

| Industria | Caso de Uso | Selectores Típicos |
|-----------|-------------|-------------------|
| **E-commerce** | Monitoreo de precios | `.price`, `.product-title`, `.rating` |
| **Inmobiliaria** | Listados de propiedades | `.property-price`, `.address`, `.features` |
| **Noticias** | Agregación de contenido | `h1`, `.article-content`, `.author` |
| **Redes Sociales** | Análisis de engagement | `.post-text`, `.like-count`, `.share-count` |
| **Investigación** | Recopilación académica | `.abstract`, `.authors`, `.citations` |
| **Auditoría SEO** | Análisis de estructura del sitio | `h1`, `h2`, `meta[name="description"]`, `title` |
| **Documentación** | Mapeo de conocimiento | `.article-title`, `.content`, `.code-example` |
| **Competitive Intel** | Análisis de competencia | `.product-name`, `.price`, `.features` |

## 📊 Casos de Uso Específicos para Excel

### 🏢 **Auditoría SEO Completa**
```javascript
{
  "baseUrl": "https://mi-sitio.com",
  "maxDepth": 5,
  "maxPages": 200,
  "selectors": ["title", "h1", "h2", "h3", "meta[name='description']", ".breadcrumb"],
  "fileName": "auditoria-seo-completa"
}
```
**Resultado**: Excel con estructura completa del sitio para análisis SEO, identificación de páginas sin títulos, jerarquía de encabezados, etc.

### 📚 **Mapeo de Documentación Técnica**
```javascript
{
  "linkKeywords": ["documentation", "api", "guide", "tutorial"],
  "excludeKeywords": ["deprecated", "legacy"],
  "targetFilteredPages": 50,
  "selectors": [".doc-title", ".code-snippet", ".api-endpoint", ".example"]
}
```
**Resultado**: Reporte estructurado de toda la documentación técnica con ejemplos de código organizados por secciones.

### 🛍️ **Análisis de Catálogo de Productos**
```javascript
{
  "linkKeywords": ["product", "item", "catalog"],
  "selectors": [".product-name", ".price", ".description", ".rating", ".availability"],
  "targetFilteredPages": 100
}
```
**Resultado**: Base de datos completa de productos en Excel para análisis de precios y características.

## 📞 Soporte y Contacto

### 🐛 Reportar Problemas

Si encuentras algún problema o tienes sugerencias:

1. **🔍 Issues**: Abre un issue en el repositorio
2. **📧 Email**: Contacta al equipo de desarrollo
3. **💬 Discussions**: Participa en las discusiones del proyecto

### 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Para contribuir:

1. **🍴 Fork** el proyecto
2. **🌿 Branch** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **💾 Commit** tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. **📤 Push** al branch (`git push origin feature/nueva-funcionalidad`)
5. **🔄 Pull Request** para revisión

### 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver el archivo `LICENSE` para más detalles.

---

<div align="center">

**🕷️ Web Scraper API** - *Generado con IDE Cursor utilizando múltiples modelos de IA*

![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=puppeteer&logoColor=white)

*Desarrollado con tecnología de inteligencia artificial para máxima eficiencia y calidad*

</div> 