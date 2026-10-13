"""
Módulo de base de datos SQLite para Mi IA Local.
"""
import sqlite3
import os
from datetime import datetime
from config import DATABASE_PATH, MAX_HISTORY_MESSAGES


def get_db_connection():
    """Obtiene una conexión a la base de datos SQLite."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Inicializa la base de datos creando las tablas necesarias."""
    # Asegurar que el directorio data existe
    os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tabla de historial de conversaciones
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_type TEXT NOT NULL,
            user_input TEXT NOT NULL,
            ai_response TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabla de configuración
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()


def save_history(tool_type, user_input, ai_response):
    """Guarda una entrada en el historial."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO history (tool_type, user_input, ai_response)
        VALUES (?, ?, ?)
    ''', (tool_type, user_input, ai_response))
    conn.commit()
    conn.close()


def get_history(tool_type=None, limit=MAX_HISTORY_MESSAGES):
    """Obtiene el historial de conversaciones."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if tool_type:
        cursor.execute('''
            SELECT * FROM history 
            WHERE tool_type = ? 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (tool_type, limit))
    else:
        cursor.execute('''
            SELECT * FROM history 
            ORDER BY created_at DESC 
            LIMIT ?
        ''', (limit,))
    
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in reversed(rows)]  # Orden cronológico


def clear_history(tool_type=None):
    """Limpia el historial."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if tool_type:
        cursor.execute('DELETE FROM history WHERE tool_type = ?', (tool_type,))
    else:
        cursor.execute('DELETE FROM history')
    
    conn.commit()
    conn.close()


def get_setting(key, default=None):
    """Obtiene un valor de configuración."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
    row = cursor.fetchone()
    conn.close()
    
    return row['value'] if row else default


def set_setting(key, value):
    """Guarda un valor de configuración."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO settings (key, value)
        VALUES (?, ?)
    ''', (key, value))
    conn.commit()
    conn.close()


def get_all_settings():
    """Obtiene toda la configuración."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM settings')
    rows = cursor.fetchall()
    conn.close()
    
    return {row['key']: row['value'] for row in rows}


# Inicializar base de datos al importar
init_database()