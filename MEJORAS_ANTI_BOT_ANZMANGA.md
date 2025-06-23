# 🛡️ Mejoras Anti-Bot para Sitios Problemáticos (AnzManga)

## 🎯 Problema Específico

AnzManga y sitios similares implementan **protecciones anti-bot muy estrictas** que detectan y bloquean requests automatizados, causando errores como:
- `socket hang up`
- `ECONNRESET`
- `ETIMEDOUT`
- Respuestas HTTP 403/429

## 🚀 Soluciones Implementadas

### 1. 🔍 Detección Automática de Sitios Problemáticos

El sistema detecta automáticamente dominios conocidos por tener protecciones anti-bot:

```typescript
private readonly PROBLEMATIC_DOMAINS = [
  'anzmanga25.com',
  'anzmanga.com',
  'mangakakalot.com',
  'manganelo.com',
  'readmanga.today'
];
```

### 2. 🎭 Rotación de User-Agents

Pool de User-Agents reales y actualizados que se rotan aleatoriamente:

```typescript
private readonly USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
  // ... más User-Agents
];
```

### 3. 📡 Headers HTTP Realistas

Headers completos que simulan navegadores reales:

```typescript
private generateRealisticHeaders(): Record<string, string> {
  return {
    'User-Agent': this.getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
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
}
```

### 4. ⏱️ Delays Aleatorios

Implementación de delays aleatorios para simular comportamiento humano:

```typescript
// Delays iniciales para sitios problemáticos
if (isProblematic) {
  await this.randomDelay(2000, 5000); // 2-5 segundos
}

// Delays entre requests
if (isProblematic) {
  await this.randomDelay(2000, 5000); // 2-5 segundos para sitios problemáticos
} else {
  await this.randomDelay(500, 1500);  // 0.5-1.5 segundos para sitios normales
}
```

### 5. 🔄 Sistema de Reintentos con Backoff Exponencial

Para sitios problemáticos, implementa reintentos inteligentes:

```typescript
const maxRetries = isProblematic ? 3 : 1;

while (retryCount <= maxRetries) {
  try {
    response = await axios.get(url, axiosConfig);
    break; // Éxito
  } catch (error) {
    retryCount++;
    
    // Delay exponencial: 2^n * 1000 + random
    const retryDelay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    // Cambiar User-Agent para el siguiente intento
    axiosConfig.headers['User-Agent'] = this.getRandomUserAgent();
  }
}
```

### 6. 🎯 Configuración TCP Optimizada

Para sitios problemáticos, configuración TCP específica:

```typescript
httpsAgent: new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: this.REQUEST_TIMEOUT * 1.5, // 67.5 segundos
  maxSockets: 1,                        // Una conexión a la vez
  maxFreeSockets: 1,
  freeSocketTimeout: 30000,
  socketActiveTTL: 60000
})
```

### 7. 🤖 Técnicas de Evasión Avanzadas (Puppeteer)

#### Argumentos de Chrome Anti-Detección:
```typescript
args: [
  '--disable-blink-features=AutomationControlled',
  '--disable-features=VizDisplayCompositor',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-features=TranslateUI',
  '--disable-ipc-flooding-protection'
]
```

#### Eliminación de Rastros de Automatización:
```typescript
await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['es-ES', 'es', 'en'] });
  (window as any).chrome = { runtime: {} };
});
```

#### Viewports Aleatorios:
```typescript
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1536, height: 864 }
];
const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
await page.setViewport(randomViewport);
```

### 8. 🎭 Simulación de Comportamiento Humano

```typescript
private async simulateHumanBehavior(page: puppeteer.Page): Promise<void> {
  // Movimientos de mouse aleatorios
  const viewport = page.viewport();
  if (viewport) {
    const randomX = Math.floor(Math.random() * viewport.width);
    const randomY = Math.floor(Math.random() * viewport.height);
    await page.mouse.move(randomX, randomY);
  }

  // Scroll aleatorio
  const scrollDistance = Math.floor(Math.random() * 300) + 100;
  await page.evaluate((distance) => {
    window.scrollBy(0, distance);
  }, scrollDistance);
  
  // Scroll hacia arriba ocasionalmente
  if (Math.random() > 0.7) {
    await page.evaluate(() => window.scrollBy(0, -150));
  }
}
```

### 9. ⚡ Timeouts Extendidos

Para sitios problemáticos, timeouts más largos:

```typescript
// Timeouts extendidos para sitios problemáticos
const pageTimeout = isProblematic ? this.WAIT_TIMEOUT * 2 : this.WAIT_TIMEOUT;           // 20s vs 10s
const navTimeout = isProblematic ? this.NAVIGATION_TIMEOUT * 1.5 : this.NAVIGATION_TIMEOUT; // 90s vs 60s
const requestTimeout = isProblematic ? this.REQUEST_TIMEOUT * 1.5 : this.REQUEST_TIMEOUT;   // 67.5s vs 45s
```

### 10. 🌐 Estrategia de Navegación Adaptiva

```typescript
// Para sitios problemáticos: networkidle2 (más permisivo)
// Para sitios normales: domcontentloaded (más rápido)
await page.goto(url, { 
  waitUntil: isProblematic ? 'networkidle2' : 'domcontentloaded',
  timeout: navTimeout 
});

// Tiempo de espera adicional para contenido dinámico
const finalWaitTime = isProblematic ? 
  Math.min(waitTime * 2, 8000) :  // Hasta 8 segundos para sitios problemáticos
  Math.min(waitTime, 5000);       // Hasta 5 segundos para sitios normales
```

## 📊 Ejemplo de Uso para AnzManga

### Scraping Básico:
```bash
curl -X POST http://localhost:3000/scraper/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.anzmanga25.com/",
    "executeJavaScript": true,
    "waitTime": 3000,
    "selectors": ["h1", ".manga-list", ".chapter-list"]
  }'
```

### Crawling Asíncrono (Recomendado):
```bash
# Iniciar crawling asíncrono
curl -X POST http://localhost:3000/scraper/crawl-async \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxPages": 20,
    "linkKeywords": ["one-piece", "capitulo", "manga"],
    "processChImages": true,
    "downloadImages": true,
    "maxDepth": 3
  }'

# Monitorear progreso
curl http://localhost:3000/scraper/job/{jobId}
```

## 🔧 Configuración Específica Activada

El sistema detecta automáticamente URLs de AnzManga y activa:

1. ✅ **Delays aleatorios** (2-5 segundos entre requests)
2. ✅ **Reintentos múltiples** (hasta 3 intentos)
3. ✅ **User-Agent rotation** automática
4. ✅ **Headers realistas** completos
5. ✅ **Timeouts extendidos** (67.5s requests, 90s navegación)
6. ✅ **Técnicas anti-detección** avanzadas
7. ✅ **Simulación de comportamiento humano**
8. ✅ **Configuración TCP optimizada**

## 📈 Beneficios Esperados

- **🛡️ Reducción del 90%** en errores "socket hang up"
- **⚡ Mayor tasa de éxito** en sitios con protecciones anti-bot
- **🤖 Evasión efectiva** de sistemas de detección
- **📊 Mejor calidad de datos** extraídos
- **🔄 Recuperación automática** ante bloqueos temporales

## ⚠️ Consideraciones Importantes

1. **Respeto a robots.txt**: Siempre verificar las políticas del sitio
2. **Uso responsable**: No sobrecargar los servidores
3. **Términos de servicio**: Respetar las condiciones de uso
4. **Rate limiting**: Los delays automáticos ayudan a ser respetuoso

## 🚀 Próximos Pasos

Si persisten problemas específicos con AnzManga:

1. **Aumentar delays**: Modificar rangos de `randomDelay()`
2. **Rotar proxies**: Implementar rotación de IP (futuro)
3. **Cookies persistentes**: Mantener sesiones entre requests
4. **Análisis específico**: Estudiar patrones de bloqueo del sitio 