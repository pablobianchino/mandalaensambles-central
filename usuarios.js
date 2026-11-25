'use strict';

/* ================================================================
   MANDALA ENSAMBLES – MDL Core
   usuarios.js – Pantalla "Usuarios y accesos" (v1.3, etapa 2)
   ----------------------------------------------------------------
   Misma tabla de permisos y misma ventana con pestañas que Admisión
   (Configuración → Usuarios). Core maneja: datos de la cuenta, estado,
   contraseña, acceso a cada app y su rol. Lo propio de Admisión
   (módulos personalizados, aptitudes, instrumentos, disponibilidad,
   calendario, alias) se sigue editando en Admisión.
   ================================================================ */

import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    collection, getDocs, doc, updateDoc, addDoc, setDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
    IDS_APPS, APPS_CON_ACCESO, ROLES_POR_APP, EMAIL_CUENTA_EMERGENCIA,
    listaRoles, rolesCanonicos, appsEfectivas, appDeRol,
    formularioDesdeFicha, validarFormulario, calcularGuardado, construirListaAcceso
} from "./permisos.js";
import { CLAVE_INICIAL_DEFECTO } from "./acceso.js";

const COL = 'usuarios_sistema';
const SVG_TILDE = '<svg class="ico-linea" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
const SVG_DESACTIVAR = '<svg class="ico-linea" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>';
const SVG_REACTIVAR = '<svg class="ico-linea" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 0 0-15-6.7L3 8M3 3v5h5"/></svg>';
const CLASE_APP = { admision: '', festival: 'fest' };
const ROL_CORTO = {
    admisor: 'Admisor', coordinador_grupos: 'Coord.', docente: 'Docente', atencion_cliente: 'Atención',
    gestor_festivales: 'Gestor', sonidista_festivales: 'Sonido', planificador_clases: 'Planif.'
};

let ctx = null;            // { app, db, auth, usuarioActual(), showToast, escHtml }
let fichas = [];
let filtro = '';
let busqueda = '';
let actual = null;         // ficha abierta (null = nueva)
let hayCambios = false;
let cargado = false;

export function iniciarUsuarios(dependencias) {
    ctx = dependencias;
    bindEventos();
}

/* ================================================================
   DATOS
   ================================================================ */
async function leerFichas() {
    const snap = await getDocs(collection(ctx.db, COL));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* Rearma acceso/lista con los datos frescos (mismo resultado que en Admisión) */
async function sincronizarListaAcceso() {
    const todas = await leerFichas();
    await setDoc(doc(ctx.db, 'acceso', 'lista'), construirListaAcceso(todas));
    return todas;
}

/* Si la ficha tiene perfil docente, se reflejan nombre, celular y estado (como hace Admisión al guardar) */
async function reflejarEnProfesores(ficha, datos) {
    const pid = ficha && ficha.profesor_id;
    if (!pid) return;
    const cambios = {};
    if (datos.nombre && datos.nombre !== ficha.nombre) cambios.nombre = datos.nombre;
    if (datos.celular !== (ficha.celular || '')) cambios.celular = datos.celular;
    if (datos.activo !== (ficha.activo !== false)) {
        // Si otra ficha activa comparte el perfil docente, el perfil sigue activo
        const otraActiva = fichas.some(f => f.id !== ficha.id && f.activo !== false && f.profesor_id === pid);
        cambios.activo = datos.activo || otraActiva;
    }
    if (Object.keys(cambios).length === 0) return;
    try {
        await updateDoc(doc(ctx.db, 'profesores', pid), cambios);
    } catch (e) {
        console.warn('[MDL Core] No se pudo actualizar el perfil docente', pid, e.code || e);
    }
}

/* Crea la cuenta de acceso con la clave inicial, sin tocar la sesión del administrador */
async function crearCuentaAcceso(email) {
    const nombreApp = `core_alta_${Date.now()}`;
    const appSec = initializeApp(ctx.app.options, nombreApp);
    try {
        const authSec = getAuth(appSec);
        await createUserWithEmailAndPassword(authSec, email, CLAVE_INICIAL_DEFECTO);
        await signOut(authSec);
        return 'creada';
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') return 'existente';
        console.warn('[MDL Core] No se pudo crear la cuenta de acceso:', e.code || e);
        return 'error';
    } finally {
        try { await deleteApp(appSec); } catch (e) { /* nada */ }
    }
}

/* ================================================================
   NAVEGACIÓN
   ================================================================ */
export async function mostrarUsuarios() {
    if (!ctx.usuarioActual()?.esAdmin) return;
    document.body.classList.add('vista-usuarios');
    window.scrollTo(0, 0);
    if (!cargado) await recargar();
}

export function ocultarUsuarios() {
    document.body.classList.remove('vista-usuarios');
    cerrarVentanaUsuario(true);
}

async function recargar() {
    const cuerpo = document.getElementById('usu-cuerpo');
    cuerpo.innerHTML = `<tr><td colspan="11"><div class="abm-vacio">Cargando usuarios…</div></td></tr>`;
    try {
        fichas = await leerFichas();
        cargado = true;
        pintarTabla();
    } catch (e) {
        console.warn('[MDL Core] No se pudieron leer los usuarios:', e);
        cuerpo.innerHTML = `<tr><td colspan="11"><div class="abm-vacio">No se pudieron leer los usuarios (${ctx.escHtml(e.code || e.message || 'error')}).</div></td></tr>`;
    }
}

/* ================================================================
   TABLA
   ================================================================ */
function iniciales(nombre) {
    return String(nombre || '').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('') || '?';
}

function accesoSinRol(f) {
    const form = formularioDesdeFicha(f);
    return !form.admin && IDS_APPS.some(id => form.apps[id] && !(id === 'admision' && form.personalizado) && !form.roles.some(r => appDeRol(r) === id));
}

function filasFiltradas() {
    const q = busqueda.toLowerCase().trim();
    return fichas.filter(f => {
        if (q && !`${f.nombre || ''} ${f.email || ''}`.toLowerCase().includes(q)) return false;
        const activo = f.activo !== false;
        if (filtro === 'inactivo') return !activo;
        if (filtro === 'admin') return listaRoles(f).includes('admin');
        if (filtro === 'sinrol') return accesoSinRol(f);
        if (filtro) return appsEfectivas(f).includes(filtro) || listaRoles(f).includes('admin');
        return true;
    }).sort((a, b) => (a.activo === false) - (b.activo === false) || String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || ''), 'es'));
}

function tilde(si, clase, titulo) {
    return si ? `<span class="abm-tilde ${clase}" title="${ctx.escHtml(titulo)}">${SVG_TILDE}</span>` : '<span class="abm-no">·</span>';
}

function pintarTabla() {
    const esc = ctx.escHtml;
    const L = filasFiltradas();
    const conteoEmail = {};
    fichas.forEach(f => { const e = String(f.email || '').toLowerCase(); conteoEmail[e] = (conteoEmail[e] || 0) + 1; });

    document.getElementById('usu-info').textContent = `${L.length} ${L.length === 1 ? 'usuario' : 'usuarios'}`;
    const yo = ctx.usuarioActual();

    document.getElementById('usu-cuerpo').innerHTML = L.map(f => {
        const roles = rolesCanonicos(f);
        const activo = f.activo !== false;
        const nombre = f.nombre || String(f.email || '').split('@')[0] || '(sin nombre)';
        const repetido = conteoEmail[String(f.email || '').toLowerCase()] > 1;
        const esYo = yo && String(f.email || '').toLowerCase() === yo.email;
        const celdasApp = IDS_APPS.map(id => ROLES_POR_APP[id].map((r, k) =>
            `<td class="${k === 0 ? 'sep' : ''}">${tilde(roles.includes(r[0]), CLASE_APP[id], r[1])}</td>`).join('')).join('');
        const accion = esYo || f.email === EMAIL_CUENTA_EMERGENCIA
            ? ''
            : `<button type="button" class="ds-icon-btn js-estado" data-id="${esc(f.id)}" title="${activo ? 'Desactivar' : 'Reactivar'}">${activo ? SVG_DESACTIVAR : SVG_REACTIVAR}</button>`;
        return `<tr class="${activo ? '' : 'off'}" data-id="${esc(f.id)}">
            <td class="q"><div class="abm-quien"><span class="abm-av">${esc(iniciales(nombre))}</span><div><b>${esc(nombre)}${esYo ? ' <span class="usu-yo">(vos)</span>' : ''}</b><small>${esc(f.email || 'sin correo')}${repetido ? ' <em class="abm-rep">Correo repetido</em>' : ''}${accesoSinRol(f) ? ' <em class="abm-rep">Acceso sin rol</em>' : ''}</small></div></div></td>
            <td class="sep">${tilde(roles.includes('admin'), 'gen', 'Administrador')}</td>
            ${celdasApp}
            <td class="sep fin"><span class="abm-est ${activo ? '' : 'off'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
            <td class="acc">${accion}</td>
        </tr>`;
    }).join('') || `<tr><td colspan="11"><div class="abm-vacio">No hay usuarios con ese filtro.</div></td></tr>`;
}

/* ================================================================
   VENTANA DEL USUARIO
   ================================================================ */
function pintarBloquesApps() {
    const esc = ctx.escHtml;
    document.getElementById('usu-bloques-apps').innerHTML = IDS_APPS.map(id => `
        <div class="app-acceso ${CLASE_APP[id]}" id="usu-app-${id}">
            <div class="app-acceso-cab">
                <div class="abm-user-fila-tx"><b><span class="abm-user-app ${CLASE_APP[id]}">Mandala ${esc(APPS_CON_ACCESO[id].nombre)}</span></b><small id="usu-est-${id}"></small></div>
                <label class="abm-switch ${CLASE_APP[id]}" title="Acceso a ${esc(APPS_CON_ACCESO[id].nombre)}"><input type="checkbox" class="usu-sw-app" data-app="${id}"><span></span></label>
            </div>
            <div class="app-acceso-roles ${CLASE_APP[id]}">
                <div class="abm-user-roles">
                    ${ROLES_POR_APP[id].map(r => `<label class="abm-rol"><input type="checkbox" class="usu-chk-rol" value="${r[0]}"><span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></span></label>`).join('')}
                </div>
                ${id === 'admision' ? `
                <div class="usu-aviso-app" id="usu-aviso-personalizado" hidden>No tiene rol: usa <b>módulos personalizados</b> elegidos en Admisión. Podés asignarle un rol o dejarlo así.</div>
                <div class="usu-aviso-app">Los módulos personalizados, las aptitudes, los instrumentos y la disponibilidad se ajustan en <b>Admisión → Configuración → Usuarios</b>.</div>` : ''}
            </div>
        </div>`).join('');
}

function leerFormulario() {
    const apps = {};
    document.querySelectorAll('.usu-sw-app').forEach(sw => { apps[sw.dataset.app] = sw.checked; });
    return {
        nombre: document.getElementById('usu-nombre').value,
        email: document.getElementById('usu-email').value.trim().toLowerCase(),
        celular: document.getElementById('usu-celular').value,
        activo: document.getElementById('usu-activo').checked,
        admin: document.getElementById('usu-admin').checked,
        apps,
        roles: [...document.querySelectorAll('.usu-chk-rol:checked')].map(c => c.value),
        personalizado: actual ? formularioDesdeFicha(actual).personalizado : false
    };
}

function abrirVentanaUsuario(id) {
    actual = id ? fichas.find(f => f.id === id) || null : null;
    if (id && !actual) return;
    const esNuevo = !actual;
    const form = formularioDesdeFicha(actual);
    const yo = ctx.usuarioActual();
    const esYo = actual && String(actual.email || '').toLowerCase() === yo.email;

    document.getElementById('usu-nombre').value = form.nombre;
    const email = document.getElementById('usu-email');
    email.value = form.email;
    email.disabled = !esNuevo;
    document.getElementById('usu-nota-email').textContent = esNuevo
        ? 'Con este correo entra a todas las apps.'
        : 'Con este correo entra a todas las apps. No se puede cambiar una vez creado.';
    document.getElementById('usu-celular').value = form.celular;
    const activo = document.getElementById('usu-activo');
    activo.checked = form.activo;
    activo.disabled = Boolean(esYo);
    document.getElementById('usu-nota-activo').textContent = esYo ? 'No podés desactivar tu propia cuenta.' : 'Si se desactiva, no puede ingresar a ninguna app.';
    document.getElementById('usu-fila-clave').hidden = esNuevo;
    document.getElementById('usu-aviso-nuevo').hidden = !esNuevo;

    const swAdmin = document.getElementById('usu-admin');
    swAdmin.checked = form.admin;
    swAdmin.disabled = Boolean(esYo && form.admin);
    document.getElementById('usu-nota-admin').textContent = swAdmin.disabled
        ? 'No podés quitarte el rol de administrador a vos mismo.'
        : 'Acceso total a todas las aplicaciones, a la configuración de Core y a esta pantalla.';
    document.querySelectorAll('.usu-sw-app').forEach(sw => { sw.checked = form.apps[sw.dataset.app]; });
    document.querySelectorAll('.usu-chk-rol').forEach(c => { c.checked = form.roles.includes(c.value); });
    document.getElementById('usu-aviso-personalizado').hidden = !form.personalizado;

    actualizarVentana();
    marcarCambios(false);
    activarPestana(esNuevo ? 'datos' : 'accesos');
    document.getElementById('usu-errores').hidden = true;
    document.getElementById('modal-usuario').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById(esNuevo ? 'usu-nombre' : 'usu-btn-guardar')?.focus(), 60);
}

async function cerrarVentanaUsuario(forzar) {
    const modal = document.getElementById('modal-usuario');
    if (!modal || modal.hidden) return;
    if (!forzar && hayCambios) {
        const ok = await confirmar('¿Descartar los cambios?', 'Hay cambios sin guardar en este usuario.', 'Descartar', true);
        if (!ok) return;
    }
    modal.hidden = true;
    document.body.style.overflow = '';
    actual = null;
}

function activarPestana(tab) {
    document.querySelectorAll('#modal-usuario .abm-user-tabs button').forEach(b => {
        const on = b.dataset.tab === tab;
        b.classList.toggle('on', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('#modal-usuario .abm-user-sec').forEach(s => s.classList.toggle('on', s.dataset.tab === tab));
}

/* Refleja en la ventana el estado de los interruptores (admin, apps, roles) y la cabecera */
function actualizarVentana() {
    const admin = document.getElementById('usu-admin').checked;
    document.querySelectorAll('.usu-sw-app').forEach(sw => {
        const id = sw.dataset.app;
        if (admin) sw.checked = true;
        sw.disabled = admin;
        const on = sw.checked;
        document.getElementById(`usu-app-${id}`).classList.toggle('cerrado', !on);
        document.getElementById(`usu-est-${id}`).textContent = admin ? 'Incluida por ser administrador' : (on ? 'Tiene acceso' : 'Sin acceso');
    });
    document.getElementById('usu-app-admin').classList.toggle('activo', admin);

    const form = leerFormulario();
    const nombre = form.nombre.trim() || (actual ? actual.email : '') || 'Nuevo usuario';
    document.getElementById('usu-cab-nom').textContent = nombre;
    document.getElementById('usu-cab-av').textContent = nombre === 'Nuevo usuario' ? '+' : iniciales(nombre);
    document.getElementById('usu-cab-mail').textContent = form.email;
    const chips = [];
    chips.push(form.activo ? '<span class="abm-chip ok">Activo</span>' : '<span class="abm-chip bad">Inactivo</span>');
    if (admin) chips.push('<span class="abm-chip gen">Administrador</span>');
    IDS_APPS.forEach(id => { if (form.apps[id]) chips.push(`<span class="abm-chip ${CLASE_APP[id]}">${ctx.escHtml(APPS_CON_ACCESO[id].nombre)}</span>`); });
    document.getElementById('usu-cab-chips').innerHTML = chips.join('');
    document.getElementById('usu-lbl-activo').textContent = form.activo ? 'Activo' : 'Inactivo';
}

function marcarCambios(hay) {
    hayCambios = hay;
    document.getElementById('usu-estado-cambios').textContent = hay ? 'Cambios sin guardar' : '';
}

function mostrarErrores(errores) {
    const el = document.getElementById('usu-errores');
    el.innerHTML = errores.map(e => `<div>${ctx.escHtml(e)}</div>`).join('');
    el.hidden = errores.length === 0;
}

async function guardarUsuario() {
    const form = leerFormulario();
    const esNuevo = !actual;
    const errores = validarFormulario(form, esNuevo);

    if (esNuevo && !errores.length) {
        const existe = fichas.some(f => String(f.email || '').toLowerCase() === form.email);
        if (existe) errores.push(`Ya existe un usuario con el correo ${form.email}. Buscalo en la lista para editarlo.`);
    }
    if (errores.length) {
        mostrarErrores(errores);
        activarPestana(errores.some(e => e.includes('correo') || e.includes('nombre')) ? 'datos' : 'accesos');
        return;
    }
    mostrarErrores([]);

    const btn = document.getElementById('usu-btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
        const datos = calcularGuardado(actual, form);
        datos.fecha_actualizacion = new Date().toISOString();
        let avisoCuenta = '';

        if (esNuevo) {
            // Segundo control en la base, por si la lista estaba desactualizada
            const dup = await getDocs(query(collection(ctx.db, COL), where('email', '==', form.email)));
            if (!dup.empty) throw new Error(`Ya existe un usuario con el correo ${form.email}.`);
            Object.assign(datos, {
                email: form.email,
                fecha_creacion: datos.fecha_actualizacion,
                password_inicial_asignada: true,
                password_modificada: false,
                creado_desde: 'core'
            });
            await addDoc(collection(ctx.db, COL), datos);
            const cuenta = await crearCuentaAcceso(form.email);
            avisoCuenta = cuenta === 'creada'
                ? `Se creó la cuenta con la contraseña inicial (${CLAVE_INICIAL_DEFECTO}). La persona la cambia en su primer ingreso.`
                : cuenta === 'existente'
                    ? 'La cuenta de acceso ya existía: entra con su contraseña de siempre.'
                    : 'La ficha se creó, pero no se pudo crear la cuenta de acceso. Usá "Restablecer" en su ficha para generarle una contraseña.';
        } else {
            await updateDoc(doc(ctx.db, COL, actual.id), datos);
            await reflejarEnProfesores(actual, datos);
        }

        try {
            fichas = await sincronizarListaAcceso();
        } catch (e) {
            console.warn('[MDL Core] No se pudo actualizar la lista de acceso:', e);
            fichas = await leerFichas();
        }
        marcarCambios(false);
        await cerrarVentanaUsuario(true);
        pintarTabla();
        if (avisoCuenta) {
            await confirmar('Usuario creado', avisoCuenta, 'Entendido', false, true);
        } else {
            ctx.showToast('Usuario guardado');
        }
    } catch (e) {
        console.error('[MDL Core] Error al guardar el usuario:', e);
        mostrarErrores([`No se pudo guardar: ${e.message || e.code || 'error desconocido'}`]);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar cambios';
    }
}

async function cambiarEstado(id) {
    const f = fichas.find(x => x.id === id);
    if (!f) return;
    const activo = f.activo !== false;
    const nombre = f.nombre || f.email;
    const ok = await confirmar(
        activo ? `¿Desactivar a ${nombre}?` : `¿Reactivar a ${nombre}?`,
        activo
            ? 'No va a poder ingresar a ninguna app. Su ficha, sus roles y su historial se conservan, y se puede reactivar cuando quieras.'
            : 'Vuelve a poder ingresar con los accesos y roles que tenía.',
        activo ? 'Desactivar' : 'Reactivar',
        activo
    );
    if (!ok) return;
    try {
        const datos = { activo: !activo, fecha_actualizacion: new Date().toISOString() };
        await updateDoc(doc(ctx.db, COL, id), datos);
        await reflejarEnProfesores(f, { nombre: f.nombre, celular: f.celular || '', activo: !activo });
        try { fichas = await sincronizarListaAcceso(); } catch (e) { fichas = await leerFichas(); }
        pintarTabla();
        ctx.showToast(activo ? 'Usuario desactivado' : 'Usuario reactivado');
    } catch (e) {
        console.error('[MDL Core] Error al cambiar el estado:', e);
        ctx.showToast('No se pudo cambiar el estado. Revisá la consola.');
    }
}

/* ---- Restablecer contraseña (función de Vercel: api/restablecer-clave.js) ---- */
async function restablecerClave() {
    if (!actual) return;
    const ok = await confirmar(
        '¿Restablecer contraseña?',
        `Se genera una contraseña temporal nueva para ${actual.email}. La actual deja de funcionar y la persona tiene que cambiar la temporal en su próximo ingreso. La temporal se muestra una sola vez.`,
        'Restablecer'
    );
    if (!ok) return;
    const btn = document.getElementById('usu-btn-reset');
    btn.disabled = true;
    try {
        const idToken = await ctx.auth().currentUser?.getIdToken();
        if (!idToken) throw new Error('No hay sesión activa. Volvé a iniciar sesión.');
        const r = await fetch('/api/restablecer-clave', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, usuarioId: actual.id })
        });
        let resp = null;
        try { resp = await r.json(); } catch (e) { /* sin cuerpo */ }
        if (!r.ok || !resp?.ok || !resp.clave) {
            throw new Error(resp?.error || (r.status === 404
                ? 'El servicio de restablecimiento solo funciona en el sitio publicado.'
                : `Respuesta inesperada del servidor (${r.status}).`));
        }
        mostrarClaveTemporal(resp.email || actual.email, resp.clave, resp);
    } catch (e) {
        mostrarErrores([`No se pudo restablecer la contraseña: ${e.message}`]);
    } finally {
        btn.disabled = false;
    }
}

function mostrarClaveTemporal(email, clave, info) {
    const modal = document.getElementById('modal-clave-temporal');
    document.getElementById('clave-temp-email').textContent = email;
    const campo = document.getElementById('clave-temp-valor');
    campo.value = clave;
    const extra = [
        info.cuentaCreada ? 'No tenía cuenta de acceso: se creó con esta contraseña.' : '',
        info.fichaMarcada === false ? 'Atención: la contraseña se cambió, pero no se pudo marcar la ficha para exigir el cambio al ingresar.' : ''
    ].filter(Boolean).join(' ');
    const elExtra = document.getElementById('clave-temp-extra');
    elExtra.textContent = extra;
    elExtra.hidden = !extra;
    document.getElementById('clave-temp-copiar').textContent = 'Copiar';
    modal.hidden = false;
    campo.select();
}

/* ---- Confirmación (ventana propia, mismo estilo que el resto) ---- */
let resolverConfirmar = null;
function confirmar(titulo, texto, textoOk, peligro = false, soloAceptar = false) {
    document.getElementById('confirmar-titulo').textContent = titulo;
    document.getElementById('confirmar-texto').textContent = texto;
    const ok = document.getElementById('confirmar-ok');
    ok.textContent = textoOk;
    ok.className = `ds-btn ${peligro ? 'ds-btn-danger' : 'ds-btn-primary'}`;
    document.getElementById('confirmar-cancelar').hidden = soloAceptar;
    document.getElementById('modal-confirmar').hidden = false;
    setTimeout(() => ok.focus(), 60);
    return new Promise(res => { resolverConfirmar = res; });
}
function responderConfirmar(valor) {
    document.getElementById('modal-confirmar').hidden = true;
    if (resolverConfirmar) { const r = resolverConfirmar; resolverConfirmar = null; r(valor); }
}

/* ================================================================
   EVENTOS
   ================================================================ */
function bindEventos() {
    pintarBloquesApps();

    document.getElementById('usu-buscar').addEventListener('input', (e) => { busqueda = e.target.value; pintarTabla(); });
    document.querySelectorAll('#usu-filtros button').forEach(b => b.addEventListener('click', () => {
        filtro = b.dataset.f;
        document.querySelectorAll('#usu-filtros button').forEach(x => x.classList.toggle('on', x === b));
        pintarTabla();
    }));
    document.getElementById('usu-btn-agregar').addEventListener('click', () => abrirVentanaUsuario(null));
    document.getElementById('usu-btn-recargar').addEventListener('click', recargar);

    // Tabla: clic en la fila abre la ventana; el botón de estado no
    document.getElementById('usu-cuerpo').addEventListener('click', (e) => {
        const btn = e.target.closest('.js-estado');
        if (btn) { e.stopPropagation(); cambiarEstado(btn.dataset.id); return; }
        const fila = e.target.closest('tr[data-id]');
        if (fila) abrirVentanaUsuario(fila.dataset.id);
    });

    // Ventana
    document.querySelectorAll('#modal-usuario .abm-user-tabs button').forEach(b => b.addEventListener('click', () => activarPestana(b.dataset.tab)));
    document.getElementById('usu-btn-cerrar').addEventListener('click', () => cerrarVentanaUsuario(false));
    document.getElementById('usu-btn-cancelar').addEventListener('click', () => cerrarVentanaUsuario(false));
    document.getElementById('usu-btn-guardar').addEventListener('click', guardarUsuario);
    document.getElementById('usu-btn-reset').addEventListener('click', restablecerClave);
    document.getElementById('modal-usuario').addEventListener('input', () => { actualizarVentana(); marcarCambios(true); mostrarErrores([]); });
    document.getElementById('modal-usuario').addEventListener('change', (e) => {
        // Al apagar una app se desmarcan sus roles
        if (e.target.classList.contains('usu-sw-app') && !e.target.checked) {
            const id = e.target.dataset.app;
            document.querySelectorAll('.usu-chk-rol').forEach(c => { if (appDeRol(c.value) === id) c.checked = false; });
        }
        actualizarVentana();
        marcarCambios(true);
        mostrarErrores([]);
    });

    // Confirmación y clave temporal
    document.getElementById('confirmar-ok').addEventListener('click', () => responderConfirmar(true));
    document.getElementById('confirmar-cancelar').addEventListener('click', () => responderConfirmar(false));
    document.getElementById('clave-temp-copiar').addEventListener('click', async () => {
        const campo = document.getElementById('clave-temp-valor');
        try { await navigator.clipboard.writeText(campo.value); }
        catch (e) { campo.select(); try { document.execCommand('copy'); } catch (e2) { /* se copia a mano */ } }
        document.getElementById('clave-temp-copiar').textContent = 'Copiada';
    });
    document.getElementById('clave-temp-cerrar').addEventListener('click', () => {
        document.getElementById('clave-temp-valor').value = '';
        document.getElementById('modal-clave-temporal').hidden = true;
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!document.getElementById('modal-confirmar').hidden) { responderConfirmar(false); return; }
        if (!document.getElementById('modal-usuario').hidden) cerrarVentanaUsuario(false);
    });
}
