"""
Configuración de la aplicación Mi IA Local.
"""
import os

# Directorio base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')

# Configuración de Flask
SECRET_KEY = os.environ.get('SECRET_KEY', 'mi-ia-local-dev-key-change-in-production')
DEBUG = False
HOST = '127.0.0.1'
PORT = 5000

# Configuración de Ollama
OLLAMA_BASE_URL = 'http://localhost:11434'
OLLAMA_API_GENERATE = f'{OLLAMA_BASE_URL}/api/generate'
OLLAMA_API_TAGS = f'{OLLAMA_BASE_URL}/api/tags'
DEFAULT_MODEL = 'llama3.2:latest'
DEFAULT_TEMPERATURE = 0.7
REQUEST_TIMEOUT = 120  # segundos

# Configuración de base de datos
DATABASE_PATH = os.path.join(DATA_DIR, 'mi_ia_local.db')

# Límites de validación
MAX_TEXT_LENGTH = 10000  # caracteres máximos por request
MAX_HISTORY_MESSAGES = 50  # mensajes máximos en contexto de chat

# Idiomas soportados para traducción
SUPPORTED_LANGUAGES = {
    'auto': 'Detección automática',
    'es': 'Español',
    'en': 'Inglés',
    'fr': 'Francés',
    'pt': 'Portugués',
    'it': 'Italiano',
    'de': 'Alemán'
}

# Tipos de tono para corrector
CORRECTION_TONES = {
    'formal': 'Formal',
    'neutral': 'Neutral',
    'simple': 'Sencillo'
}

# Tipos de resumen
SUMMARY_TYPES = {
    'short': 'Corto',
    'medium': 'Medio',
    'detailed': 'Detallado'
}

# Herramientas disponibles
TOOLS = [
    {'id': 'chat', 'name': 'Chat', 'icon': '💬'},
    {'id': 'translate', 'name': 'Traducción', 'icon': '🌐'},
    {'id': 'summarize', 'name': 'Resúmenes', 'icon': '📄'},
    {'id': 'correct', 'name': 'Corrector', 'icon': '✏️'},
    {'id': 'code-help', 'name': 'Programación', 'icon': '💻'},
    {'id': 'settings', 'name': 'Configuración', 'icon': '⚙️'}
]