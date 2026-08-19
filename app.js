'use strict';

/* ================================================================
   MANDALA ENSAMBLES – Panel Central v1.0
   app.js – Lógica principal
   ================================================================ */

/* ----------------------------------------------------------------
   CONSTANTES
   ---------------------------------------------------------------- */
const STORAGE_KEY = 'mdl_central_config_v1';

/** Emojis sugeridos en el panel de configuración */
const EMOJI_SUGGESTIONS = [
    '🎓','📚','✏️','📝','🏫','👩‍🏫','👨‍🏫','👥',
    '🎵','🎼','🎹','🎸','🥁','🎺','🎻','🎤',
    '💳','🧾','💰','📊','📈','📅','🗓️','📋',
    '📌','🔔','⭐','🏆','🎯','🔑','💼','📁',
    '🖥️','📱','✅','🌟','🔧','⚙️','🏠','👤'
];

/** Configuración por defecto (primera vez que se abre la app) */
function buildDefaultConfig() {
    return {
        modules: [
            {
                id: generateId(),
                title: 'Admisión',
                description: 'Admisión de nuevos alumnos',
                emoji: '🎓',
                url: ''
            },
            {
                id: generateId(),
                title: 'Suscripciones y Facturación',
                description: 'Pagos, cuotas y comprobantes',
                emoji: '🧾',
                url: ''
            },
            {
                id: generateId(),
                title: 'Docentes',
                description: 'Gestión de profesores y clases',
                emoji: '👩‍🏫',
                url: ''
            }
        ]
    };
}

/* ----------------------------------------------------------------
   ESTADO DE LA APP
   ---------------------------------------------------------------- */
let appConfig = { modules: [] };  // Config activa
let draftConfig = null;           // Copia de trabajo dentro del modal
let toastTimer = null;

/* ================================================================
   ARRANQUE
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    renderModules();
    bindGlobalEvents();
    registerServiceWorker();
});

/* ================================================================
   CONFIGURACIÓN – LocalStorage
   ================================================================ */
function loadConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
                appConfig = parsed;
                return;
            }
        }
    } catch (err) {
        console.warn('[MDL Central] Error al leer config:', err);
    }
    // Primera vez: cargar defaults
    appConfig = buildDefaultConfig();
}

function saveConfig() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appConfig));
    } catch (err) {
        console.error('[MDL Central] Error al guardar config:', err);
        showToast('⚠️ No se pudo guardar. Revisá los permisos del navegador.');
    }
}

/* ================================================================
   RENDER – Tarjetas de módulos
   ================================================================ */
function renderModules() {
    const grid = document.getElementById('modules-grid');
    grid.innerHTML = '';

    if (appConfig.modules.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'No hay módulos configurados. Hacé clic en "Configurar" para agregar.';
        grid.appendChild(p);
        return;
    }

    appConfig.modules.forEach((mod) => {
        grid.appendChild(buildCard(mod));
    });
}

function buildCard(mod) {
    const hasUrl = Boolean(mod.url && mod.url.trim());

    const card = document.createElement('div');
    card.className = 'module-card' + (hasUrl ? '' : ' unconfigured');
    card.setAttribute('role', hasUrl ? 'link' : 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute(
        'aria-label',
        `${mod.title}${hasUrl ? '' : ' – sin configurar'}`
    );

    card.innerHTML = `
        <div class="card-icon">
            <span class="card-emoji" aria-hidden="true">${escHtml(mod.emoji)}</span>
        </div>
        <div class="card-title">${escHtml(mod.title)}</div>
        <div class="card-description">${escHtml(mod.description)}</div>
        ${!hasUrl ? '<div class="card-badge">Sin configurar</div>' : ''}
    `;

    const activate = () => {
        if (!hasUrl) {
            showToast('Este módulo no tiene una URL configurada aún.');
            return;
        }
        window.open(mod.url.trim(), '_blank', 'noopener,noreferrer');
    };

    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
        }
    });

    return card;
}

/* ================================================================
   TOAST
   ================================================================ */
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

/* ================================================================
   MODAL – Abrir / Cerrar / Guardar
   ================================================================ */
function openModal() {
    // Clonar config activa para edición sin afectar la original
    draftConfig = JSON.parse(JSON.stringify(appConfig));
    renderEditor();
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('btn-close-modal').focus();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    draftConfig = null;
}

function saveModal() {
    // Normalizar valores
    draftConfig.modules = draftConfig.modules.map((m) => ({
        ...m,
        title:       (m.title       || '').trim(),
        description: (m.description || '').trim(),
        emoji:       (m.emoji       || '⭐').trim() || '⭐',
        url:         (m.url         || '').trim()
    }));

    // Validar: título obligatorio en todos los módulos
    const sinTitulo = draftConfig.modules.find((m) => !m.title);
    if (sinTitulo) {
        showToast('⚠️ Todos los módulos deben tener un título.');
        return;
    }

    // Aplicar y persistir
    appConfig = draftConfig;
    saveConfig();
    renderModules();
    closeModal();
    showToast('✓ Configuración guardada');
}

/* ================================================================
   EDITOR DE MÓDULOS – Render
   ================================================================ */
function renderEditor() {
    const editor = document.getElementById('modules-editor');
    editor.innerHTML = '';
    draftConfig.modules.forEach((mod, idx) => {
        editor.appendChild(buildEditorRow(mod, idx));
    });
}

function buildEditorRow(mod, idx) {
    const row = document.createElement('div');
    row.className = 'module-editor-row';
    row.dataset.id = mod.id;

    // Grilla de emojis sugeridos
    const suggestionsHtml = EMOJI_SUGGESTIONS
        .map((e) => `<button type="button" class="emoji-btn" data-emoji="${e}" title="${e}" aria-label="Seleccionar emoji ${e}">${e}</button>`)
        .join('');

    row.innerHTML = `
        <div class="editor-row-header">
            <span class="editor-row-number">${idx + 1}</span>
            <span class="editor-row-title">${escHtml(mod.title) || 'Nuevo módulo'}</span>
            <button type="button" class="btn-delete-module" title="Eliminar módulo" aria-label="Eliminar módulo ${escHtml(mod.title)}">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6l-1 14H6L5 6"></path>
                    <path d="M10 11v6M14 11v6M9 6V4h6v2"></path>
                </svg>
            </button>
        </div>

        <div class="editor-fields">

            <!-- EMOJI -->
            <div class="field-group">
                <label for="emoji-${mod.id}">Ícono (emoji)</label>
                <div class="emoji-input-wrapper">
                    <input
                        id="emoji-${mod.id}"
                        type="text"
                        class="input-emoji"
                        value="${escHtml(mod.emoji)}"
                        placeholder="🎓"
                        aria-label="Emoji del módulo"
                        autocomplete="off"
                        spellcheck="false"
                    >
                    <div class="emoji-preview" aria-hidden="true">${escHtml(mod.emoji)}</div>
                </div>
                <p class="emoji-hint">Escribí, pegá o elegí de la grilla:</p>
                <div class="emoji-suggestions" role="group" aria-label="Emojis sugeridos">
                    ${suggestionsHtml}
                </div>
            </div>

            <!-- TÍTULO -->
            <div class="field-group">
                <label for="title-${mod.id}">Título</label>
                <input
                    id="title-${mod.id}"
                    type="text"
                    class="input-text"
                    value="${escHtml(mod.title)}"
                    placeholder="Nombre del módulo"
                    data-field="title"
                    autocomplete="off"
                    maxlength="60"
                >
            </div>

            <!-- DESCRIPCIÓN -->
            <div class="field-group">
                <label for="desc-${mod.id}">Descripción</label>
                <input
                    id="desc-${mod.id}"
                    type="text"
                    class="input-text"
                    value="${escHtml(mod.description)}"
                    placeholder="Descripción breve del módulo"
                    data-field="description"
                    autocomplete="off"
                    maxlength="100"
                >
            </div>

            <!-- URL -->
            <div class="field-group">
                <label for="url-${mod.id}">URL de acceso</label>
                <input
                    id="url-${mod.id}"
                    type="url"
                    class="input-text"
                    value="${escHtml(mod.url)}"
                    placeholder="https://..."
                    data-field="url"
                    autocomplete="off"
                    inputmode="url"
                >
            </div>

        </div>
    `;

    /* ---- Bindings de la fila ---- */
    const emojiInput   = row.querySelector('.input-emoji');
    const emojiPreview = row.querySelector('.emoji-preview');

    // Input de emoji: extraer el primer grapheme al escribir
    emojiInput.addEventListener('input', () => {
        const val = getFirstGrapheme(emojiInput.value) || '⭐';
        emojiInput.value = val;
        emojiPreview.textContent = val;
        updateDraft(mod.id, 'emoji', val);
    });

    // Click en emoji sugerido
    row.querySelectorAll('.emoji-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const emoji = btn.dataset.emoji;
            emojiInput.value = emoji;
            emojiPreview.textContent = emoji;
            updateDraft(mod.id, 'emoji', emoji);
        });
    });

    // Campos de texto (título, descripción, url)
    row.querySelectorAll('.input-text').forEach((input) => {
        input.addEventListener('input', () => {
            const field = input.dataset.field;
            updateDraft(mod.id, field, input.value);
            // Actualizar encabezado de la fila si cambia el título
            if (field === 'title') {
                const headerTitle = row.querySelector('.editor-row-title');
                if (headerTitle) headerTitle.textContent = input.value || 'Nuevo módulo';
            }
        });
    });

    // Botón eliminar
    row.querySelector('.btn-delete-module').addEventListener('click', () => {
        if (draftConfig.modules.length <= 1) {
            showToast('Debe haber al menos un módulo.');
            return;
        }
        draftConfig.modules = draftConfig.modules.filter((m) => m.id !== mod.id);
        renderEditor();
    });

    return row;
}

/** Actualiza un campo del módulo en el draftConfig */
function updateDraft(id, field, value) {
    const mod = draftConfig.modules.find((m) => m.id === id);
    if (mod) mod[field] = value;
}

/** Agrega un nuevo módulo vacío al draft y re-renderiza el editor */
function addNewModule() {
    const newMod = {
        id: generateId(),
        title: 'Nuevo módulo',
        description: '',
        emoji: '⭐',
        url: ''
    };
    draftConfig.modules.push(newMod);
    renderEditor();
    // Hacer scroll al final para ver el módulo recién creado
    requestAnimationFrame(() => {
        const editor = document.getElementById('modules-editor');
        editor.scrollTo({ top: editor.scrollHeight, behavior: 'smooth' });
    });
}

/* ================================================================
   EVENTOS GLOBALES
   ================================================================ */
function bindGlobalEvents() {
    document.getElementById('btn-config').addEventListener('click', openModal);
    document.getElementById('btn-close-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal').addEventListener('click', closeModal);
    document.getElementById('btn-save-modal').addEventListener('click', saveModal);
    document.getElementById('btn-add-module').addEventListener('click', addNewModule);

    // Cerrar al hacer click en el overlay (fuera del modal)
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'Escape' &&
            !document.getElementById('modal-overlay').classList.contains('hidden')
        ) {
            closeModal();
        }
    });
}

/* ================================================================
   UTILIDADES
   ================================================================ */

/** Escapa caracteres HTML para evitar XSS */
function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

/**
 * Extrae el primer grapheme (carácter visible) de un string.
 * Usa Intl.Segmenter para manejar emojis multi-codepoint correctamente.
 * Fallback simple para navegadores sin soporte.
 */
function getFirstGrapheme(str) {
    if (!str) return '';
    try {
        const segmenter = new Intl.Segmenter('es', { granularity: 'grapheme' });
        const [first] = segmenter.segment(str);
        return first?.segment || str;
    } catch {
        // Fallback: retornar máximo 8 chars (cubre emojis compuestos)
        return str.slice(0, 8);
    }
}

/** Genera un ID único corto */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ================================================================
   SERVICE WORKER
   ================================================================ */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js')
            .catch(() => { /* no service worker en dev local sin HTTPS */ });
    }
}
