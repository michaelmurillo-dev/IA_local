/**
 * Mi IA Local - JavaScript principal
 * Maneja la UI, comunicación con la API y estado de la aplicación
 */

// Estado global de la aplicación
const AppState = {
    currentTool: 'chat',
    chatHistory: [],
    isProcessing: false,
    connectionStatus: 'checking'
};

// Elementos DOM cacheados
const DOM = {};

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    setupEventListeners();
    initCurrentTool();
    checkConnection();
});

/**
 * Cachea referencias a elementos DOM frecuentemente usados
 */
function cacheDOMElements() {
    DOM.sidebar = document.getElementById('sidebar');
    DOM.sidebarToggle = document.getElementById('sidebarToggle');
    DOM.mobileMenuBtn = document.getElementById('mobileMenuBtn');
    DOM.mainContent = document.getElementById('mainContent');
    DOM.pageTitle = document.getElementById('pageTitle');
    DOM.contentArea = document.getElementById('contentArea');
    DOM.loadingOverlay = document.getElementById('loadingOverlay');
    DOM.loadingText = document.getElementById('loadingText');
    DOM.toastContainer = document.getElementById('toastContainer');
    DOM.connectionStatus = document.getElementById('connectionStatus');
    DOM.statusIndicator = document.getElementById('statusIndicator');
    DOM.statusText = document.getElementById('statusText');
    DOM.modelName = document.getElementById('modelName');
    DOM.clearChatBtn = document.getElementById('clearChatBtn');
    DOM.messagesArea = document.getElementById('messagesArea');
    DOM.messagesEnd = document.getElementById('messagesEnd');
    DOM.typingIndicator = document.getElementById('typingIndicator');
    DOM.chatInput = document.getElementById('chatInput');
    DOM.sendBtn = document.getElementById('sendBtn');
}

/**
 * Configura event listeners globales
 */
function setupEventListeners() {
    // Toggle sidebar (desktop)
    if (DOM.sidebarToggle) {
        DOM.sidebarToggle.addEventListener('click', toggleSidebar);
    }
    
    // Mobile menu button
    if (DOM.mobileMenuBtn) {
        DOM.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Cerrar sidebar móvil al hacer click fuera
    document.addEventListener('click', (e) => {
        if (DOM.sidebar && DOM.sidebar.classList.contains('open')) {
            if (!DOM.sidebar.contains(e.target) && 
                !DOM.mobileMenuBtn.contains(e.target)) {
                closeMobileMenu();
            }
        }
    });
    
    // Teclas de acceso rápido
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Auto-resize textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.addEventListener('input', autoResizeTextarea);
    });
    
    // Prevenir envío de formularios con Enter en textareas (excepto chat)
    document.querySelectorAll('textarea:not(#chatInput)').forEach(textarea => {
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey && textarea.id !== 'chatInput') {
                // Permitir Enter normal en otros textareas
            }
        });
    });
}

/**
 * Inicializa la herramienta actual basada en la página
 */
function initCurrentTool() {
    // Detectar herramienta activa desde el botón activo en sidebar
    const activeBtn = document.querySelector('.tool-btn.active');
    if (activeBtn) {
        AppState.currentTool = activeBtn.dataset.tool;
    }
    
    // Inicializar funcionalidad específica de cada herramienta
    switch (AppState.currentTool) {
        case 'chat':
            initChat();
            break;
        case 'translate':
            initTranslate();
            break;
        case 'summarize':
            initSummarize();
            break;
        case 'correct':
            initCorrect();
            break;
        case 'code-help':
            initCodeHelp();
            break;
        case 'settings':
            initSettings();
            break;
    }
    
    // Mostrar/ocultar botón limpiar chat
    updateClearButtonVisibility();
}

/**
 * Maneja atajos de teclado globales
 */
function handleGlobalKeydown(e) {
    // Ctrl/Cmd + K: Focus chat input
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (DOM.chatInput) {
            DOM.chatInput.focus();
        }
    }
    
    // Escape: Cerrar menú móvil, limpiar loading
    if (e.key === 'Escape') {
        closeMobileMenu();
        hideLoading();
    }
}

/**
 * Auto-resize para textareas
 */
function autoResizeTextarea(e) {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 300) + 'px';
}

/* ==================== SIDEBAR & NAVEGACIÓN ==================== */

function toggleSidebar() {
    if (DOM.sidebar) {
        DOM.sidebar.classList.toggle('collapsed');
        const isCollapsed = DOM.sidebar.classList.contains('collapsed');
        DOM.sidebarToggle.setAttribute('aria-expanded', !isCollapsed);
        DOM.sidebarToggle.querySelector('.toggle-icon').textContent = isCollapsed ? '▶' : '◀';
    }
}

function toggleMobileMenu() {
    if (DOM.sidebar) {
        const isOpen = DOM.sidebar.classList.toggle('open');
        DOM.mobileMenuBtn.setAttribute('aria-expanded', isOpen);
        DOM.mobileMenuBtn.querySelector('.hamburger').textContent = isOpen ? '✕' : '☰';
    }
}

function closeMobileMenu() {
    if (DOM.sidebar && DOM.sidebar.classList.contains('open')) {
        DOM.sidebar.classList.remove('open');
        DOM.mobileMenuBtn.setAttribute('aria-expanded', 'false');
        DOM.mobileMenuBtn.querySelector('.hamburger').textContent = '☰';
    }
}

/**
 * Cambia la herramienta activa (solo en index.html)
 */
function switchTool(toolId) {
    if (toolId === 'settings') {
        window.location.href = '/settings';
        return;
    }
    
    // Actualizar botones del sidebar
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === toolId);
        btn.setAttribute('aria-current', btn.dataset.tool === toolId ? 'page' : 'false');
    });
    
    // Ocultar todos los paneles
    document.querySelectorAll('.tool-panel').forEach(panel => {
        panel.hidden = true;
        panel.classList.remove('active');
    });
    
    // Mostrar panel seleccionado
    const newPanel = document.getElementById(`tool-${toolId}`);
    if (newPanel) {
        newPanel.hidden = false;
        newPanel.classList.add('active');
    }
    
    // Actualizar título
    const toolNames = {
        'chat': 'Chat',
        'translate': 'Traducción',
        'summarize': 'Resúmenes',
        'correct': 'Corrector',
        'code-help': 'Programación'
    };
    if (DOM.pageTitle) {
        DOM.pageTitle.textContent = toolNames[toolId] || toolId;
    }
    
    AppState.currentTool = toolId;
    updateClearButtonVisibility();
    closeMobileMenu();
    
    // Inicializar herramienta específica
    switch (toolId) {
        case 'chat':
            initChat();
            break;
        case 'translate':
            initTranslate();
            break;
        case 'summarize':
            initSummarize();
            break;
        case 'correct':
            initCorrect();
            break;

        case 'code-help':
            initCodeHelp();
        break;
    }
}

/**
 * Actualiza visibilidad del botón limpiar
 */
function updateClearButtonVisibility() {
    if (DOM.clearChatBtn) {
        const showClear = ['chat', 'translate', 'summarize', 'correct', 'code-help'].includes(AppState.currentTool);
        DOM.clearChatBtn.style.display = showClear ? 'flex' : 'none';
    }
}

/**
 * Limpia la herramienta actual
 */
function clearCurrentTool() {
    switch (AppState.currentTool) {
        case 'chat':
            clearChat();
            break;
        case 'translate':
            clearTool('translate');
            break;
        case 'summarize':
            clearTool('summarize');
            break;
        case 'correct':
            clearTool('correct');
            break;
        case 'code-help':
            clearTool('code-help');
            break;
    }
}

/* ==================== CONEXIÓN OLLAMA ==================== */

/**
 * Verifica la conexión con Ollama
 */
async function checkConnection() {
    updateConnectionUI('checking', 'Comprobando...');
    
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.connected) {
            updateConnectionUI('connected', 'Conectado');
            if (DOM.modelName) {
                DOM.modelName.textContent = data.current_model || 'Desconocido';
            }
            // Actualizar lista de modelos en settings si existe
            updateAvailableModels(data.models);
        } else {
            updateConnectionUI('disconnected', 'Desconectado');
            showToast('error', data.error || 'No se pudo conectar a Ollama');
        }
    } catch (error) {
        updateConnectionUI('disconnected', 'Error');
        showToast('error', 'Error al verificar conexión: ' + error.message);
    }
}

/**
 * Actualiza UI de estado de conexión
 */
function updateConnectionUI(status, text) {
    AppState.connectionStatus = status;
    
    // Indicador principal
    if (DOM.statusIndicator) {
        DOM.statusIndicator.className = 'status-indicator ' + status;
    }
    if (DOM.statusText) {
        DOM.statusText.textContent = text;
    }
    
    // Indicador en settings (si existe)
    const settingsIndicator = document.getElementById('settingsStatusIndicator');
    const settingsTitle = document.getElementById('settingsStatusTitle');
    const settingsDetail = document.getElementById('settingsStatusDetail');
    
    if (settingsIndicator) {
        settingsIndicator.className = 'status-indicator-large ' + status;
    }
    if (settingsTitle) {
        settingsTitle.textContent = status === 'connected' ? 'Ollama Conectado' : 
                                   status === 'disconnected' ? 'Ollama Desconectado' : 'Comprobando...';
    }
    if (settingsDetail) {
        settingsDetail.textContent = text;
    }
}

/**
 * Actualiza lista de modelos disponibles
 */
function updateAvailableModels(models) {
    const modelsList = document.getElementById('modelsList');
    const availableModels = document.getElementById('availableModels');
    
    if (modelsList && models && models.length > 0) {
        modelsList.innerHTML = models.map(model => 
            `<li>${escapeHtml(model)}</li>`
        ).join('');
        if (availableModels) availableModels.style.display = 'block';
    } else if (availableModels) {
        availableModels.style.display = 'none';
    }
}

/**
 * Comprobación manual de conexión (botón en settings)
 */
async function checkConnectionManual() {
    const btn = document.getElementById('checkConnectionBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span aria-hidden="true">⏳</span> Comprobando...';
    }
    
    await checkConnection();
    
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<span aria-hidden="true">🔄</span> Comprobar conexión';
    }
}

/* ==================== CHAT ==================== */

function initChat() {
    // Cargar historial si existe
    loadChatHistory();
    
    // Focus input
    if (DOM.chatInput) {
        DOM.chatInput.focus();
    }
    
    // Enter para enviar, Shift+Enter para nueva línea
    if (DOM.chatInput) {
        DOM.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
}

async function loadChatHistory() {
    try {
        const response = await fetch('/api/history/chat');
        const data = await response.json();
        if (data.history && data.history.length > 0) {
            // El historial ya se renderiza en el template, pero podríamos recargarlo aquí si fuera necesario
        }
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

async function sendChatMessage() {
    const input = DOM.chatInput;
    const message = input.value.trim();
    
    if (!message || AppState.isProcessing) return;
    
    // Añadir mensaje del usuario a la UI inmediatamente
    appendMessage('user', message);
    input.value = '';
    input.style.height = 'auto';
    
    // Mostrar indicador de escritura
    showTypingIndicator(true);
    setProcessing(true);
    
    try {
        // Preparar historial para contexto
        const history = AppState.chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history })
        });
        
        const data = await response.json();
        
        showTypingIndicator(false);
        
        if (data.success) {
            appendMessage('assistant', data.response);
            // Actualizar historial local
            AppState.chatHistory.push({ role: 'user', content: message });
            AppState.chatHistory.push({ role: 'assistant', content: data.response });
            // Limitar historial
            if (AppState.chatHistory.length > 50) {
                AppState.chatHistory = AppState.chatHistory.slice(-50);
            }
        } else {
            showToast('error', data.error || 'Error en la respuesta');
            appendMessage('assistant', '❌ Error: ' + (data.error || 'Respuesta inválida'));
        }
    } catch (error) {
        showTypingIndicator(false);
        showToast('error', 'Error de conexión: ' + error.message);
        appendMessage('assistant', '❌ Error de conexión. Verifica que Ollama esté ejecutándose.');
    } finally {
        setProcessing(false);
    }
}

function appendMessage(role, content) {
    if (!DOM.messagesArea) return;
    
    // Eliminar mensaje de bienvenida si existe
    const welcome = DOM.messagesArea.querySelector('.welcome-message');
    if (welcome) welcome.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    messageDiv.innerHTML = `
        <div class="message-avatar" aria-hidden="true">${role === 'user' ? '👤' : '🤖'}</div>
        <div class="message-content">
            <div class="message-text markdown-content">${role === 'assistant' ? renderMarkdown(content) : escapeHtml(content)}</div>
            <time class="message-time">${new Date().toLocaleTimeString()}</time>
        </div>
    `;
    
    DOM.messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

function renderMarkdown(text) {
    // Renderizado simple de markdown para código, negrita, cursiva, etc.
    return text
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        // Código en bloque
        .replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => 
            `<pre><code class="language-${lang || ''}">${escapeHtml(code.trim())}</code></pre>`
        )
        // Código inline
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        // Negrita
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Cursiva
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Saltos de línea
        .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showTypingIndicator(show) {
    if (DOM.typingIndicator) {
        DOM.typingIndicator.classList.toggle('active', show);
    }
    if (show) scrollToBottom();
}

function scrollToBottom() {
    if (DOM.messagesEnd) {
        DOM.messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
}

function clearChat() {
    if (confirm('¿Estás seguro de que quieres limpiar el chat?')) {
        // Limpiar UI
        if (DOM.messagesArea) {
            DOM.messagesArea.innerHTML = `
                <div class="welcome-message">
                    <div class="welcome-icon" aria-hidden="true">🤖</div>
                    <h3>¡Bienvenido a Mi IA Local!</h3>
                    <p>Tu asistente de IA privado y completamente local.</p>
                    <p class="welcome-hint">Escribe un mensaje abajo para comenzar.</p>
                </div>
                <div id="messagesEnd"></div>
            `;
            DOM.messagesEnd = document.getElementById('messagesEnd');
        }
        
        // Limpiar historial local
        AppState.chatHistory = [];
        
        // Limpiar en servidor
        fetch('/api/history/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tool_type: 'chat' })
        }).catch(console.error);
        
        showToast('success', 'Chat limpiado');
    }
}

function setProcessing(processing) {
    AppState.isProcessing = processing;
    if (DOM.sendBtn) DOM.sendBtn.disabled = processing;
    if (DOM.chatInput) DOM.chatInput.disabled = processing;
}

/* ==================== HERRAMIENTAS DE TEXTO (Translate, Summarize, Correct) ==================== */

function initTranslate() {
    const input = document.getElementById('translateInput');
    if (input) input.focus();
}

function initSummarize() {
    const input = document.getElementById('summarizeInput');
    if (input) {
        input.focus();
        input.addEventListener('input', () => updateCharCount('summarizeInput', 'summarizeCharCount'));
    }
}

function initCorrect() {
    const input = document.getElementById('correctInput');
    if (input) input.focus();
}

function initCodeHelp() {
    const input = document.getElementById('codeQuestion');
    if (input) input.focus();
}

async function translateText() {
    const input = document.getElementById('translateInput');
    const sourceLang = document.getElementById('translateSource').value;
    const targetLang = document.getElementById('translateTarget').value;
    const output = document.getElementById('translateOutput');
    const btn = document.getElementById('translateBtn');
    
    const text = input.value.trim();
    if (!text) {
        showToast('warning', 'Por favor, ingresa un texto para traducir');
        return;
    }
    
    setToolLoading(btn, true);
    output.value = '';
    
    try {
        const response = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, source_lang: sourceLang, target_lang: targetLang })
        });
        
        const data = await response.json();
        
        if (data.success) {
            output.value = data.translation;
            showToast('success', 'Traducción completada');
        } else {
            showToast('error', data.error || 'Error en la traducción');
        }
    } catch (error) {
        showToast('error', 'Error de conexión: ' + error.message);
    } finally {
        setToolLoading(btn, false);
    }
}

async function summarizeText() {
    const input = document.getElementById('summarizeInput');
    const summaryType = document.querySelector('input[name="summaryType"]:checked').value;
    const output = document.getElementById('summarizeOutput');
    const btn = document.getElementById('summarizeBtn');
    
    const text = input.value.trim();
    if (!text) {
        showToast('warning', 'Por favor, ingresa un texto para resumir');
        return;
    }
    
    setToolLoading(btn, true);
    output.value = '';
    
    try {
        const response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, summary_type: summaryType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            output.value = data.summary;
            showToast('success', 'Resumen generado');
        } else {
            showToast('error', data.error || 'Error en el resumen');
        }
    } catch (error) {
        showToast('error', 'Error de conexión: ' + error.message);
    } finally {
        setToolLoading(btn, false);
    }
}

async function correctText() {
    const input = document.getElementById('correctInput');
    const tone = document.querySelector('input[name="correctionTone"]:checked').value;
    const output = document.getElementById('correctOutput');
    const btn = document.getElementById('correctBtn');
    
    const text = input.value.trim();
    if (!text) {
        showToast('warning', 'Por favor, ingresa un texto para corregir');
        return;
    }
    
    setToolLoading(btn, true);
    output.value = '';
    
    try {
        const response = await fetch('/api/correct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, tone })
        });
        
        const data = await response.json();
        
        if (data.success) {
            output.value = data.corrected;
            showToast('success', 'Texto corregido');
        } else {
            showToast('error', data.error || 'Error en la corrección');
        }
    } catch (error) {
        showToast('error', 'Error de conexión: ' + error.message);
    } finally {
        setToolLoading(btn, false);
    }
}

async function askCodeHelp() {
    const input = document.getElementById('codeQuestion');
    const language = document.getElementById('codeLanguage').value;
    const output = document.getElementById('codeAnswer');
    const btn = document.getElementById('codeHelpBtn');
    
    const question = input.value.trim();
    if (!question) {
        showToast('warning', 'Por favor, ingresa tu pregunta');
        return;
    }
    
    setToolLoading(btn, true);
    output.innerHTML = '<div class="loading-placeholder">Generando respuesta...</div>';
    
    try {
        const response = await fetch('/api/code-help', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, language })
        });
        
        const data = await response.json();
        
        if (data.success) {
            output.innerHTML = renderMarkdown(data.answer);
            showToast('success', 'Respuesta generada');
        } else {
            output.innerHTML = `<div class="error-message">❌ Error: ${escapeHtml(data.error || 'Error desconocido')}</div>`;
            showToast('error', data.error || 'Error en la respuesta');
        }
    } catch (error) {
        output.innerHTML = `<div class="error-message">❌ Error de conexión: ${escapeHtml(error.message)}</div>`;
        showToast('error', 'Error de conexión: ' + error.message);
    } finally {
        setToolLoading(btn, false);
    }
}

function copyCodeOutput() {
    const output = document.getElementById('codeAnswer');
    if (output) {
        copyToClipboardFromElement(output);
    }
}

function clearTool(toolId) {
    const inputs = {
        'translate': ['translateInput', 'translateOutput'],
        'summarize': ['summarizeInput', 'summarizeOutput'],
        'correct': ['correctInput', 'correctOutput'],
        'code-help': ['codeQuestion', 'codeAnswer']
    };
    
    const ids = inputs[toolId] || [];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                el.value = '';
            } else {
                el.innerHTML = '';
            }
        }
    });
    
    // Reset char count
    if (toolId === 'summarize') {
        updateCharCount('summarizeInput', 'summarizeCharCount');
    }
    
    // Focus first input
    const firstInput = document.getElementById(ids[0]);
    if (firstInput) firstInput.focus();
    
    showToast('info', 'Campos limpiados');
}

function swapLanguages() {
    const source = document.getElementById('translateSource');
    const target = document.getElementById('translateTarget');
    
    if (source.value === 'auto') {
        showToast('warning', 'No se puede intercambiar con detección automática');
        return;
    }
    
    const temp = source.value;
    source.value = target.value;
    target.value = temp;
    
    // Animación visual
    const btn = document.getElementById('swapLanguages');
    if (btn) {
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => btn.style.transform = '', 300);
    }
}

function updateCharCount(inputId, countId) {
    const input = document.getElementById(inputId);
    const count = document.getElementById(countId);
    if (input && count) {
        count.textContent = `${input.value.length} caracteres`;
    }
}

function setToolLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = loading;
    if (loading) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = '<span class="spinner-sm"></span> Procesando...';
    } else {
        btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
}

/* ==================== CONFIGURACIÓN ==================== */

function initSettings() {
    // Cargar versiones de Python/Flask si están disponibles
    fetch('/api/status')
        .then(r => r.json())
        .then(data => {
            // Podríamos mostrar info adicional aquí
        });
}

async function saveSettings() {
    const model = document.getElementById('settingModel').value.trim();
    const temperature = parseFloat(document.getElementById('settingTemperature').value);
    const historyEnabled = document.getElementById('settingHistory').checked;
    
    const btn = document.getElementById('saveSettingsBtn');
    setToolLoading(btn, true);
    
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, temperature, history_enabled: historyEnabled })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('success', 'Configuración guardada correctamente');
            // Actualizar modelo mostrado
            if (DOM.modelName && model) {
                DOM.modelName.textContent = model;
            }
            // Recargar conexión para verificar nuevo modelo
            checkConnection();
        } else {
            showToast('error', data.error || 'Error al guardar');
        }
    } catch (error) {
        showToast('error', 'Error de conexión: ' + error.message);
    } finally {
        setToolLoading(btn, false);
    }
}

async function clearAllHistory() {
    if (confirm('¿Estás seguro de que quieres eliminar TODO el historial? Esta acción no se puede deshacer.')) {
        try {
            const response = await fetch('/api/history/clear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            
            if (data.success) {
                showToast('success', 'Historial eliminado completamente');
                // Recargar página si estamos en index para actualizar chat
                if (AppState.currentTool === 'chat') {
                    setTimeout(() => window.location.reload(), 1000);
                }
            } else {
                showToast('error', data.error || 'Error al limpiar');
            }
        } catch (error) {
            showToast('error', 'Error de conexión: ' + error.message);
        }
    }
}

/* ==================== UTILIDADES COMUNES ==================== */

/**
 * Copia texto al portapapeles
 */
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.value || element.textContent;
    copyTextToClipboard(text, elementId);
}

function copyToClipboardFromElement(element) {
    const text = element.textContent;
    copyTextToClipboard(text, 'output');
}

async function copyTextToClipboard(text, buttonId) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('success', 'Copiado al portapapeles');
        
        // Feedback visual en botón
        const btn = document.getElementById('copy' + buttonId.charAt(0).toUpperCase() + buttonId.slice(1)) ||
                    document.querySelector(`[onclick*="${buttonId}"]`);
        if (btn) {
            btn.classList.add('copied');
            btn.innerHTML = '<span aria-hidden="true">✓</span>';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = '<span aria-hidden="true">📋</span>';
            }, 2000);
        }
    } catch (error) {
        // Fallback para navegadores sin clipboard API
        fallbackCopyText(text);
        showToast('success', 'Copiado al portapapeles');
    }
}

function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (e) {
        console.error('Fallback copy failed:', e);
    }
    document.body.removeChild(textarea);
}

/**
 * Muestra notificación toast
 */
function showToast(type, message) {
    if (!DOM.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
        <button class="toast-close" aria-label="Cerrar" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300);">✕</button>
    `;
    
    DOM.toastContainer.appendChild(toast);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

/**
 * Loading overlay global
 */
function showLoading(text = 'Procesando...') {
    if (DOM.loadingOverlay && DOM.loadingText) {
        DOM.loadingText.textContent = text;
        DOM.loadingOverlay.classList.add('active');
        DOM.loadingOverlay.setAttribute('aria-hidden', 'false');
    }
}

function hideLoading() {
    if (DOM.loadingOverlay) {
        DOM.loadingOverlay.classList.remove('active');
        DOM.loadingOverlay.setAttribute('aria-hidden', 'true');
    }
}

// Exportar funciones globales necesarias para onclick en HTML
window.switchTool = switchTool;
window.clearCurrentTool = clearCurrentTool;
window.clearTool = clearTool;
window.sendChatMessage = sendChatMessage;
window.translateText = translateText;
window.summarizeText = summarizeText;
window.correctText = correctText;
window.askCodeHelp = askCodeHelp;
window.copyToClipboard = copyToClipboard;
window.copyCodeOutput = copyCodeOutput;
window.swapLanguages = swapLanguages;
window.updateCharCount = updateCharCount;
window.checkConnection = checkConnection;
window.checkConnectionManual = checkConnectionManual;
window.saveSettings = saveSettings;
window.clearAllHistory = clearAllHistory;
window.clearChat = clearChat;