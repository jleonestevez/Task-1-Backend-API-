**Automatización con Puppeteer:**
- Detección automática de elementos `ch-images` con timeout de 5 segundos
- Espera completa del renderizado de la página cuando se detectan `ch-images`
- **Detección de dropdown-menu open**: Busca elementos dropdown con clase `open` y extrae todos los atributos `rel`
- **Navegación por rels**: Navega secuencialmente a cada URL construida con `baseUrl/rel`
- **Descarga de imágenes img-responsive**: En cada página rel, descarga imágenes con clase `img-responsive`
- Fallback a imágenes normales si no se encuentran `ch-images`

### Automatización Avanzada con Puppeteer
- **Renderizado Completo**: Espera a que la página se renderice completamente cuando detecta `ch-images`
- **Detección de Carga**: Verifica que no haya requests de red pendientes antes de procesar
- **Procesamiento de Dropdown**: Detecta dropdown-menu con clase `open` y extrae elementos `rel`
- **Navegación Secuencial**: Navega a cada URL `baseUrl/rel` y descarga imágenes `img-responsive`
- **Límites de Seguridad**: Procesa todos los rels encontrados secuencialmente
- **Viewport Configurado**: 1920x1080 para simular navegador de escritorio
- **Nomenclatura de Imágenes**: `page_X_rel_Y_img_Z_timestamp.extension` para imágenes de rels