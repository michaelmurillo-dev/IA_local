"""
Servicio para comunicarse con Ollama API local.
"""
import requests
import json
from config import (
    OLLAMA_API_GENERATE,
    OLLAMA_API_TAGS,
    DEFAULT_MODEL,
    DEFAULT_TEMPERATURE,
    REQUEST_TIMEOUT,
    MAX_TEXT_LENGTH
)


class OllamaError(Exception):
    """Excepción personalizada para errores de Ollama."""
    pass


class OllamaService:
    """Servicio centralizado para interactuar con Ollama."""
    
    def __init__(self, model=None, temperature=None):
        self.model = model or DEFAULT_MODEL
        self.temperature = temperature if temperature is not None else DEFAULT_TEMPERATURE
    
    def set_model(self, model):
        """Cambia el modelo a utilizar."""
        self.model = model
    
    def set_temperature(self, temperature):
        """Cambia la temperatura."""
        self.temperature = max(0.0, min(1.0, float(temperature)))
    
    def check_connection(self):
        """
        Verifica la conexión con Ollama y lista modelos disponibles.
        
        Returns:
            dict: {'connected': bool, 'models': list, 'error': str or None}
        """
        try:
            response = requests.get(OLLAMA_API_TAGS, timeout=5)
            response.raise_for_status()
            data = response.json()
            models = [m['name'] for m in data.get('models', [])]
            return {
                'connected': True,
                'models': models,
                'error': None
            }
        except requests.exceptions.ConnectionError:
            return {
                'connected': False,
                'models': [],
                'error': 'No se puede conectar a Ollama. Verifica que esté ejecutándose en http://localhost:11434'
            }
        except requests.exceptions.Timeout:
            return {
                'connected': False,
                'models': [],
                'error': 'Tiempo de espera agotado al conectar con Ollama'
            }
        except requests.exceptions.RequestException as e:
            return {
                'connected': False,
                'models': [],
                'error': f'Error de conexión con Ollama: {str(e)}'
            }
        except (json.JSONDecodeError, KeyError) as e:
            return {
                'connected': False,
                'models': [],
                'error': f'Respuesta inválida de Ollama: {str(e)}'
            }
    
    def validate_input(self, text, max_length=MAX_TEXT_LENGTH):
        """Valida la entrada de texto."""
        if not text or not text.strip():
            raise OllamaError('El texto de entrada no puede estar vacío')
        
        if len(text) > max_length:
            raise OllamaError(f'El texto excede el límite de {max_length} caracteres')
        
        return text.strip()
    
    def generate(self, prompt, system=None, model=None, temperature=None):
        """
        Genera una respuesta usando Ollama.
        
        Args:
            prompt (str): El prompt principal
            system (str, optional): Prompt del sistema
            model (str, optional): Modelo a usar (override)
            temperature (float, optional): Temperatura (override)
            
        Returns:
            str: La respuesta generada
            
        Raises:
            OllamaError: Si hay algún error en la generación
        """
        # Validar entradas
        prompt = self.validate_input(prompt)
        
        if system:
            system = self.validate_input(system, max_length=2000)
        
        # Usar valores por defecto o overrides
        used_model = model or self.model
        used_temperature = temperature if temperature is not None else self.temperature
        
        # Construir payload
        payload = {
            'model': used_model,
            'prompt': prompt,
            'stream': False,
            'options': {
                'temperature': used_temperature
            }
        }
        
        if system:
            payload['system'] = system
        
        try:
            response = requests.post(
                OLLAMA_API_GENERATE,
                json=payload,
                timeout=REQUEST_TIMEOUT
            )
            response.raise_for_status()
            data = response.json()
            
            # Validar respuesta
            if 'response' not in data:
                raise OllamaError('Respuesta inválida de Ollama: falta campo "response"')
            
            return data['response'].strip()
            
        except requests.exceptions.ConnectionError:
            raise OllamaError(
                'No se puede conectar a Ollama. '
                'Verifica que Ollama esté ejecutándose (ollama serve)'
            )
        except requests.exceptions.Timeout:
            raise OllamaError(
                f'Tiempo de espera agotado ({REQUEST_TIMEOUT}s). '
                'El modelo puede estar cargando o el texto es muy largo.'
            )
        except requests.exceptions.RequestException as e:
            raise OllamaError(f'Error en la solicitud a Ollama: {str(e)}')
        except json.JSONDecodeError:
            raise OllamaError('Respuesta inválida de Ollama (no es JSON válido)')
        except KeyError as e:
            raise OllamaError(f'Respuesta inválida de Ollama: campo faltante {e}')


# Instancia global por defecto
default_service = OllamaService()