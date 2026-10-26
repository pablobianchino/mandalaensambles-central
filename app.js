'use strict';

/* ================================================================
   MANDALA ENSAMBLES – Panel Central v1.2
   app.js – Integración Cloud Firestore en tiempo real
   ================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

/* ----------------------------------------------------------------
   CONFIGURACIÓN FIREBASE (Mandala Ensambles)
   ---------------------------------------------------------------- */
const firebaseConfig = {
    apiKey: "AIzaSyCgAg2EwTJh4zbMdpkqG3VKTGfDeofblyg",
    authDomain: "priel-mdl-seguimientos.firebaseapp.com",
    projectId: "priel-mdl-seguimientos",
    storageBucket: "priel-mdl-seguimientos.firebasestorage.app",
    messagingSenderId: "118730133451",
    appId: "1:118730133451:web:9e407e81a9b22ae9d0704e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const CONFIG_DOC_REF = doc(db, "config_app_central", "portal_central");

/* ----------------------------------------------------------------
   CATÁLOGO DE ÍCONOS VECTORIALES (SVG NÍTIDOS)
   ---------------------------------------------------------------- */
const ICON_CATALOG = {
    'graduation-cap': {
        name: 'Admisión / Graduación',
        svg: `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>`
    },
    'receipt': {
        name: 'Facturación / Recibo',
        svg: `<svg viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"></path><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 17V7"></path></svg>`
    },
    'banknote': {
        name: 'Dinero / Efectivo',
        svg: `<svg viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="6" rx="2"></rect><circle cx="12" cy="12" r="2"></circle><path d="M6 12h.01M18 12h.01"></path></svg>`
    },
    'dollar-sign': {
        name: 'Moneda / Aranceles ($)',
        svg: `<svg viewBox="0 0 24 24"><line x1="12" x2="12" y1="2" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`
    },
    'wallet': {
        name: 'Billetera / Cobranzas',
        svg: `<svg viewBox="0 0 24 24"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path></svg>`
    },
    'party-popper': {
        name: 'Fiesta / Celebración',
        svg: `<svg viewBox="0 0 24 24"><path d="M5.8 11.3 2 22l10.7-3.79"></path><path d="M4 3h.01"></path><path d="M22 8h.01"></path><path d="M15 2h.01"></path><path d="M22 20h.01"></path><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38e-7c-.8 0-1.46.6-1.57 1.4a3 3 0 0 1-2.4 2.5l-.23.04c-.8.14-1.37.82-1.37 1.64v.05c0 .92-.77 1.66-1.69 1.61l-.96-.06a3 3 0 0 0-2.92 1.94L5 18"></path><path d="M11 2v3"></path><path d="M18 13l2.5 2.5"></path></svg>`
    },
    'ticket': {
        name: 'Entradas / Eventos',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path><path d="M13 5v2"></path><path d="M13 11v2"></path><path d="M13 17v2"></path></svg>`
    },
    'sparkles': {
        name: 'Gala / Festival Destacado',
        svg: `<svg viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>`
    },
    'stage': {
        name: 'Escenario / Show / Festival',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 19h20"></path><path d="M4 19l4-8h8l4 8"></path><circle cx="12" cy="7" r="3"></circle><path d="M9 11h6"></path></svg>`
    },
    'presentation': {
        name: 'Docentes / Clases',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 3h20"></path><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"></path><path d="m7 21 5-5 5 5"></path><path d="M9 7h6"></path><path d="M9 11h3"></path></svg>`
    },
    'credit-card': {
        name: 'Tarjeta / Pagos',
        svg: `<svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>`
    },
    'users': {
        name: 'Alumnos / Comunidad',
        svg: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`
    },
    'music': {
        name: 'Música / Ensambles',
        svg: `<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`
    },
    'calendar': {
        name: 'Horarios / Fechas',
        svg: `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>`
    },
    'book-open': {
        name: 'Partituras / Biblioteca',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`
    },
    'award': {
        name: 'Certificados / Festivales / Premios',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`
    },
    'headphones': {
        name: 'Audio / Ensayos',
        svg: `<svg viewBox="0 0 24 24"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"></path></svg>`
    },
    'mail': {
        name: 'Inbox / Contacto',
        svg: `<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>`
    },
    'folder': {
        name: 'Archivos / Material',
        svg: `<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"></path></svg>`
    }
};

/* ----------------------------------------------------------------
   CONSTANTES & PERSISTENCIA LOCAL
   ---------------------------------------------------------------- */
const STORAGE_KEY = 'mdl_central_config_v2';

function buildDefaultConfig() {
    return {
        modules: [
            {
                id: generateId(),
                title: 'Admisión',
                description: 'Admisión de nuevos alumnos',
                icon: 'graduation-cap',
                url: ''
            },
            {
                id: generateId(),
                title: 'Suscripciones y Facturación',
                description: 'Pagos, cuotas y comprobantes',
                icon: 'receipt',
                url: ''
            },
            {
                id: generateId(),
                title: 'Docentes',
                description: 'Gestión de profesores y clases',
                icon: 'presentation',
                url: ''
            }
        ]
    };
}

/* ----------------------------------------------------------------
   ESTADO DE LA APP
   ---------------------------------------------------------------- */
let appConfig = { modules: [] };
let draftConfig = null;
let toastTimer = null;
let isModalOpen = false;

/* ================================================================
   ARRANQUE
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    loadLocalFallback();
    renderModules();
    bindGlobalEvents();
    initFirebaseSync();
    registerServiceWorker();
});

/* ================================================================
   SINCRONIZACIÓN CON FIREBASE FIRESTORE
   ================================================================ */
async function initFirebaseSync() {
    // Función auxiliar para actualizar config y re-renderizar
    const applyRemoteModules = (modules) => {
        if (!Array.isArray(modules) || modules.length === 0) return;
        appConfig = { modules };
        saveLocal(appConfig);
        if (!isModalOpen) {
            renderModules();
        }
    };

    // Intentamos primero la colección principal 'config_app_central' y luego el fallback 'configuraciones'
    const tryFetch = async (collectionName) => {
        const ref = doc(db, collectionName, "portal_central");
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            if (data && Array.isArray(data.modules) && data.modules.length > 0) {
                console.log(`[MDL Central] Módulos cargados con éxito desde '${collectionName}'`);
                applyRemoteModules(data.modules);
                return ref;
            }
        }
        return null;
    };

    try {
        let activeRef = await tryFetch("config_app_central");
        if (!activeRef) {
            activeRef = await tryFetch("configuraciones");
        }

        const listenerRef = activeRef || CONFIG_DOC_REF;

        onSnapshot(listenerRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data && Array.isArray(data.modules) && data.modules.length > 0) {
                    applyRemoteModules(data.modules);
                }
            }
        }, (err) => {
            console.warn('[MDL Central] Listener Firestore:', err);
            const dot = document.querySelector('.app-version-dot');
            if (dot) {
                dot.classList.add('error');
                dot.parentElement.title = 'Aviso: Permiso de Firestore denegado. Revisar Reglas en Firebase Console.';
            }
        });
    } catch (err) {
        console.warn('[MDL Central] Error al sincronizar con Firestore:', err);
        const dot = document.querySelector('.app-version-dot');
        if (dot) {
            dot.classList.add('error');
            dot.parentElement.title = 'Aviso: Permiso de Firestore denegado. Revisar Reglas en Firebase Console.';
        }
    }
}

/* ================================================================
   FALLBACK LOCALSTORAGE
   ================================================================ */
function loadLocalFallback() {
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
        console.warn('[MDL Central] Error al leer local storage:', err);
    }
    appConfig = buildDefaultConfig();
}

function saveLocal(config) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (err) {
        console.warn('[MDL Central] Error al guardar local storage:', err);
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

function renderIconHtml(iconKey) {
    if (ICON_CATALOG[iconKey]) {
        return ICON_CATALOG[iconKey].svg;
    }
    return `<span class="card-emoji-text">${escHtml(iconKey || '⭐')}</span>`;
}

function buildCard(mod) {
    const rawUrl = (mod.url || '').trim();
    const hasUrl = Boolean(rawUrl);

    // Si tiene URL, usamos etiqueta <a> con target="_blank" para garantizar apertura en nueva pestaña en cualquier dispositivo
    const card = document.createElement(hasUrl ? 'a' : 'div');
    card.className = 'module-card' + (hasUrl ? '' : ' unconfigured');

    if (hasUrl) {
        card.href = rawUrl;
        card.target = '_blank';
        // 'opener' en lugar de 'noopener' ayuda a los navegadores a no interpretarlo como lanzamiento aislado de PWA/standalone window
        card.rel = 'noreferrer';
    } else {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
    }

    card.setAttribute(
        'aria-label',
        `${mod.title}${hasUrl ? '' : ' – sin configurar'}`
    );

    const iconHtml = renderIconHtml(mod.icon || 'graduation-cap');

    card.innerHTML = `
        <div class="card-icon">
            ${iconHtml}
        </div>
        <div class="card-title">${escHtml(mod.title)}</div>
        <div class="card-description">${escHtml(mod.description)}</div>
        ${!hasUrl ? '<div class="card-badge">Sin configurar</div>' : ''}
    `;

    if (!hasUrl) {
        const notifyNoUrl = (e) => {
            if (e) e.preventDefault();
            showToast('Este módulo no tiene una URL configurada aún.');
        };
        card.addEventListener('click', notifyNoUrl);
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                notifyNoUrl(e);
            }
        });
    }

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
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

/* ================================================================
   MODAL – Abrir / Cerrar / Guardar
   ================================================================ */
function openModal() {
    isModalOpen = true;
    draftConfig = JSON.parse(JSON.stringify(appConfig));
    renderEditor();
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('btn-close-modal').focus();
}

function closeModal() {
    isModalOpen = false;
    document.getElementById('modal-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    draftConfig = null;
}

async function saveModal() {
    const saveBtn = document.getElementById('btn-save-modal');
    const originalBtnText = saveBtn.textContent;

    draftConfig.modules = draftConfig.modules.map((m) => ({
        ...m,
        title:       (m.title       || '').trim(),
        description: (m.description || '').trim(),
        icon:        (m.icon        || 'graduation-cap').trim() || 'graduation-cap',
        url:         (m.url         || '').trim()
    }));

    const sinTitulo = draftConfig.modules.find((m) => !m.title);
    if (sinTitulo) {
        showToast('⚠️ Todos los módulos deben tener un título.');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        // 1. Guardar localmente de inmediato
        appConfig = draftConfig;
        saveLocal(appConfig);
        renderModules();

        // 2. Guardar en Firestore (Nube)
        await setDoc(CONFIG_DOC_REF, {
            modules: appConfig.modules,
            updatedAt: new Date().toISOString()
        });

        closeModal();
        showToast('Cambio realizado correctamente');
    } catch (err) {
        console.error('Error al guardar en Firestore:', err);
        closeModal();
        showToast('Guardado local (Aviso: Firestore bloqueó el permiso)');
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
    }
}

/* ================================================================
   EDITOR DE MÓDULOS (MODAL)
   ================================================================ */
function renderEditor() {
    const editor = document.getElementById('modules-editor');
    editor.innerHTML = '';
    draftConfig.modules.forEach((mod, idx) => {
        editor.appendChild(buildEditorRow(mod, idx));
    });
}

function moveModuleOrder(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= draftConfig.modules.length || fromIdx === toIdx) return;
    const [item] = draftConfig.modules.splice(fromIdx, 1);
    draftConfig.modules.splice(toIdx, 0, item);
    renderEditor();
}

function buildEditorRow(mod, idx) {
    const row = document.createElement('div');
    row.className = 'module-editor-row';
    row.dataset.id = mod.id;

    const totalModules = draftConfig.modules.length;
    const isFirst = idx === 0;
    const isLast = idx === totalModules - 1;

    /* ---- Encabezado de la fila ---- */
    const header = document.createElement('div');
    header.className = 'editor-row-header';
    header.innerHTML = `
        <span class="editor-row-number">${idx + 1}</span>
        <span class="editor-row-title">${escHtml(mod.title) || 'Nuevo módulo'}</span>
        <div class="editor-row-order-actions">
            <button type="button" class="btn-order-module btn-move-up" title="Mover arriba" aria-label="Mover arriba ${escHtml(mod.title)}" ${isFirst ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </button>
            <button type="button" class="btn-order-module btn-move-down" title="Mover abajo" aria-label="Mover abajo ${escHtml(mod.title)}" ${isLast ? 'disabled' : ''}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
        </div>
        <button type="button" class="btn-delete-module" title="Eliminar módulo" aria-label="Eliminar módulo ${escHtml(mod.title)}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6M14 11v6M9 6V4h6v2"></path>
            </svg>
        </button>
    `;
    row.appendChild(header);

    const btnUp = header.querySelector('.btn-move-up');
    const btnDown = header.querySelector('.btn-move-down');
    if (btnUp && !isFirst) {
        btnUp.addEventListener('click', () => moveModuleOrder(idx, idx - 1));
    }
    if (btnDown && !isLast) {
        btnDown.addEventListener('click', () => moveModuleOrder(idx, idx + 1));
    }

    /* ---- Contenedor de campos (sin scroll interno) ---- */
    const fields = document.createElement('div');
    fields.className = 'editor-fields';

    /* 1. CAMPO: TÍTULO */
    const titleGroup = document.createElement('div');
    titleGroup.className = 'field-group';
    const titleLabel = document.createElement('label');
    titleLabel.setAttribute('for', `title-${mod.id}`);
    titleLabel.textContent = 'Título';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = `title-${mod.id}`;
    titleInput.className = 'input-text';
    titleInput.value = mod.title || '';
    titleInput.placeholder = 'Ej: Admisión';
    titleInput.autocomplete = 'off';
    titleInput.maxLength = 60;
    titleGroup.appendChild(titleLabel);
    titleGroup.appendChild(titleInput);
    fields.appendChild(titleGroup);

    /* 2. CAMPO: DESCRIPCIÓN */
    const descGroup = document.createElement('div');
    descGroup.className = 'field-group';
    const descLabel = document.createElement('label');
    descLabel.setAttribute('for', `desc-${mod.id}`);
    descLabel.textContent = 'Descripción';
    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.id = `desc-${mod.id}`;
    descInput.className = 'input-text';
    descInput.value = mod.description || '';
    descInput.placeholder = 'Ej: Admisión de nuevos alumnos';
    descInput.autocomplete = 'off';
    descInput.maxLength = 100;
    descGroup.appendChild(descLabel);
    descGroup.appendChild(descInput);
    fields.appendChild(descGroup);

    /* 3. CAMPO: URL */
    const urlGroup = document.createElement('div');
    urlGroup.className = 'field-group';
    const urlLabel = document.createElement('label');
    urlLabel.setAttribute('for', `url-${mod.id}`);
    urlLabel.textContent = 'URL de acceso';
    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.id = `url-${mod.id}`;
    urlInput.className = 'input-text';
    urlInput.value = mod.url || '';
    urlInput.placeholder = 'https://ejemplo.com/...';
    urlInput.autocomplete = 'off';
    urlInput.setAttribute('inputmode', 'url');
    urlGroup.appendChild(urlLabel);
    urlGroup.appendChild(urlInput);
    fields.appendChild(urlGroup);

    /* 4. CAMPO: ÍCONO VECTORIAL */
    const iconGroup = document.createElement('div');
    iconGroup.className = 'field-group';
    const iconLabel = document.createElement('label');
    iconLabel.textContent = 'Ícono del módulo';

    const iconPickerWrapper = document.createElement('div');
    iconPickerWrapper.className = 'icon-picker-container';

    const iconTopRow = document.createElement('div');
    iconTopRow.className = 'icon-picker-top';

    const previewBadge = document.createElement('div');
    previewBadge.className = 'icon-preview-badge';
    previewBadge.innerHTML = renderIconHtml(mod.icon || 'graduation-cap');

    const hintText = document.createElement('div');
    hintText.className = 'icon-picker-hint';
    hintText.textContent = 'Elegí un ícono vectorial de la paleta:';

    iconTopRow.appendChild(previewBadge);
    iconTopRow.appendChild(hintText);
    iconPickerWrapper.appendChild(iconTopRow);

    /* Grilla de opciones de íconos */
    const iconGrid = document.createElement('div');
    iconGrid.className = 'icon-library-grid';

    Object.keys(ICON_CATALOG).forEach((key) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option-btn' + ((mod.icon || 'graduation-cap') === key ? ' selected' : '');
        btn.title = ICON_CATALOG[key].name;
        btn.innerHTML = ICON_CATALOG[key].svg;

        btn.addEventListener('click', () => {
            iconGrid.querySelectorAll('.icon-option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            mod.icon = key;
            previewBadge.innerHTML = renderIconHtml(key);
            updateDraft(mod.id, 'icon', key);
        });

        iconGrid.appendChild(btn);
    });

    iconPickerWrapper.appendChild(iconGrid);
    iconGroup.appendChild(iconLabel);
    iconGroup.appendChild(iconPickerWrapper);
    fields.appendChild(iconGroup);

    row.appendChild(fields);

    /* ---- Event listeners de inputs ---- */
    titleInput.addEventListener('input', () => {
        updateDraft(mod.id, 'title', titleInput.value);
        const headerTitle = row.querySelector('.editor-row-title');
        if (headerTitle) headerTitle.textContent = titleInput.value || 'Nuevo módulo';
    });

    descInput.addEventListener('input', () => {
        updateDraft(mod.id, 'description', descInput.value);
    });

    urlInput.addEventListener('input', () => {
        updateDraft(mod.id, 'url', urlInput.value);
    });

    /* ---- Eliminar módulo ---- */
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

function updateDraft(id, field, value) {
    const mod = draftConfig.modules.find((m) => m.id === id);
    if (mod) mod[field] = value;
}

function addNewModule() {
    const newMod = {
        id: generateId(),
        title: 'Nuevo módulo',
        description: '',
        icon: 'music',
        url: ''
    };
    draftConfig.modules.push(newMod);
    renderEditor();
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

    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

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
function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

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
            .then(reg => {
                reg.update();
            })
            .catch(() => {});
    }
}
