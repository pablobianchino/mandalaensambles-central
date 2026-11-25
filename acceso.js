'use strict';

/* ================================================================
   MANDALA ENSAMBLES – MDL Core
   acceso.js – Inicio de sesión (Firebase Auth) y lectura del perfil
   ----------------------------------------------------------------
   Mismo proyecto y mismas cuentas que Admisión y Festival.
   Solo Firebase Auth es fuente de verdad: no hay claves locales.
   ================================================================ */

import {
    getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut,
    onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import {
    collection, getDocs, query, where, doc, updateDoc, writeBatch
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { armarPerfil } from "./permisos.js";

/* Clave inicial de las cuentas nuevas (la misma de Admisión y Festival): no se acepta como clave nueva */
export const CLAVE_INICIAL_DEFECTO = 'mandala333';

const COLECCION_USUARIOS = 'usuarios_sistema';

let auth = null;
let db = null;
let provider = null;

export function iniciarAcceso(app, firestore) {
    auth = getAuth(app);
    db = firestore;
    provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return auth;
}

export function alCambiarSesion(callback) {
    return onAuthStateChanged(auth, callback);
}

function mensajeErrorAuth(error) {
    switch (error && error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Contraseña o correo incorrectos. Si tu cuenta usa Google, ingresá con el botón de Google. Si olvidaste tu contraseña, pedile al administrador que te restablezca el acceso.';
        case 'auth/user-not-found':
            return 'No se encontró un usuario registrado con este correo.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos fallidos. Esperá unos minutos antes de reintentar.';
        case 'auth/invalid-email':
            return 'El formato del correo electrónico no es válido.';
        case 'auth/network-request-failed':
            return 'No hay conexión con el servidor. Revisá tu internet y reintentá.';
        case 'auth/unauthorized-domain':
            return 'Este sitio todavía no está autorizado para ingresar con Google. Usá correo y contraseña o avisale al administrador.';
        case 'auth/popup-blocked':
            return 'El navegador bloqueó la ventana de Google. Permití las ventanas emergentes para este sitio y reintentá.';
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
            return 'Se cerró la ventana de Google antes de completar el ingreso.';
        default:
            return 'No se pudo iniciar sesión. Reintentá en unos instantes.';
    }
}

export async function loginConEmail(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, (email || '').trim().toLowerCase(), password);
        return { ok: true, user: cred.user };
    } catch (error) {
        console.warn('[MDL Core] Error de credenciales:', error.code);
        return { ok: false, error: mensajeErrorAuth(error) };
    }
}

export async function loginConGoogle() {
    try {
        const result = await signInWithPopup(auth, provider);
        return { ok: true, user: result.user };
    } catch (error) {
        console.warn('[MDL Core] Error al ingresar con Google:', error.code);
        return { ok: false, error: mensajeErrorAuth(error) };
    }
}

export async function cerrarSesion() {
    try { await signOut(auth); } catch (e) { console.warn('[MDL Core] Error al cerrar sesión:', e); }
}

/* La sesión se inició con correo y contraseña (no con Google) */
export async function esSesionConPassword(user) {
    try {
        const tok = await (user || auth.currentUser).getIdTokenResult();
        return tok?.signInProvider === 'password';
    } catch (e) {
        return false;
    }
}

export async function cambiarPassword(passActual, passNueva) {
    const user = auth.currentUser;
    if (!user || !user.email) return { ok: false, error: 'No hay una sesión activa para cambiar la contraseña.' };
    try {
        const cred = EmailAuthProvider.credential(user.email, passActual);
        await reauthenticateWithCredential(user, cred);
        await updatePassword(user, passNueva);
        return { ok: true };
    } catch (error) {
        console.warn('[MDL Core] Error al cambiar contraseña:', error.code);
        let msg = mensajeErrorAuth(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            msg = 'La contraseña actual es incorrecta. Si no la recordás, pedile al administrador que te restablezca el acceso.';
        } else if (error.code === 'auth/weak-password') {
            msg = 'La nueva contraseña es demasiado débil. Usá al menos 6 caracteres.';
        } else if (error.code === 'auth/requires-recent-login') {
            msg = 'Por seguridad, cerrá sesión, volvé a ingresar y reintentá el cambio.';
        }
        return { ok: false, error: msg };
    }
}

/* Marca en las fichas del usuario que ya cambió su clave inicial */
export async function marcarPasswordModificada(ids) {
    const fecha = new Date().toISOString();
    for (const id of (ids || [])) {
        try {
            await updateDoc(doc(db, COLECCION_USUARIOS, id), { password_modificada: true, fecha_modificacion_password: fecha });
        } catch (e) {
            console.warn('[MDL Core] No se pudo registrar el cambio de contraseña en', id, e.code || e);
        }
    }
}

/* ----------------------------------------------------------------
   PERFIL
   Los autorizados leen toda la colección; quien no está en la lista
   (por ejemplo, un sonidista) solo puede leer su propia ficha, así que
   en ese caso se busca por correo (mismo criterio que Festival).
   ---------------------------------------------------------------- */
async function leerFichas(emailNorm) {
    try {
        const snap = await getDocs(collection(db, COLECCION_USUARIOS));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
        if (error && error.code === 'permission-denied') {
            const snap = await getDocs(query(collection(db, COLECCION_USUARIOS), where('email', '==', emailNorm)));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        throw error;
    }
}

export async function consultarPerfil(email) {
    const emailNorm = (email || '').trim().toLowerCase();
    try {
        const fichas = await leerFichas(emailNorm);
        return armarPerfil(emailNorm, fichas);
    } catch (error) {
        console.warn('[MDL Core] No se pudo leer el perfil:', error.code || error);
        // La cuenta de emergencia entra siempre (misma regla que las otras apps)
        const r = armarPerfil(emailNorm, []);
        if (r.estado === 'ok') return r;
        return { estado: error && error.code === 'permission-denied' ? 'sin_permiso' : 'error', perfil: null };
    }
}

/* ----------------------------------------------------------------
   HERRAMIENTA DE ADMINISTRADOR: completar apps_habilitadas
   ---------------------------------------------------------------- */
export async function leerTodosLosUsuarios() {
    const snap = await getDocs(collection(db, COLECCION_USUARIOS));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* cambios: [{ id, apps }] — solo escribe apps_habilitadas y su fecha, nada más de la ficha */
export async function guardarAppsHabilitadas(cambios) {
    const fecha = new Date().toISOString();
    let escritos = 0;
    for (let i = 0; i < cambios.length; i += 400) {
        const lote = writeBatch(db);
        cambios.slice(i, i + 400).forEach(c => {
            lote.update(doc(db, COLECCION_USUARIOS, c.id), { apps_habilitadas: c.apps, fecha_actualizacion_accesos: fecha });
        });
        await lote.commit();
        escritos += Math.min(400, cambios.length - i);
    }
    return escritos;
}
