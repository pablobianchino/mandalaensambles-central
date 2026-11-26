// =======================================================================
// api/_servicio.js — Funciones compartidas de las funciones de Vercel de Core (v1.7)
// (Vercel no publica como función los archivos que empiezan con "_")
//  - Verificación del token de sesión de Firebase con los certificados públicos de Google
//    (misma técnica que app_mdl_admision/api/restablecer-clave.js).
//  - Token de acceso de la cuenta de servicio (FIREBASE_SERVICE_ACCOUNT) para Firestore.
//  - Firma de "custom tokens" de Firebase Auth para el pase de un solo uso.
// =======================================================================
const crypto = require('crypto');

const PROYECTO = 'priel-mdl-seguimientos';
const ADMIN_EMERGENCIA_EMAIL = 'productora.mandalahouse@gmail.com';
const BASE_FS = 'https://firestore.googleapis.com/v1/projects/' + PROYECTO + '/databases/(default)/documents/';

const b64url = b => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function pedirJson(url, opciones) {
    const r = await fetch(url, opciones);
    let json = null;
    try { json = await r.json(); } catch (e) { /* respuesta sin cuerpo */ }
    return { status: r.status, json };
}

function cuentaServicio() {
    try {
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
        return sa && sa.private_key && sa.client_email ? sa : null;
    } catch (e) {
        return null;
    }
}

// Verifica el token de sesión (firma y datos). Devuelve { email, uid } o null.
async function verificarSesion(idToken) {
    const partes = String(idToken || '').split('.');
    if (partes.length !== 3) return null;
    let cab, carga;
    try {
        cab = JSON.parse(Buffer.from(partes[0], 'base64url').toString('utf8'));
        carga = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    } catch (e) { return null; }
    if (cab.alg !== 'RS256' || !cab.kid) return null;
    const ahora = Math.floor(Date.now() / 1000);
    if (carga.aud !== PROYECTO || carga.iss !== 'https://securetoken.google.com/' + PROYECTO) return null;
    if (!carga.sub || typeof carga.exp !== 'number' || carga.exp <= ahora || (carga.iat || 0) > ahora + 300) return null;
    const certs = await pedirJson('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {});
    const pem = certs.json && certs.json[cab.kid];
    if (!pem) return null;
    const valido = crypto.verify('RSA-SHA256', Buffer.from(partes[0] + '.' + partes[1]), pem, Buffer.from(partes[2], 'base64url'));
    if (!valido || !carga.email) return null;
    return { email: String(carga.email).toLowerCase(), uid: String(carga.sub) };
}

// Token de acceso de la cuenta de servicio (OAuth con JWT firmado)
async function tokenServicio(sa) {
    const ahora = Math.floor(Date.now() / 1000);
    const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const cla = b64url(JSON.stringify({
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/datastore',
        aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 600
    }));
    const firma = b64url(crypto.sign('RSA-SHA256', Buffer.from(cab + '.' + cla), sa.private_key));
    const r = await pedirJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + cab + '.' + cla + '.' + firma
    });
    if (!r.json || !r.json.access_token) throw new Error('No se pudo obtener acceso de servicio (' + r.status + ')');
    return r.json.access_token;
}

// "Custom token" de Firebase Auth para el usuario `uid` (vale 1 hora para iniciar sesión una vez)
function firmarTokenIngreso(sa, uid, app) {
    const ahora = Math.floor(Date.now() / 1000);
    const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const cla = b64url(JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
        iat: ahora,
        exp: ahora + 3600,
        uid,
        claims: { pase_app: app }
    }));
    const firma = b64url(crypto.sign('RSA-SHA256', Buffer.from(cab + '.' + cla), sa.private_key));
    return cab + '.' + cla + '.' + firma;
}

// Convierte un valor de la API REST de Firestore a JS (solo los tipos que se usan)
function valorFs(v) {
    if (!v) return undefined;
    if ('stringValue' in v) return v.stringValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(valorFs);
    if ('nullValue' in v) return null;
    return undefined;
}

function hashPase(pase) {
    return crypto.createHash('sha256').update(String(pase)).digest('hex');
}

function responder(res, status, cuerpo, cabecerasExtra) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    Object.entries(cabecerasExtra || {}).forEach(([k, v]) => res.setHeader(k, v));
    res.status(status).send(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
    let datos = req.body;
    if (typeof datos === 'string') { try { datos = JSON.parse(datos); } catch (e) { datos = null; } }
    return datos || {};
}

module.exports = {
    crypto, PROYECTO, ADMIN_EMERGENCIA_EMAIL, BASE_FS,
    pedirJson, cuentaServicio, verificarSesion, tokenServicio, firmarTokenIngreso, valorFs, hashPase, responder, leerCuerpo
};
