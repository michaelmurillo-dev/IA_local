"""
Aplicación principal Mi IA Local - Flask.
"""
import html
from flask import Flask, render_template, request, jsonify, redirect, url_for
from config import (
    SECRET_KEY, DEBUG, HOST, PORT,
    DEFAULT_MODEL, DEFAULT_TEMPERATURE,
    SUPPORTED_LANGUAGES, CORRECTION_TONES,
    SUMMARY_TYPES, TOOLS, MAX_TEXT_LENGTH
)
from database import (
    save_history, get_history, clear_history,
    get_setting, set_setting, get_all_settings
)
from ollama_service import OllamaService, OllamaError


app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY


# Servicio Ollama global
ollama_service = OllamaService()


def get_current_model():
    """Obtiene el modelo actual de la configuración o usa el default."""
    return get_setting('model', DEFAULT_MODEL)


def get_current_temperature():
    """Obtiene la temperatura actual de la configuración o usa el default."""
    try:
        return float(get_setting('temperature', DEFAULT_TEMPERATURE))
    except (ValueError, TypeError):
        return DEFAULT_TEMPERATURE


def get_history_enabled():
    """Verifica si el historial está activado."""
    return get_setting('history_enabled', 'true').lower() == 'true'


def update_ollama_service():
    """Actualiza el servicio Ollama con la configuración actual."""
    ollama_service.set_model(get_current_model())
    ollama_service.set_temperature(get_current_temperature())


def validate_json_request(required_fields=None):
    """Valida que la request sea JSON y contenga campos requeridos.
    Returns: (is_valid, data, error_response)
    error_response is a tuple (jsonify_response, status_code) or None
    """
    if not request.is_json:
        return False, None, (jsonify({'error': 'Content-Type debe ser application/json'}), 400)
    
    data = request.get_json()
    if data is None:
        return False, None, (jsonify({'error': 'JSON inválido'}), 400)
    
    if required_fields:
        for field in required_fields:
            if field not in data or not data[field]:
                return False, None, (jsonify({'error': f'Campo requerido: {field}'}), 400)
    
    return True, data, None


def sanitize_text(text):
    """Escapa HTML para prevenir XSS."""
    return html.escape(text) if text else ''


def truncate_text(text, max_length=MAX_TEXT_LENGTH):
    """Trunca texto si excede el límite."""
    if len(text) > max_length:
        return text[:max_length]
    return text


# ==================== RUTAS PRINCIPALES ====================

@app.route('/')
def index():
    """Página principal con el chat."""
    update_ollama_service()
    connection = ollama_service.check_connection()
    history = get_history('chat') if get_history_enabled() else []
    
    return render_template('index.html',
                           tools=TOOLS,
                           active_tool='chat',
                           connection=connection,
                           history=history,
                           current_model=get_current_model(),
                           current_temperature=get_current_temperature(),
                           history_enabled=get_history_enabled(),
                           supported_languages=SUPPORTED_LANGUAGES,
                           correction_tones=CORRECTION_TONES,
                           summary_types=SUMMARY_TYPES)


@app.route('/settings')
def settings():
    """Página de configuración."""
    update_ollama_service()
    connection = ollama_service.check_connection()
    all_settings = get_all_settings()
    
    return render_template('settings.html',
                           tools=TOOLS,
                           active_tool='settings',
                           connection=connection,
                           current_model=all_settings.get('model', DEFAULT_MODEL),
                           current_temperature=all_settings.get('temperature', DEFAULT_TEMPERATURE),
                           history_enabled=all_settings.get('history_enabled', 'true'),
                           supported_languages=SUPPORTED_LANGUAGES,
                           correction_tones=CORRECTION_TONES,
                           summary_types=SUMMARY_TYPES)


# ==================== API ENDPOINTS ====================

@app.route('/api/status')
def api_status():
    """Estado de la conexión con Ollama."""
    update_ollama_service()
    connection = ollama_service.check_connection()
    return jsonify({
        'connected': connection['connected'],
        'models': connection['models'],
        'current_model': get_current_model(),
        'error': connection['error']
    })


@app.route('/api/chat', methods=['POST'])
def api_chat():
    """Endpoint para el chat."""
    valid, data, error = validate_json_request(['message'])
    if not valid:
        return error
    
    message = truncate_text(sanitize_text(data['message']))
    conversation_history = data.get('history', [])
    
    # Construir prompt con contexto
    system_prompt = (
        "Eres un asistente de IA útil, amable y conciso. "
        "Responde en español a menos que se te pida otro idioma. "
        "Mantén un tono conversacional y natural."
    )
    
    # Incluir historial en el prompt
    context = ""
    for msg in conversation_history[-10:]:  # Últimos 10 mensajes
        role = "Usuario" if msg.get('role') == 'user' else "Asistente"
        content = sanitize_text(msg.get('content', ''))
        context += f"{role}: {content}\n"
    
    prompt = f"{context}\nUsuario: {message}\nAsistente:"
    
    try:
        response = ollama_service.generate(prompt, system=system_prompt)
        
        if get_history_enabled():
            save_history('chat', message, response)
        
        return jsonify({
            'success': True,
            'response': response
        })
    except OllamaError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/translate', methods=['POST'])
def api_translate():
    """Endpoint para traducción."""
    valid, data, error = validate_json_request(['text', 'target_lang'])
    if not valid:
        return error
    
    text = truncate_text(data['text'])
    source_lang = data.get('source_lang', 'auto')
    target_lang = data['target_lang']
    
    # Validar idiomas
    if source_lang not in SUPPORTED_LANGUAGES:
        source_lang = 'auto'
    if target_lang not in SUPPORTED_LANGUAGES:
        return jsonify({'success': False, 'error': 'Idioma de destino no válido'}), 400
    if source_lang == target_lang and source_lang != 'auto':
        return jsonify({'success': False, 'error': 'El idioma de origen y destino deben ser diferentes'}), 400
    
    source_name = SUPPORTED_LANGUAGES.get(source_lang, 'desconocido')
    target_name = SUPPORTED_LANGUAGES.get(target_lang, 'desconocido')
    
    system_prompt = (
        "Eres un traductor profesional. Traduce el texto proporcionado "
        "ÚNICAMENTE la traducción, sin explicaciones, notas ni formato adicional. "
        "Mantén el tono y significado original."
    )
    
    if source_lang == 'auto':
        prompt = f"Traduce el siguiente texto al {target_name} (detecta el idioma de origen automáticamente):\n\n{text}"
    else:
        prompt = f"Traduce del {source_name} al {target_name}:\n\n{text}"
    
    try:
        response = ollama_service.generate(prompt, system=system_prompt, temperature=0.3)
        
        if get_history_enabled():
            save_history('translate', f"[{source_name}→{target_name}] {text}", response)
        
        return jsonify({
            'success': True,
            'translation': response,
            'source_lang': source_lang,
            'target_lang': target_lang
        })
    except OllamaError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/summarize', methods=['POST'])
def api_summarize():
    """Endpoint para resúmenes."""
    valid, data, error = validate_json_request(['text', 'summary_type'])
    if not valid:
        return error
    
    text = truncate_text(data['text'])
    summary_type = data['summary_type']
    
    if summary_type not in SUMMARY_TYPES:
        return jsonify({'success': False, 'error': 'Tipo de resumen no válido'}), 400
    
    type_name = SUMMARY_TYPES[summary_type]
    
    length_instructions = {
        'short': 'máximo 3 oraciones, muy conciso',
        'medium': '1-2 párrafos, equilibrado',
        'detailed': 'varios párrafos, completo y detallado'
    }
    
    system_prompt = (
        "Eres un experto en crear resúmenes. Extrae las ideas principales "
        "y presenta un resumen claro y bien estructurado. "
        "No añadas opiniones ni información no presente en el texto original."
    )
    
    prompt = (
        f"Crea un resumen {type_name} ({length_instructions[summary_type]}) "
        f"del siguiente texto:\n\n{text}"
    )
    
    try:
        response = ollama_service.generate(prompt, system=system_prompt, temperature=0.4)
        
        if get_history_enabled():
            save_history('summarize', f"[{type_name}] {text[:200]}...", response)
        
        return jsonify({
            'success': True,
            'summary': response,
            'summary_type': summary_type
        })
    except OllamaError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/correct', methods=['POST'])
def api_correct():
    """Endpoint para corrector ortográfico/gramatical."""
    valid, data, error = validate_json_request(['text', 'tone'])
    if not valid:
        return error
    
    text = truncate_text(data['text'])
    tone = data['tone']
    
    if tone not in CORRECTION_TONES:
        return jsonify({'success': False, 'error': 'Tono no válido'}), 400
    
    tone_name = CORRECTION_TONES[tone]
    
    system_prompt = (
        "Eres un corrector profesional de textos. Corrige ortografía, gramática, "
        "puntuación y mejora la fluidez manteniendo el significado original. "
        "Devuelve ÚNICAMENTE el texto corregido, sin explicaciones ni comentarios."
    )
    
    tone_instructions = {
        'formal': 'Usa un tono formal, culto y profesional.',
        'neutral': 'Mantén un tono neutro y estándar.',
        'simple': 'Simplifica el lenguaje, hazlo más claro y accesible.'
    }
    
    prompt = (
        f"Corrige el siguiente texto aplicando un tono {tone_name.lower()} "
        f"({tone_instructions[tone]}):\n\n{text}"
    )
    
    try:
        response = ollama_service.generate(prompt, system=system_prompt, temperature=0.2)
        
        if get_history_enabled():
            save_history('correct', f"[{tone_name}] {text[:200]}...", response)
        
        return jsonify({
            'success': True,
            'corrected': response,
            'tone': tone
        })
    except OllamaError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/code-help', methods=['POST'])
def api_code_help():
    """Endpoint para ayuda de programación."""
    valid, data, error = validate_json_request(['question'])
    if not valid:
        return error
    
    question = truncate_text(data['question'])
    language = data.get('language', 'general')
    
    system_prompt = (
        "Eres un experto programador y mentor. Explica conceptos de programación "
        "claramente, paso a paso. Cuando muestres código, usa bloques de código "
        "con el lenguaje apropiado. Incluye comentarios en el código. "
        "ADVERTENCIA: Siempre añade una nota al final recordando al usuario que "
        "revise y pruebe el código antes de usarlo en producción."
    )
    
    lang_context = {
        'python': 'Python',
        'html': 'HTML',
        'css': 'CSS',
        'javascript': 'JavaScript',
        'sql': 'SQL',
        'git': 'Git/GitHub',
        'general': 'programación en general'
    }
    
    lang_name = lang_context.get(language, 'programación')
    
    prompt = (
        f"Ayuda con {lang_name}: {question}\n\n"
        "Explica paso a paso y muestra ejemplos de código claros con comentarios. "
        "Al final, incluye una advertencia para revisar el código antes de usarlo."
    )
    
    try:
        response = ollama_service.generate(prompt, system=system_prompt, temperature=0.5)
        
        if get_history_enabled():
            save_history('code-help', f"[{lang_name}] {question[:200]}...", response)
        
        return jsonify({
            'success': True,
            'answer': response,
            'language': language
        })
    except OllamaError as e:
        return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error interno: {str(e)}'}), 500


@app.route('/api/settings', methods=['POST'])
def api_settings():
    """Guarda la configuración."""
    valid, data, error = validate_json_request()
    if not valid:
        return error
    
    try:
        if 'model' in data:
            model = sanitize_text(data['model'])
            if model:
                set_setting('model', model)
                ollama_service.set_model(model)
        
        if 'temperature' in data:
            temp = float(data['temperature'])
            temp = max(0.0, min(1.0, temp))
            set_setting('temperature', str(temp))
            ollama_service.set_temperature(temp)
        
        if 'history_enabled' in data:
            enabled = 'true' if data['history_enabled'] else 'false'
            set_setting('history_enabled', enabled)
        
        return jsonify({'success': True, 'message': 'Configuración guardada'})
    except ValueError:
        return jsonify({'success': False, 'error': 'Valor de temperatura inválido'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al guardar: {str(e)}'}), 500


@app.route('/api/history/clear', methods=['POST'])
def api_clear_history():
    """Limpia el historial."""
    valid, data, error = validate_json_request()
    if not valid:
        return error
    
    tool_type = data.get('tool_type') if data else None
    
    try:
        clear_history(tool_type)
        return jsonify({'success': True, 'message': 'Historial limpiado'})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error al limpiar: {str(e)}'}), 500


@app.route('/api/history/<tool_type>')
def api_get_history(tool_type):
    """Obtiene historial para una herramienta específica."""
    if not get_history_enabled():
        return jsonify({'history': []})
    
    history = get_history(tool_type)
    return jsonify({'history': history})


# ==================== INICIO ====================

if __name__ == '__main__':
    # Verificar directorio data
    import os
    os.makedirs('data', exist_ok=True)
    
    print("=" * 50)
    print("  Mi IA Local - Iniciando servidor")
    print("=" * 50)
    print(f"  Dirección: http://{HOST}:{PORT}")
    print(f"  Modelo: {get_current_model()}")
    print(f"  Temperatura: {get_current_temperature()}")
    print(f"  Historial: {'Activado' if get_history_enabled() else 'Desactivado'}")
    print("=" * 50)
    print("  Asegúrate de tener Ollama ejecutándose:")
    print("  $ ollama serve")
    print("=" * 50)
    
    app.run(host=HOST, port=PORT, debug=DEBUG)