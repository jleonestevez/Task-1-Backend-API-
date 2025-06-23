# Mejoras de Timeout y Procesamiento Asíncrono

## Problemas Solucionados

### 1. Error "socket hang up"
**Problema:** Timeouts insuficientes causaban errores de conexión en sitios lentos.

**Solución implementada:**
- **Timeouts configurables por tipo de operación:**
  - `REQUEST_TIMEOUT`: 45 segundos para requests HTTP
  - `NAVIGATION_TIMEOUT`: 60 segundos para navegación con Puppeteer  
  - `WAIT_TIMEOUT`: 10 segundos para esperar elementos
  - `DEFAULT_TIMEOUT`: 30 segundos para operaciones generales

- **Mejoras en configuración de Axios:**
  ```typescript
  timeout: this.REQUEST_TIMEOUT,
  maxRedirects: 5,
  validateStatus: (status) => status < 500,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true,
    timeout: this.REQUEST_TIMEOUT
  })
  ```

- **Mejoras en configuración de Puppeteer:**
  ```typescript
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox', 
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-extensions'
  ],
  timeout: this.DEFAULT_TIMEOUT
  ```

- **Optimización de carga de páginas:**
  - Cambio de `networkidle0` a `domcontentloaded` para navegación más rápida
  - Bloqueo de recursos no esenciales (CSS, fuentes, media)
  - Manejo robusto de errores de navegación

### 2. Necesidad de Respuesta Asíncrona
**Problema:** El crawling de sitios grandes bloqueaba la respuesta HTTP por mucho tiempo.

**Solución implementada:**
- **Sistema de Jobs asíncronos** con estados: `pending`, `running`, `completed`, `failed`
- **Seguimiento de progreso en tiempo real** con información detallada
- **Nuevos endpoints especializados**

## Nuevos Endpoints

### 1. `/scraper/crawl-async` (POST)
Inicia crawling en background y devuelve jobId inmediatamente.

**Request:**
```json
{
  "baseUrl": "https://www.anzmanga25.com/",
  "maxPages": 50,
  "linkKeywords": ["one-piece", "capitulo"],
  "processChImages": true,
  "downloadImages": true
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "crawl_1640995200000_abc123def",
  "message": "Crawling iniciado. Use el jobId para consultar el progreso."
}
```

### 2. `/scraper/job/:jobId` (GET)
Consulta el estado y progreso de un job específico.

**Response:**
```json
{
  "jobId": "crawl_1640995200000_abc123def",
  "status": "running",
  "progress": {
    "currentPage": 15,
    "totalPages": 50,
    "filteredPages": 8,
    "currentUrl": "https://www.anzmanga25.com/manga/one-piece/capitulo-1095",
    "message": "Procesando página 15/50: https://www.anzmanga25.com/..."
  },
  "startTime": "2024-01-15T10:30:00.000Z",
  "result": null // Disponible cuando status = "completed"
}
```

### 3. `/scraper/jobs` (GET)
Lista todos los jobs con filtrado opcional por estado.

**Query Parameters:**
- `status` (opcional): `pending`, `running`, `completed`, `failed`

**Response:**
```json
[
  {
    "jobId": "crawl_1640995200000_abc123def",
    "status": "completed",
    "progress": {
      "currentPage": 50,
      "totalPages": 50,
      "filteredPages": 25,
      "message": "Crawling completado exitosamente"
    },
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-01-15T10:45:30.000Z"
  }
]
```

### 4. `/scraper/jobs/cleanup` (POST)
Limpia jobs completados con más de 1 hora de antigüedad.

## Mejoras Adicionales

### 1. Progreso en Tiempo Real
- **Actualización continua** del estado durante el crawling
- **Información detallada** sobre la página actual siendo procesada
- **Métricas de progreso** incluyendo páginas filtradas vs total

### 2. Optimización de Performance
- **Pausas entre requests** (1 segundo) para evitar sobrecarga del servidor
- **Bloqueo de recursos no esenciales** en Puppeteer
- **Navegación optimizada** con `domcontentloaded`
- **Manejo robusto de errores** sin interrumpir el proceso completo

### 3. Headers Mejorados
- **User-Agent más realista** simulando navegadores reales
- **Headers adicionales** para mejor compatibilidad:
  - `Accept`
  - `Accept-Language` 
  - `Accept-Encoding`
  - `Connection`
  - `Upgrade-Insecure-Requests`

## Ejemplo de Uso Recomendado

### Para sitios pequeños (< 20 páginas):
```bash
curl -X POST http://localhost:3000/scraper/crawl \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://example.com",
    "maxPages": 10,
    "linkKeywords": ["producto"]
  }'
```

### Para sitios grandes (> 20 páginas):
```bash
# 1. Iniciar crawling asíncrono
curl -X POST http://localhost:3000/scraper/crawl-async \
  -H "Content-Type: application/json" \
  -d '{
    "baseUrl": "https://www.anzmanga25.com/",
    "maxPages": 100,
    "linkKeywords": ["one-piece"],
    "processChImages": true
  }'

# Response: {"jobId": "crawl_1640995200000_abc123def", ...}

# 2. Consultar progreso periódicamente
curl http://localhost:3000/scraper/job/crawl_1640995200000_abc123def

# 3. Cuando status = "completed", obtener resultado
curl http://localhost:3000/scraper/job/crawl_1640995200000_abc123def
```

## Beneficios

1. **Eliminación de timeouts** en sitios lentos o con problemas de conectividad
2. **Respuesta inmediata** para procesos largos
3. **Monitoreo en tiempo real** del progreso del crawling
4. **Mejor gestión de recursos** del servidor
5. **Escalabilidad mejorada** para múltiples requests simultáneos
6. **Recuperación robusta** ante errores de red temporales

## Compatibilidad

- **Endpoints existentes** siguen funcionando sin cambios
- **Nuevos endpoints** son adicionales y opcionales
- **Configuración automática** de timeouts sin intervención manual
- **Fallback inteligente** ante errores de navegación 