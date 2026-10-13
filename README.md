# Mi IA Local

![Mi IA Local](docs/screenshot.png)

> **Asistente de inteligencia artificial privado, local y sin conexión a Internet.**

Una aplicación web construida con Python y Flask que se conecta a **Ollama** instalado en tu computadora para proporcionar un asistente de IA completamente local. Tus datos nunca salen de tu máquina.

---

## ✨ Características

| Herramienta | Descripción |
|-------------|-------------|
| 💬 **Chat** | Conversación contextual con memoria de sesión, historial persistente en SQLite y botón para limpiar. |
| 🌐 **Traducción** | Traduce entre Español, Inglés, Francés, Portugués, Italiano, Alemán y detección automática. Solo la traducción, sin explicaciones. |
| 📄 **Resúmenes** | Genera resúmenes corto, medio o detallado manteniendo las ideas principales. |
| ✏️ **Corrector** | Corrige ortografía, gramática y puntuación con tono formal, neutral o sencillo. |
| 💻 **Programación** | Ayuda con Python, HTML, CSS, JavaScript, SQL, Git/GitHub. Explicaciones paso a paso con bloques de código formateados. |
| ⚙️ **Configuración** | Cambia modelo, temperatura (0.0–1.0), activa/desactiva historial, verifica conexión con Ollama. |

---

## 🔒 Privacidad y Seguridad

- **100% Local**: No se envía ningún dato a servidores externos.
- **Sin APIs de pago**: Usa exclusivamente Ollama en `http://localhost:11434`.
- **Sin claves secretas**: No hay API keys, tokens ni credenciales en el código.
- **Solo localhost**: El servidor Flask escucha únicamente en `127.0.0.1:5000`.
- **Validación estricta**: Todos los endpoints validan y sanitizan entradas.
- **Sin `eval`/`exec`**: Nunca se ejecuta código generado por la IA.

---

## 📋 Requisitos

| Software | Versión mínima | Notas |
|----------|----------------|-------|
| **Python** | 3.9+ | Recomendado 3.10+ |
| **Ollama** | 0.1.0+ | Debe estar instalado y ejecutándose |
| **Modelo** | Cualquier modelo compatible | Por defecto: `llama3.2:latest` |

---

## 🚀 Instalación

### 1. Instalar Python

**Windows:**
```powershell
# Desde Microsoft Store (recomendado) o descargar de python.org
# Verificar instalación:
python --version
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install python3 python3-venv

# macOS (Homebrew)
brew install python
```

### 2. Instalar Ollama

**Windows:**
```powershell
# Descargar instalador desde https://ollama.com/download/windows
# O con winget:
winget install Ollama.Ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**macOS:**
```bash
# Descargar .dmg desde https://ollama.com/download/mac
# O con Homebrew:
brew install ollama
```

### 3. Descargar un modelo

```bash
# Modelo recomendado (rápido y ligero ~2GB)
ollama pull llama3.2:latest

# Otras opciones:
ollama pull mistral          # ~4GB, buen equilibrio
ollama pull codellama        # ~4GB, especializado en código
ollama pull llama3.1:8b      # ~5GB, más capaz
```

> **Nota**: El modelo por defecto es `llama3.2:latest`. Puedes cambiarlo en la configuración de la app.

### 4. Crear entorno virtual e instalar dependencias

```bash
# Clonar o navegar al proyecto
cd mi-ia-local

# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

---

## ▶️ Ejecución

### 1. Iniciar Ollama (en terminal separada)

```bash
ollama serve
```

> Mantén esta terminal abierta. Ollama debe estar ejecutándose para que la app funcione.

### 2. Iniciar la aplicación Flask

```bash
# Desde la carpeta mi-ia-local con el entorno virtual activado
python app.py
```

### 3. Abrir en el navegador

```
http://127.0.0.1:5000
```

---

## 📁 Estructura del Proyecto

```
mi-ia-local/
├── app.py                 # Aplicación Flask principal
├── config.py              # Configuración centralizada
├── database.py            # SQLite: historial y settings
├── ollama_service.py      # Cliente API Ollama
├── requirements.txt       # Dependencias Python
├── README.md              # Este archivo
├── .gitignore             # Archivos ignorados por Git
├── data/
│   ├── .gitkeep           # Mantiene carpeta en repo
│   └── mi_ia_local.db     # Base de datos SQLite (se crea automáticamente)
├── static/
│   ├── css/
│   │   └── styles.css     # Estilos completos (tema oscuro, responsive)
│   └── js/
│       └── app.js         # Lógica frontend (API, UI, estado)
└── templates/
    ├── base.html          # Layout base con sidebar y header
    ├── index.html         # Chat, Traducción, Resúmenes, Corrector, Programación
    └── settings.html      # Configuración y estado de conexión
```

---

## 🛠️ Tecnologías Utilizadas

| Categoría | Tecnología |
|-----------|------------|
| Backend | Python 3, Flask 3.0 |
| Frontend | HTML5, CSS3 (Grid/Flexbox, Custom Properties), Vanilla JS (ES6+) |
| Base de datos | SQLite 3 (stdlib) |
| IA Local | Ollama (API REST local) |
| HTTP Client | Requests 2.31 |
| Desarrollo | Entorno virtual, debug=False en producción |

---

## 🔧 Endpoints API

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Página principal (Chat) |
| `GET` | `/settings` | Página de configuración |
| `POST` | `/api/chat` | Enviar mensaje al chat |
| `POST` | `/api/translate` | Traducir texto |
| `POST` | `/api/summarize` | Generar resumen |
| `POST` | `/api/correct` | Corregir texto |
| `POST` | `/api/code-help` | Pregunta de programación |
| `GET` | `/api/status` | Estado conexión Ollama |
| `POST` | `/api/settings` | Guardar configuración |
| `POST` | `/api/history/clear` | Limpiar historial |
| `GET` | `/api/history/<tool>` | Obtener historial por herramienta |

---

## 🐛 Solución de Errores Comunes

### "No se puede conectar a Ollama"
```bash
# Verificar que Ollama esté corriendo
ollama serve

# Verificar puerto
curl http://localhost:11434/api/tags
```

### "Modelo no encontrado"
```bash
# Listar modelos instalados
ollama list

# Descargar el modelo configurado
ollama pull llama3.2:latest
```

### "Puerto 5000 en uso"
```bash
# Cambiar puerto en config.py o matar proceso
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/macOS:
lsof -i :5000
kill -9 <PID>
```

### Error de base de datos
```bash
# Eliminar y recrear (se pierde historial)
rm data/mi_ia_local.db
python app.py  # Se recrea automáticamente
```

### Módulo no encontrado
```bash
# Asegurar entorno virtual activado y dependencias instaladas
pip install -r requirements.txt
```

---

## 🎯 Mejoras Futuras

- [ ] Soporte para streaming de respuestas (Server-Sent Events)
- [ ] Múltiples conversaciones con pestañas
- [ ] Exportar/importar historial (JSON/Markdown)
- [ ] Temas personalizables (claro/oscuro/auto)
- [ ] Atajos de teclado personalizables
- [ ] Búsqueda en historial
- [ ] Soporte para modelos multimodales (imágenes)
- [ ] Empaquetado con PyInstaller para ejecutable standalone
- [ ] Tests unitarios e integración (pytest)

---

## 👨‍💻 Autor

**Michael Murillo Cortes**

---

## 📄 Licencia

Este proyecto es de uso libre para fines personales y educativos.

---

> **¡Disfruta de tu IA 100% local y privada!** 🤖🔒