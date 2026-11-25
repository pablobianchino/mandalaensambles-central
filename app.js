'use strict';

/* ================================================================
   MANDALA ENSAMBLES – Panel Central (MDL Core)
   app.js – Inicio de sesión, tarjetas según acceso, Master-Detail & Categorías
   Historial de cambios: CAMBIOS_core.md
   ================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    iniciarAcceso, alCambiarSesion, loginConEmail, loginConGoogle, cerrarSesion, esSesionConPassword,
    cambiarPassword, marcarPasswordModificada, consultarPerfil, leerTodosLosUsuarios, guardarAppsHabilitadas,
    CLAVE_INICIAL_DEFECTO
} from "./acceso.js";
import {
    APPS_CON_ACCESO, IDS_APPS, ACCESO_SOLO_ADMIN, ACCESO_TODOS, accesoDeModulo, puedeVerModulo, etiquetaAcceso,
    listaRoles, appsGuardadas, appsPropuestas, mismasApps
} from "./permisos.js";

/* Versión de Core: se sube en cada desarrollo y se registra en CAMBIOS_core.md */
const APP_VERSION = 'v1.2';

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
iniciarAcceso(app, db);

/* ----------------------------------------------------------------
   CATÁLOGO DE ÍCONOS VECTORIALES (SVG NÍTIDOS)
   Incluye producción musical, gestión, finanzas, eventos y web.
   Se reemplazó el ícono roto por festival-tent (Carpa de Festival).
   ---------------------------------------------------------------- */
const ICON_CATALOG = {
    /* Producción Musical */
    'studio-mic': {
        name: 'Micrófono de Estudio',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/><line x1="8" x2="16" y1="22" y2="22"/></svg>`
    },
    'mixer': {
        name: 'Consola / Faders',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>`
    },
    'waveform': {
        name: 'Pista / Audio Waveform',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 12h2"/><path d="M6 8v8"/><path d="M10 4v16"/><path d="M14 7v10"/><path d="M18 9v6"/><path d="M22 12h-2"/></svg>`
    },
    'synthesizer': {
        name: 'Sintetizador / Teclas',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M6 5v8"/><path d="M10 5v8"/><path d="M14 5v8"/><path d="M18 5v8"/><path d="M2 13h20"/></svg>`
    },
    'headphones': {
        name: 'Auriculares de Monitoreo',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>`
    },
    'vinyl': {
        name: 'Vinilo / Grabación Master',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 7.07 2.93"/></svg>`
    },
    'speaker': {
        name: 'Monitor de Audio / Parlante',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><rect width="16" height="20" x="4" y="2" rx="2"/><circle cx="12" cy="14" r="4"/><circle cx="12" cy="6" r="1.5"/></svg>`
    },
    'music': {
        name: 'Música / Ensambles',
        category: 'musica',
        svg: `<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`
    },

    /* Gestión */
    'graduation-cap': {
        name: 'Admisión / Graduación',
        category: 'gestion',
        svg: `<svg viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`
    },
    'users': {
        name: 'Alumnos / Comunidad',
        category: 'gestion',
        svg: `<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
    },
    'presentation': {
        name: 'Docentes / Clases',
        category: 'gestion',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/><path d="M9 7h6"/><path d="M9 11h3"/></svg>`
    },
    'calendar': {
        name: 'Horarios / Calendario',
        category: 'gestion',
        svg: `<svg viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`
    },

    /* Finanzas */
    'receipt': {
        name: 'Facturación / Recibo',
        category: 'finanzas',
        svg: `<svg viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17V7"/></svg>`
    },
    'banknote': {
        name: 'Dinero en Efectivo',
        category: 'finanzas',
        svg: `<svg viewBox="0 0 24 24"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`
    },
    'dollar-sign': {
        name: 'Aranceles / Precios ($)',
        category: 'finanzas',
        svg: `<svg viewBox="0 0 24 24"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
    },
    'wallet': {
        name: 'Billetera / Pagos',
        category: 'finanzas',
        svg: `<svg viewBox="0 0 24 24"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`
    },

    /* Eventos */
    'festival-tent': {
        name: 'Festival / Carpa Escenario',
        category: 'eventos',
        svg: `<svg viewBox="0 0 24 24"><path d="m12 3-8 9v9h16v-9z"/><path d="m12 3 5 18"/><path d="m12 3-5 18"/><path d="M4 12h16"/></svg>`
    },
    'ticket': {
        name: 'Entradas / Tickets',
        category: 'eventos',
        svg: `<svg viewBox="0 0 24 24"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 11v2"/><path d="M13 17v2"/></svg>`
    },
    'sparkles': {
        name: 'Gala / Muestra de Fin de Año',
        category: 'eventos',
        svg: `<svg viewBox="0 0 24 24"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`
    },

    /* Enlaces Web */
    'globe': {
        name: 'Sitio Web General',
        category: 'web',
        svg: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
    },
    'external-link': {
        name: 'Portal Externo',
        category: 'web',
        svg: `<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`
    }
};

/* ----------------------------------------------------------------
   CONSTANTES & PERSISTENCIA LOCAL
   ---------------------------------------------------------------- */
const STORAGE_KEY = 'mdl_central_config_v2';

function generateId() {
    return 'mod_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

function normalizeModule(m) {
    let iconKey = m.icon || 'graduation-cap';
    // Reemplazar ícono roto legacy por festival-tent
    if (iconKey === 'party-popper' || iconKey === 'stage' || !ICON_CATALOG[iconKey]) {
        if (iconKey === 'party-popper' || iconKey === 'stage') {
            iconKey = 'festival-tent';
        } else if (!ICON_CATALOG[iconKey]) {
            iconKey = 'graduation-cap';
        }
    }

    const mod = {
        id: m.id || generateId(),
        type: m.type === 'web' ? 'web' : 'app',
        title: (m.title || '').trim(),
        description: (m.description || '').trim(),
        icon: iconKey,
        url: (m.url || '').trim(),
        hidden: Boolean(m.hidden),
        // v1.1: quién ve la tarjeta ('admision', 'festival', 'todos' o 'admin'); vacío = se deduce por la URL
        acceso_app: typeof m.acceso_app === 'string' ? m.acceso_app : ''
    };
    return mod;
}

function buildDefaultConfig() {
    return {
        modules: [
            {
                id: generateId(),
                type: 'app',
                title: 'Admisión',
                description: 'Admisión de nuevos alumnos',
                icon: 'users',
                url: 'https://admision.mandalaensambles.com',
                hidden: false
            },
            {
                id: generateId(),
                type: 'app',
                title: 'Suscripciones y Facturación',
                description: 'Pagos, cuotas y comprobantes',
                icon: 'receipt',
                url: '',
                hidden: false
            },
            {
                id: generateId(),
                type: 'app',
                title: 'Festivales',
                description: 'Gestión y cronograma de festivales',
                icon: 'festival-tent',
                url: '',
                hidden: false
            },
            {
                id: generateId(),
                type: 'web',
                title: 'Aranceles',
                description: 'Página web con aranceles actualizados',
                icon: 'dollar-sign',
                url: 'https://mandalaensambles.com/aranceles',
                hidden: false
            },
            {
                id: generateId(),
                type: 'web',
                title: 'Sitio Web Mandala',
                description: 'Portal oficial de la escuela',
                icon: 'globe',
                url: 'https://mandalaensambles.com',
                hidden: false
            }
        ]
    };
}

/* ----------------------------------------------------------------
   ESTADO DE LA APLICACIÓN
   ---------------------------------------------------------------- */
let appConfig = { modules: [] };
let draftConfig = null;
let selectedModuleId = null;
let newModTypeSelection = 'app';
let currentIconCategory = 'todas';
let toastTimer = null;
let isModalOpen = false;

/* Sesión: perfil del usuario que ingresó (null = sin sesión) */
let usuarioActual = null;
let syncIniciada = false;

/* ================================================================
   ARRANQUE
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.getElementById('app-version');
    if (versionEl) versionEl.textContent = APP_VERSION;

    loadLocalFallback();
    bindGlobalEvents();
    bindAccesoEvents();
    registerServiceWorker();
    alCambiarSesion(manejarCambioSesion);
});

/* ================================================================
   SESIÓN Y ACCESO
   ================================================================ */
function mostrarEstado(estado) {
    // estado: 'cargando' | 'login' | 'app'
    document.body.classList.remove('estado-cargando', 'estado-login', 'estado-app');
    document.body.classList.add(`estado-${estado}`);
}

async function manejarCambioSesion(user) {
    if (!user) {
        usuarioActual = null;
        document.body.classList.remove('es-admin');
        cerrarVentanasDeSesion();
        mostrarEstado('login');
        return;
    }

    mostrarEstado('cargando');
    const { estado, perfil } = await consultarPerfil(user.email);

    if (estado !== 'ok') {
        const mensajes = {
            sin_perfil: 'Tu cuenta no tiene un perfil en el sistema de Mandala. Pedile al administrador que te dé de alta.',
            inactivo: 'Tu usuario está inactivo. Si creés que es un error, hablá con el administrador.',
            sin_permiso: 'No se pudo verificar tu acceso (permiso denegado). Avisale al administrador.',
            error: 'No se pudo verificar tu acceso. Revisá tu conexión y volvé a intentar.'
        };
        await cerrarSesion();
        mostrarErrorLogin(mensajes[estado] || mensajes.error);
        return;
    }

    usuarioActual = perfil;
    document.body.classList.toggle('es-admin', Boolean(perfil.esAdmin));
    pintarBarraSesion(perfil);
    renderModules();
    mostrarEstado('app');

    if (!syncIniciada) {
        syncIniciada = true;
        initFirebaseSync();
    }

    // Cambio obligatorio de la clave inicial (solo si se ingresó con correo y contraseña)
    if (perfil.password_modificada === false && await esSesionConPassword(user)) {
        abrirCambioClave();
    }
}

/* ---- Widget de usuario (mismo formato que Admisión) ---- */
const ETIQUETA_ROL_WIDGET = {
    admin: 'Admin', admisor: 'Admisor', admisiones: 'Admisor', coordinador_grupos: 'Coordinador', coordinador: 'Coordinador',
    evaluador: 'Evaluador', docente: 'Docente', profesor: 'Docente', atencion_cliente: 'Atención al Cliente',
    gestor_festivales: 'Gestor de Festivales', sonidista_festivales: 'Sonidista', planificador_clases: 'Planificador'
};
const ICONO_ESTRELLA = '<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

function obtenerIniciales(nombre) {
    return String(nombre || '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
}

function etiquetaRolPrincipal(perfil) {
    if (perfil.esAdmin) return 'Admin';
    const orden = Object.keys(ETIQUETA_ROL_WIDGET);
    const rol = (perfil.roles || []).filter(r => ETIQUETA_ROL_WIDGET[r]).sort((a, b) => orden.indexOf(a) - orden.indexOf(b))[0];
    return rol ? ETIQUETA_ROL_WIDGET[rol] : 'Usuario';
}

function pintarBarraSesion(perfil) {
    const nombre = perfil.nombre || perfil.email;
    const iniciales = obtenerIniciales(nombre);
    const rol = etiquetaRolPrincipal(perfil);

    document.getElementById('widget-user-name').textContent = nombre;
    document.getElementById('widget-user-avatar').textContent = iniciales;
    document.getElementById('widget-role-badge').innerHTML = `${perfil.esAdmin ? ICONO_ESTRELLA : ''}<span>${escHtml(rol)}</span><span class="widget-role-caret" aria-hidden="true">▾</span>`;

    document.getElementById('popover-avatar').textContent = iniciales;
    document.getElementById('popover-name').textContent = nombre;
    document.getElementById('popover-email').textContent = perfil.email;

    const apps = (perfil.apps || []).map(id => `<span class="ds-chip teal">${escHtml(APPS_CON_ACCESO[id]?.nombre || id)}</span>`);
    document.getElementById('popover-apps').innerHTML = apps.length ? apps.join('') : '<span class="popover-sin-apps">Todavía no tenés aplicaciones habilitadas.</span>';
}

function abrirPopoverPerfil(abrir) {
    const pop = document.getElementById('profile-popover');
    const btn = document.getElementById('user-top-btn');
    const mostrar = typeof abrir === 'boolean' ? abrir : !pop.classList.contains('show');
    pop.classList.toggle('show', mostrar);
    btn.setAttribute('aria-expanded', mostrar ? 'true' : 'false');
}

function mostrarErrorLogin(msg) {
    const el = document.getElementById('login-error-msg');
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
}

function bindAccesoEvents() {
    const form = document.getElementById('form-login-email');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const pass = document.getElementById('login-password').value;
        if (!email || !pass) {
            mostrarErrorLogin('Completá tu correo y tu contraseña.');
            return;
        }
        const btn = document.getElementById('btn-login-email-submit');
        btn.disabled = true;
        btn.textContent = 'Ingresando…';
        mostrarErrorLogin('');
        const res = await loginConEmail(email, pass);
        btn.disabled = false;
        btn.textContent = 'Iniciar sesión';
        if (!res.ok) {
            mostrarErrorLogin(res.error);
            return;
        }
        document.getElementById('login-password').value = '';
        // El resto lo hace manejarCambioSesion (onAuthStateChanged)
    });

    document.getElementById('btn-login-google')?.addEventListener('click', async () => {
        mostrarErrorLogin('');
        const res = await loginConGoogle();
        if (!res.ok) mostrarErrorLogin(res.error);
    });

    document.getElementById('btn-toggle-login-pass')?.addEventListener('click', () => {
        const input = document.getElementById('login-password');
        input.type = input.type === 'password' ? 'text' : 'password';
    });

    // Widget de usuario: abrir y cerrar el menú del perfil
    document.getElementById('user-top-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirPopoverPerfil();
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#user-header-widget-wrapper')) abrirPopoverPerfil(false);
    });

    document.getElementById('btn-cerrar-sesion')?.addEventListener('click', async () => {
        abrirPopoverPerfil(false);
        if (isModalOpen) closeModal();
        await cerrarSesion();
        showToast('Sesión cerrada');
    });

    document.getElementById('popover-link-cambiar-pass')?.addEventListener('click', () => {
        abrirPopoverPerfil(false);
        abrirCambioClave(false);
    });

    // Cambio de clave (obligatorio por clave inicial, o voluntario desde el perfil)
    document.getElementById('form-cambio-clave')?.addEventListener('submit', enviarCambioClave);
    document.getElementById('btn-cambio-clave-salir')?.addEventListener('click', async () => {
        cerrarVentana('modal-cambio-clave');
        if (cambioClaveForzado) await cerrarSesion();
    });

    // Revisar accesos (administrador)
    document.getElementById('btn-revisar-accesos')?.addEventListener('click', abrirRevisarAccesos);
    document.getElementById('btn-accesos-cerrar')?.addEventListener('click', () => cerrarVentana('modal-accesos'));
    document.getElementById('btn-accesos-cerrar-x')?.addEventListener('click', () => cerrarVentana('modal-accesos'));
    document.getElementById('btn-accesos-guardar')?.addEventListener('click', guardarAccesosRevisados);
}

function abrirVentana(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
    document.body.style.overflow = 'hidden';
}

function cerrarVentana(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
    if (!isModalOpen) document.body.style.overflow = '';
}

function cerrarVentanasDeSesion() {
    abrirPopoverPerfil(false);
    if (isModalOpen) closeModal();
    cerrarVentana('modal-cambio-clave');
    cerrarVentana('modal-accesos');
}

/* ---- Cambio de clave: obligatorio (clave inicial) o voluntario (desde el perfil) ---- */
let cambioClaveForzado = false;

function abrirCambioClave(forzado = true) {
    cambioClaveForzado = forzado;
    document.getElementById('titulo-cambio-clave').textContent = forzado ? 'Cambiá tu contraseña' : 'Cambiar contraseña';
    document.getElementById('texto-cambio-clave').textContent = forzado
        ? 'Estás usando la contraseña inicial. Por seguridad, elegí una nueva antes de continuar. La vas a usar también en Admisión y Festivales.'
        : 'La nueva contraseña vale para todas las aplicaciones de Mandala (Core, Admisión y Festivales).';
    document.getElementById('btn-cambio-clave-salir').textContent = forzado ? 'Cerrar sesión' : 'Cancelar';
    ['clave-actual', 'clave-nueva', 'clave-repetir'].forEach(id => { document.getElementById(id).value = ''; });
    mostrarErrorCambioClave('');
    abrirVentana('modal-cambio-clave');
    setTimeout(() => document.getElementById('clave-actual')?.focus(), 60);
}

function mostrarErrorCambioClave(msg) {
    const el = document.getElementById('cambio-clave-error');
    el.textContent = msg || '';
    el.hidden = !msg;
}

async function enviarCambioClave(e) {
    e.preventDefault();
    const actual = document.getElementById('clave-actual').value;
    const nueva = document.getElementById('clave-nueva').value;
    const repetir = document.getElementById('clave-repetir').value;

    if (!actual || !nueva || !repetir) return mostrarErrorCambioClave('Completá los tres campos.');
    if (nueva.length < 6) return mostrarErrorCambioClave('La nueva contraseña debe tener al menos 6 caracteres.');
    if (nueva !== repetir) return mostrarErrorCambioClave('Las dos contraseñas nuevas no coinciden.');
    if (nueva === CLAVE_INICIAL_DEFECTO) return mostrarErrorCambioClave('No podés usar la contraseña inicial como contraseña nueva.');
    if (nueva === actual) return mostrarErrorCambioClave('La nueva contraseña tiene que ser distinta de la actual.');

    const btn = document.getElementById('btn-cambio-clave-ok');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    const res = await cambiarPassword(actual, nueva);
    btn.disabled = false;
    btn.textContent = 'Cambiar contraseña';

    if (!res.ok) return mostrarErrorCambioClave(res.error);

    await marcarPasswordModificada(usuarioActual?.ids || (usuarioActual?.id ? [usuarioActual.id] : []));
    if (usuarioActual) usuarioActual.password_modificada = true;
    cerrarVentana('modal-cambio-clave');
    showToast('Contraseña actualizada');
}

/* ---- Revisar accesos (herramienta de administrador, etapa 0) ---- */
let accesosPendientes = [];

function chipsApps(apps, clase) {
    if (!apps.length) return '<span class="ds-chip">Ninguna</span>';
    return apps.map(id => `<span class="ds-chip ${clase}">${escHtml(APPS_CON_ACCESO[id]?.nombre || id)}</span>`).join(' ');
}

async function abrirRevisarAccesos() {
    if (!usuarioActual?.esAdmin) return;
    const lista = document.getElementById('accesos-lista');
    const resumen = document.getElementById('accesos-resumen');
    const btnGuardar = document.getElementById('btn-accesos-guardar');
    lista.innerHTML = '<div class="ds-empty"><b>Cargando usuarios…</b></div>';
    resumen.innerHTML = '';
    btnGuardar.disabled = true;
    abrirVentana('modal-accesos');

    let usuarios;
    try {
        usuarios = await leerTodosLosUsuarios();
    } catch (err) {
        console.warn('[MDL Core] No se pudieron leer los usuarios:', err);
        lista.innerHTML = `<div class="ds-empty"><b>No se pudieron leer los usuarios</b>${escHtml(err.code || err.message || '')}</div>`;
        return;
    }

    usuarios.sort((a, b) => (a.activo === false) - (b.activo === false) || String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || '')));

    // Correos repetidos (fichas duplicadas): se marcan para revisarlos
    const conteoEmail = {};
    usuarios.forEach(u => { const e = String(u.email || '').toLowerCase(); conteoEmail[e] = (conteoEmail[e] || 0) + 1; });

    accesosPendientes = [];
    const filas = usuarios.map(u => {
        const guardadas = appsGuardadas(u);
        const propuestas = appsPropuestas(u);
        const tieneCampo = Array.isArray(u.apps_habilitadas);
        const cambia = !tieneCampo || !mismasApps(guardadas, propuestas);
        if (cambia) accesosPendientes.push({ id: u.id, apps: propuestas });

        const roles = listaRoles(u);
        const duplicado = conteoEmail[String(u.email || '').toLowerCase()] > 1;
        const estadoChip = cambia
            ? `<span class="ds-chip warn">${tieneCampo ? 'Se actualiza' : 'Se completa'}</span>`
            : '<span class="ds-chip ok">Al día</span>';
        const nombre = u.nombre || (u.email || '').split('@')[0] || '(sin nombre)';
        const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

        return `
            <div class="acceso-fila ${u.activo === false ? 'inactivo' : ''}">
                <span class="ds-avatar" aria-hidden="true">${escHtml(iniciales)}</span>
                <div class="acceso-nombre">
                    <b>${escHtml(nombre)}</b>
                    <span>${escHtml(u.email || 'sin correo')}</span>
                    <div class="acceso-etiquetas">
                        ${u.activo === false ? '<span class="ds-chip">Inactivo</span>' : ''}
                        ${duplicado ? '<span class="ds-chip bad">Correo repetido</span>' : ''}
                    </div>
                </div>
                <div class="acceso-roles"><small>Roles</small>${roles.length ? escHtml(roles.join(', ')) : '—'}</div>
                <div class="acceso-apps"><small>Hoy en la ficha</small>${tieneCampo ? chipsApps(guardadas, 'info') : '<span class="acceso-vacio">Sin completar</span>'}</div>
                <div class="acceso-apps"><small>Acceso calculado</small>${chipsApps(propuestas, 'teal')}</div>
                <div class="acceso-estado">${estadoChip}</div>
            </div>`;
    });

    const activos = usuarios.filter(u => u.activo !== false).length;
    resumen.innerHTML = `
        <span class="ds-chip">${usuarios.length} fichas (${activos} activas)</span>
        <span class="ds-chip ${accesosPendientes.length ? 'warn' : 'ok'}">${accesosPendientes.length} para completar o actualizar</span>`;
    lista.innerHTML = filas.join('') || '<div class="ds-empty"><b>No hay usuarios</b></div>';
    btnGuardar.disabled = accesosPendientes.length === 0;
    btnGuardar.textContent = accesosPendientes.length ? `Guardar accesos (${accesosPendientes.length})` : 'Todo al día';
}

async function guardarAccesosRevisados() {
    if (!usuarioActual?.esAdmin || accesosPendientes.length === 0) return;
    const btn = document.getElementById('btn-accesos-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        const n = await guardarAppsHabilitadas(accesosPendientes);
        showToast(`Accesos guardados en ${n} fichas`);
        await abrirRevisarAccesos();
    } catch (err) {
        console.error('[MDL Core] Error al guardar accesos:', err);
        showToast('No se pudieron guardar los accesos. Revisá la consola.');
        btn.disabled = false;
        btn.textContent = `Guardar accesos (${accesosPendientes.length})`;
    }
}

/* ================================================================
   EVENTOS GLOBALES
   ================================================================ */
function bindGlobalEvents() {
    // Abrir modal de configuración
    const btnConfig = document.getElementById('btn-config');
    if (btnConfig) {
        btnConfig.addEventListener('click', openModal);
    }

    // Cerrar modal
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', closeModal);
    }

    const btnCancelModal = document.getElementById('btn-cancel-modal');
    if (btnCancelModal) {
        btnCancelModal.addEventListener('click', closeModal);
    }

    // Guardar modal
    const btnSaveModal = document.getElementById('btn-save-modal');
    if (btnSaveModal) {
        btnSaveModal.addEventListener('click', saveModal);
    }

    // Modal de nuevo módulo
    const btnSidebarAdd = document.getElementById('btn-sidebar-add');
    if (btnSidebarAdd) {
        btnSidebarAdd.addEventListener('click', showNewModuleDialog);
    }

    const btnCancelNewMod = document.getElementById('btn-cancel-new-mod');
    if (btnCancelNewMod) {
        btnCancelNewMod.addEventListener('click', hideNewModuleDialog);
    }

    const btnConfirmNewMod = document.getElementById('btn-confirm-new-mod');
    if (btnConfirmNewMod) {
        btnConfirmNewMod.addEventListener('click', confirmNewModule);
    }

    const btnTypeApp = document.getElementById('btn-type-app');
    if (btnTypeApp) {
        btnTypeApp.addEventListener('click', () => selectNewModType('app'));
    }

    const btnTypeWeb = document.getElementById('btn-type-web');
    if (btnTypeWeb) {
        btnTypeWeb.addEventListener('click', () => selectNewModType('web'));
    }

    // Atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const newModDialog = document.getElementById('new-module-dialog');
            if (newModDialog && newModDialog.style.display !== 'none') {
                hideNewModuleDialog();
            } else if (document.getElementById('profile-popover')?.classList.contains('show')) {
                abrirPopoverPerfil(false);
            } else if (!document.getElementById('modal-cambio-clave')?.hidden && !cambioClaveForzado) {
                cerrarVentana('modal-cambio-clave');
            } else if (!document.getElementById('modal-accesos')?.hidden) {
                cerrarVentana('modal-accesos');
            } else if (isModalOpen) {
                closeModal();
            }
        }
    });
}

/* ================================================================
   SINCRONIZACIÓN CON FIREBASE FIRESTORE
   ================================================================ */
async function initFirebaseSync() {
    const applyRemoteModules = (modules) => {
        if (!Array.isArray(modules) || modules.length === 0) return;
        appConfig = { modules: modules.map(normalizeModule) };
        saveLocal(appConfig);
        if (!isModalOpen) {
            renderModules();
        }
    };

    const tryFetch = async (collectionName) => {
        const ref = doc(db, collectionName, "portal_central");
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            if (data && Array.isArray(data.modules) && data.modules.length > 0) {
                console.log(`[MDL Central] Módulos cargados desde '${collectionName}'`);
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
            console.warn('[MDL Central] Listener Firestore avisó:', err);
        });
    } catch (err) {
        console.warn('[MDL Central] Error al sincronizar con Firestore:', err);
    }
}

/* ================================================================
   LOCALSTORAGE FALLBACK
   ================================================================ */
function loadLocalFallback() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.modules) && parsed.modules.length > 0) {
                appConfig = { modules: parsed.modules.map(normalizeModule) };
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
   RENDER PANTALLA PRINCIPAL
   Visual limpia: Módulos de aplicación vs Enlaces externos (Naranja)
   ================================================================ */
function renderModules() {
    const gridApps = document.getElementById('grid-apps');
    const gridWebs = document.getElementById('grid-webs');
    const dividerWrap = document.getElementById('main-divider-wrap');

    if (!gridApps || !gridWebs) return;

    gridApps.innerHTML = '';
    gridWebs.innerHTML = '';

    // Sin sesión no se muestra nada
    if (!usuarioActual) return;

    // Filtrar módulos visibles (hidden !== true) y permitidos para el usuario (v1.1)
    const visibleApps = appConfig.modules.filter(m => (m.type || 'app') === 'app' && puedeVerModulo(m, usuarioActual));
    const visibleWebs = appConfig.modules.filter(m => m.type === 'web' && puedeVerModulo(m, usuarioActual));

    // Renderizar tarjetas
    visibleApps.forEach(mod => gridApps.appendChild(createCleanCard(mod)));
    visibleWebs.forEach(mod => gridWebs.appendChild(createCleanCard(mod)));

    // Mostrar u ocultar la línea divisoria si existen enlaces externos visibles
    if (dividerWrap) {
        dividerWrap.style.display = (visibleWebs.length > 0) ? 'flex' : 'none';
    }

    // Estado vacío si no hay ningún módulo visible
    if (visibleApps.length === 0 && visibleWebs.length === 0) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.style.textAlign = 'center';
        p.style.width = '100%';
        p.style.color = 'var(--text-muted)';
        p.textContent = usuarioActual.esAdmin
            ? 'No hay módulos visibles. Hacé clic en "Configurar" para habilitar o agregar.'
            : 'Todavía no tenés aplicaciones habilitadas. Pedile acceso al administrador.';
        gridApps.appendChild(p);
    } else if (visibleApps.length === 0 && !usuarioActual.esAdmin) {
        const p = document.createElement('p');
        p.className = 'empty-state aviso-sin-apps';
        p.textContent = 'Todavía no tenés aplicaciones habilitadas. Pedile acceso al administrador.';
        gridApps.appendChild(p);
    }
}

function createCleanCard(mod) {
    const isWeb = mod.type === 'web';
    const rawUrl = (mod.url || '').trim();
    const hasUrl = Boolean(rawUrl);

    // Siempre abrimos en nueva pestaña garantizando target="_blank" y rel="noreferrer"
    const card = document.createElement('a');
    card.className = `module-card ${isWeb ? 'type-web' : 'type-app'} ${hasUrl ? '' : 'unconfigured'}`;
    card.href = hasUrl ? rawUrl : '#';
    if (hasUrl) {
        card.target = '_blank';
        card.rel = 'noreferrer';
    }

    card.setAttribute('aria-label', `${mod.title}${hasUrl ? '' : ' – sin configurar'}`);

    const iconEntry = ICON_CATALOG[mod.icon] || ICON_CATALOG['graduation-cap'];

    card.innerHTML = `
        <div class="card-icon">
            ${iconEntry.svg}
        </div>
        <div class="card-title">${escHtml(mod.title)}</div>
        <div class="card-description">${escHtml(mod.description || '')}</div>
        ${!hasUrl ? '<div class="card-badge">Sin configurar</div>' : ''}
    `;

    if (!hasUrl) {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            showToast('Este módulo no tiene una URL configurada aún.');
        });
    }

    return card;
}

/* ================================================================
   MODAL MASTER-DETAIL – ABRIR / CERRAR / GUARDAR
   ================================================================ */
function openModal() {
    if (!usuarioActual?.esAdmin) return;
    isModalOpen = true;
    draftConfig = JSON.parse(JSON.stringify(appConfig));
    draftConfig.modules = draftConfig.modules.map(normalizeModule);

    if (!draftConfig.modules.find(m => m.id === selectedModuleId)) {
        selectedModuleId = draftConfig.modules[0]?.id || null;
    }

    renderSidebar();
    renderDetailPanel();

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    isModalOpen = false;
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
    draftConfig = null;
}

async function saveModal() {
    const saveBtn = document.getElementById('btn-save-modal');
    const originalBtnText = saveBtn.textContent;

    const sinTitulo = draftConfig.modules.find((m) => !m.title.trim());
    if (sinTitulo) {
        showToast('⚠️ Todos los módulos deben tener un título.');
        return;
    }

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        // v1.1: las aplicaciones sin acceso definido guardan el deducido por la URL
        draftConfig.modules.forEach(m => {
            if ((m.type || 'app') === 'app' && !m.acceso_app) m.acceso_app = accesoDeModulo(m);
        });

        appConfig = JSON.parse(JSON.stringify(draftConfig));
        saveLocal(appConfig);
        renderModules();

        // Guardar en Firestore
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
   SIDEBAR (LATERAL IZQUIERDO): REORDENAMIENTO Y VISUALIZACIÓN
   ================================================================ */
function renderSidebar() {
    const sidebar = document.getElementById('sidebar-list');
    if (!sidebar || !draftConfig) return;

    sidebar.innerHTML = '';

    const apps = draftConfig.modules.filter(m => (m.type || 'app') === 'app');
    const webs = draftConfig.modules.filter(m => m.type === 'web');

    // 1. Grupo Aplicaciones
    const appGroup = document.createElement('div');
    appGroup.innerHTML = `
        <div class="sidebar-group-title group-title-apps">
            <span>📱 Aplicaciones (${apps.length})</span>
            <span style="font-size:10px; font-weight:600; color:#8c8273;">Reordenar ↕</span>
        </div>
    `;
    const appList = document.createElement('div');
    appList.style.display = 'flex';
    appList.style.flexDirection = 'column';
    appList.style.gap = '6px';
    apps.forEach((mod, idx) => {
        appList.appendChild(createSidebarItem(mod, idx, apps.length, 'app'));
    });
    appGroup.appendChild(appList);
    sidebar.appendChild(appGroup);

    // 2. Grupo Enlaces Externos
    const webGroup = document.createElement('div');
    webGroup.innerHTML = `
        <div class="sidebar-group-title group-title-webs" style="margin-top:14px;">
            <span>🌐 Enlaces Externos (${webs.length})</span>
            <span style="font-size:10px; font-weight:600; color:#8c8273;">Reordenar ↕</span>
        </div>
    `;
    const webList = document.createElement('div');
    webList.style.display = 'flex';
    webList.style.flexDirection = 'column';
    webList.style.gap = '6px';
    webs.forEach((mod, idx) => {
        webList.appendChild(createSidebarItem(mod, idx, webs.length, 'web'));
    });
    webGroup.appendChild(webList);
    sidebar.appendChild(webGroup);
}

function createSidebarItem(mod, idxInGroup, totalInGroup, groupType) {
    const isWeb = mod.type === 'web';
    const isSelected = mod.id === selectedModuleId;
    const isHidden = Boolean(mod.hidden);

    const item = document.createElement('div');
    item.className = `sidebar-item ${isWeb ? 'type-web' : 'type-app'} ${isSelected ? 'active' : ''} ${isHidden ? 'is-hidden' : ''}`;

    const iconSvg = (ICON_CATALOG[mod.icon] || ICON_CATALOG['graduation-cap']).svg;
    const isFirst = idxInGroup === 0;
    const isLast = idxInGroup === totalInGroup - 1;

    item.innerHTML = `
        <div class="sidebar-order-buttons" title="Reordenar dentro de ${groupType === 'app' ? 'Aplicaciones' : 'Enlaces Externos'}">
            <button type="button" class="btn-reorder btn-move-up" ${isFirst ? 'disabled' : ''} title="Mover arriba">▲</button>
            <button type="button" class="btn-reorder btn-move-down" ${isLast ? 'disabled' : ''} title="Mover abajo">▼</button>
        </div>

        <div class="sidebar-item-icon">
            ${iconSvg}
        </div>

        <div class="sidebar-item-info">
            <div class="sidebar-item-title">
                <span>${escHtml(mod.title) || 'Sin título'}</span>
                ${isHidden ? '<span class="badge-hidden-tag" title="Oculto en pantalla principal">Oculto</span>' : ''}
            </div>
            <div class="sidebar-item-desc">${escHtml(mod.description) || 'Sin descripción'}</div>
        </div>
    `;

    // Selección
    item.addEventListener('click', (e) => {
        if (e.target.closest('.btn-reorder')) return;
        selectedModuleId = mod.id;
        renderSidebar();
        renderDetailPanel();
    });

    // Reordenamiento independiente
    const upBtn = item.querySelector('.btn-move-up');
    const downBtn = item.querySelector('.btn-move-down');

    if (upBtn) {
        upBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveModuleWithinCategory(mod.id, -1);
        });
    }
    if (downBtn) {
        downBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            moveModuleWithinCategory(mod.id, 1);
        });
    }

    return item;
}

/* Reordenamiento dentro de la misma categoría */
function moveModuleWithinCategory(modId, direction) {
    const targetMod = draftConfig.modules.find(m => m.id === modId);
    if (!targetMod) return;

    const category = targetMod.type || 'app';
    const groupMods = draftConfig.modules.filter(m => (m.type || 'app') === category);
    const otherMods = draftConfig.modules.filter(m => (m.type || 'app') !== category);

    const currentIndex = groupMods.findIndex(m => m.id === modId);
    const newIndex = currentIndex + direction;

    if (newIndex < 0 || newIndex >= groupMods.length) return;

    const [movedItem] = groupMods.splice(currentIndex, 1);
    groupMods.splice(newIndex, 0, movedItem);

    if (category === 'app') {
        draftConfig.modules = [...groupMods, ...otherMods];
    } else {
        draftConfig.modules = [...otherMods, ...groupMods];
    }

    renderSidebar();
    renderDetailPanel();
}

/* ================================================================
   PANEL DERECHO DE DETALLE DEL MÓDULO
   ================================================================ */
function renderDetailPanel() {
    const panel = document.getElementById('detail-panel');
    if (!panel || !draftConfig) return;

    const mod = draftConfig.modules.find(m => m.id === selectedModuleId);
    if (!mod) {
        panel.innerHTML = '<p class="empty-state" style="padding:40px; text-align:center;">Selecciona un módulo del panel izquierdo para configurar.</p>';
        return;
    }

    const isWeb = mod.type === 'web';
    const isHidden = Boolean(mod.hidden);
    const iconEntry = ICON_CATALOG[mod.icon] || ICON_CATALOG['graduation-cap'];

    // Mapeo de íconos en uso por OTROS módulos para evitar duplicados
    const usedIconsMap = {};
    draftConfig.modules.forEach(m => {
        if (m.id !== mod.id && m.icon) {
            usedIconsMap[m.icon] = m.title;
        }
    });

    panel.innerHTML = `
        <div class="detail-header">
            <div class="detail-title-wrap">
                <div class="detail-module-icon-large ${isWeb ? 'type-web' : 'type-app'}">
                    ${iconEntry.svg}
                </div>
                <div>
                    <h3 style="font-size:16px; font-weight:800; color:var(--text-main);">${escHtml(mod.title) || 'Editar Módulo'}</h3>
                    <span style="font-size:12px; font-weight:700; color:${isWeb ? '#c2563b' : '#1f5491'};">
                        ${isWeb ? '🌐 Enlace Externo' : '📱 Aplicación'}
                    </span>
                </div>
            </div>
            <button type="button" id="btn-delete-current" class="btn-delete-current">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                Eliminar
            </button>
        </div>

        <!-- CONTROL DE VISIBILIDAD: Visible u Oculto -->
        <div class="visibility-control-box">
            <div class="visibility-info-wrap">
                <div class="visibility-icon-pill">
                    ${isHidden ? 
                        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8c8273" stroke-width="2.2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>` : 
                        `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`
                    }
                </div>
                <div>
                    <div style="font-size:13.5px; font-weight:800; color:var(--text-main);">
                        ${isHidden ? 'Oculto' : 'Visible'}
                    </div>
                    <div style="font-size:11.5px; color:var(--text-muted);">
                        ${isHidden ? 'No se muestra en la pantalla principal, pero conserva toda su configuración.' : 'Se muestra normalmente en la grilla principal.'}
                    </div>
                </div>
            </div>

            <label class="switch-toggle" title="Conmutar visibilidad">
                <input type="checkbox" id="toggle-mod-visibility" ${!isHidden ? 'checked' : ''}>
                <span class="switch-slider"></span>
            </label>
        </div>

        <!-- CATEGORÍA: Aplicación vs Enlace Externo -->
        <div class="field-group">
            <label>Categoría</label>
            <div class="type-selector-box">
                <button type="button" id="btn-cat-app" class="type-option-btn ${!isWeb ? 'selected type-app-btn' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>
                    Aplicación
                </button>
                <button type="button" id="btn-cat-web" class="type-option-btn ${isWeb ? 'selected type-web-btn' : ''}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/></svg>
                    Enlace Externo
                </button>
            </div>
        </div>

        <!-- TÍTULO -->
        <div class="field-group">
            <label for="edit-mod-title">Título del Módulo</label>
            <input type="text" id="edit-mod-title" class="input-text" value="${escHtml(mod.title)}" placeholder="Ej: Grabación en Estudio" autocomplete="off">
        </div>

        <!-- DESCRIPCIÓN -->
        <div class="field-group">
            <label for="edit-mod-desc">Descripción Breve</label>
            <input type="text" id="edit-mod-desc" class="input-text" value="${escHtml(mod.description)}" placeholder="Ej: Horarios, salas y reservas" autocomplete="off">
        </div>

        <!-- URL -->
        <div class="field-group">
            <label for="edit-mod-url">URL de Acceso</label>
            <input type="url" id="edit-mod-url" class="input-text" value="${escHtml(mod.url)}" placeholder="https://..." autocomplete="off">
        </div>

        ${isWeb ? `
        <p class="nota-acceso">Los enlaces externos los ven todos los usuarios que ingresan a Core.</p>
        ` : `
        <!-- ACCESO (v1.1): quién ve esta tarjeta -->
        <div class="field-group">
            <label for="edit-mod-acceso">Quién ve esta aplicación</label>
            <select id="edit-mod-acceso" class="input-text">
                ${[...IDS_APPS, ACCESO_SOLO_ADMIN, ACCESO_TODOS].map(v => `
                    <option value="${v}" ${accesoDeModulo(mod) === v ? 'selected' : ''}>${escHtml(etiquetaAcceso(v))}</option>
                `).join('')}
            </select>
            <p class="nota-acceso">${mod.acceso_app
                ? 'Los permisos de cada persona se asignan en la gestión de usuarios (próxima etapa). El administrador ve todas las aplicaciones.'
                : 'Todavía no está guardado: se dedujo por la URL. Al guardar los cambios queda fijo.'}</p>
        </div>
        `}

        <!-- SELECTOR DE ÍCONOS VECTORIALES -->
        <div class="field-group">
            <div class="icons-picker-header">
                <label style="margin:0;">Seleccionar Ícono Vectorial</label>
                <div class="icons-category-filter">
                    <button type="button" class="cat-chip ${currentIconCategory === 'todas' ? 'active' : ''}" data-cat="todas">Todos</button>
                    <button type="button" class="cat-chip ${currentIconCategory === 'musica' ? 'active' : ''}" data-cat="musica">Música & Estudio</button>
                    <button type="button" class="cat-chip ${currentIconCategory === 'gestion' ? 'active' : ''}" data-cat="gestion">Gestión</button>
                    <button type="button" class="cat-chip ${currentIconCategory === 'finanzas' ? 'active' : ''}" data-cat="finanzas">Finanzas</button>
                    <button type="button" class="cat-chip ${currentIconCategory === 'eventos' ? 'active' : ''}" data-cat="eventos">Eventos</button>
                </div>
            </div>

            <div class="icons-grid-scrollable" id="icons-grid-container"></div>
            <p style="font-size:11.5px; color:var(--text-muted); margin-top:4px;">
                💡 Los íconos con candado/atenuados ya están asignados a otro módulo para no repetirse.
            </p>
        </div>
    `;

    // Vincular botón Eliminar
    const deleteBtn = document.getElementById('btn-delete-current');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteModule(mod.id));
    }

    // Vincular toggle de visibilidad
    const visibilityToggle = document.getElementById('toggle-mod-visibility');
    if (visibilityToggle) {
        visibilityToggle.addEventListener('change', () => {
            mod.hidden = !visibilityToggle.checked;
            renderSidebar();
            renderDetailPanel();
            showToast(mod.hidden ? `Módulo "${mod.title}" oculto` : `Módulo "${mod.title}" visible`);
        });
    }

    // Vincular cambio de categoría
    const btnCatApp = document.getElementById('btn-cat-app');
    if (btnCatApp) {
        btnCatApp.addEventListener('click', () => changeModuleType(mod.id, 'app'));
    }

    const btnCatWeb = document.getElementById('btn-cat-web');
    if (btnCatWeb) {
        btnCatWeb.addEventListener('click', () => changeModuleType(mod.id, 'web'));
    }

    // Vincular inputs
    const titleInput = document.getElementById('edit-mod-title');
    if (titleInput) {
        titleInput.addEventListener('input', () => {
            mod.title = titleInput.value;
            renderSidebar();
        });
    }

    const descInput = document.getElementById('edit-mod-desc');
    if (descInput) {
        descInput.addEventListener('input', () => {
            mod.description = descInput.value;
            renderSidebar();
        });
    }

    const urlInput = document.getElementById('edit-mod-url');
    if (urlInput) {
        urlInput.addEventListener('input', () => {
            mod.url = urlInput.value;
        });
    }

    const accesoSelect = document.getElementById('edit-mod-acceso');
    if (accesoSelect) {
        accesoSelect.addEventListener('change', () => {
            mod.acceso_app = accesoSelect.value;
        });
    }

    // Vincular chips de filtro de íconos
    const chips = panel.querySelectorAll('.cat-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            currentIconCategory = chip.dataset.cat;
            renderDetailPanel();
        });
    });

    renderIconChoices(mod, usedIconsMap);
}

function renderIconChoices(mod, usedIconsMap) {
    const container = document.getElementById('icons-grid-container');
    if (!container) return;

    container.innerHTML = '';

    Object.keys(ICON_CATALOG).forEach(key => {
        const item = ICON_CATALOG[key];
        if (currentIconCategory !== 'todas' && item.category !== currentIconCategory) {
            return;
        }

        const isCurrentlySelected = mod.icon === key;
        const isUsedByOther = Boolean(usedIconsMap[key]);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `icon-btn-choice ${isCurrentlySelected ? 'selected' : ''} ${isUsedByOther ? 'disabled' : ''}`;
        btn.title = isUsedByOther ? `Ya en uso por: ${usedIconsMap[key]}` : item.name;
        btn.innerHTML = item.svg;

        if (isUsedByOther) {
            btn.setAttribute('data-tooltip', `En uso por: ${usedIconsMap[key]}`);
        } else {
            btn.addEventListener('click', () => {
                mod.icon = key;
                renderSidebar();
                renderDetailPanel();
            });
        }

        container.appendChild(btn);
    });
}

function changeModuleType(id, newType) {
    const mod = draftConfig.modules.find(m => m.id === id);
    if (mod && mod.type !== newType) {
        mod.type = newType;
        renderSidebar();
        renderDetailPanel();
    }
}

function deleteModule(id) {
    if (draftConfig.modules.length <= 1) {
        showToast('Debe haber al menos un módulo.');
        return;
    }

    const targetMod = draftConfig.modules.find(m => m.id === id);
    const modTitle = targetMod ? targetMod.title : 'Módulo';

    draftConfig.modules = draftConfig.modules.filter(m => m.id !== id);
    selectedModuleId = draftConfig.modules[0].id;
    renderSidebar();
    renderDetailPanel();
    showToast(`Módulo "${modTitle}" eliminado`);
}

/* ================================================================
   DIÁLOGO: AGREGAR NUEVO MÓDULO
   ================================================================ */
function showNewModuleDialog() {
    const input = document.getElementById('new-mod-title');
    if (input) input.value = '';
    newModTypeSelection = 'app';
    updateNewModTypeButtons();

    const dialog = document.getElementById('new-module-dialog');
    if (dialog) {
        dialog.style.display = 'flex';
        setTimeout(() => input?.focus(), 60);
    }
}

function hideNewModuleDialog() {
    const dialog = document.getElementById('new-module-dialog');
    if (dialog) dialog.style.display = 'none';
}

function selectNewModType(type) {
    newModTypeSelection = type;
    updateNewModTypeButtons();
}

function updateNewModTypeButtons() {
    const btnApp = document.getElementById('btn-type-app');
    const btnWeb = document.getElementById('btn-type-web');
    if (btnApp && btnWeb) {
        if (newModTypeSelection === 'app') {
            btnApp.classList.add('selected');
            btnWeb.classList.remove('selected');
        } else {
            btnApp.classList.remove('selected');
            btnWeb.classList.add('selected');
        }
    }
}

function confirmNewModule() {
    const input = document.getElementById('new-mod-title');
    const title = (input?.value || '').trim();
    if (!title) {
        showToast('Ingresa un título para el módulo');
        return;
    }

    // Buscar el primer ícono que no esté en uso
    const usedIcons = new Set(draftConfig.modules.map(m => m.icon));
    const availableIcon = Object.keys(ICON_CATALOG).find(k => !usedIcons.has(k)) || 'globe';

    const newMod = {
        id: generateId(),
        type: newModTypeSelection,
        title: title,
        description: '',
        icon: availableIcon,
        url: '',
        hidden: false
    };

    draftConfig.modules.push(newMod);
    selectedModuleId = newMod.id;

    hideNewModuleDialog();
    renderSidebar();
    renderDetailPanel();
    showToast(`Módulo "${title}" creado`);
}

/* ================================================================
   UTILIDADES & TOAST
   ================================================================ */
function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ================================================================
   REGISTRO SERVICE WORKER
   ================================================================ */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('[MDL Central] Service Worker registrado.'))
            .catch((err) => console.warn('[MDL Central] SW error:', err));
    }
}
