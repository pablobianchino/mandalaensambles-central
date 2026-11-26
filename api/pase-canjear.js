// =======================================================================
// api/pase-canjear.js — Etapa 4: canje del pase de un solo uso (v1.7)
// POST { pase, app }  →  { ok: true, token, email }
// Lo llaman Admisión, Festivales y Docentes (otro sitio: se responde con CORS solo a esos sitios).
//  1. Busca la huella del pase en pases_sso. Si no existe, ya se usó o nunca existió.
//  2. Controla que sea para esa app y que no haya vencido.
//  3. Lo BORRA con condición de versión: solo un canje puede ganar (un solo uso real).
//  4. Devuelve un "custom token" de Firebase para el mismo usuario de Core: la app inicia sesión
//     con signInWithCustomToken, que reemplaza cualquier sesión anterior en esa app.
// =======================================================================
const S = require('./_servicio');

const ORIGENES = [
    'https://mandalaensambles-admision.vercel.app',
    'https://mandalaensambles-festival.vercel.app',
    'https://mandalaensambles-docentes.vercel.app',
    'http://localhost:8080', 'http://127.0.0.1:8080',   // Admisión local
    'http://localhost:5050', 'http://127.0.0.1:5050',   // Festivales local
    'http://localhost:8082', 'http://127.0.0.1:8082'    // Docentes local
];

function cabecerasCors(req) {
    const origen = req.headers.origin || '';
    if (!ORIGENES.includes(origen)) return {};
    return {
        'Access-Control-Allow-Origin': origen,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin'
    };
}

module.exports = async function handler(req, res) {
    const cors = cabecerasCors(req);
    if (req.method === 'OPTIONS') {
        Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
        return res.status(204).end();
    }
    if (req.method !== 'POST') return S.responder(res, 405, { error: 'Método no permitido.' }, cors);

    const datos = S.leerCuerpo(req);
    const pase = String(datos.pase || '');
    const app = String(datos.app || '');
    if (!/^[A-Za-z0-9_-]{30,100}$/.test(pase) || !app) return S.responder(res, 400, { error: 'Pedido incompleto.' }, cors);

    const sa = S.cuentaServicio();
    if (!sa) return S.responder(res, 500, { error: 'El servidor no tiene configurada la clave de servicio (FIREBASE_SERVICE_ACCOUNT).' }, cors);

    try {
        const H = { Authorization: 'Bearer ' + await S.tokenServicio(sa), 'Content-Type': 'application/json' };
        const url = S.BASE_FS + 'pases_sso/' + S.hashPase(pase);
        const doc = await S.pedirJson(url, { headers: H });
        if (doc.status === 404) return S.responder(res, 410, { error: 'El pase ya se usó o no existe.' }, cors);
        if (doc.status !== 200) throw new Error('No se pudo leer el pase (' + doc.status + ')');

        const f = doc.json.fields || {};
        // Un solo uso: se borra antes de dar el ingreso, con condición de versión (si otro canje ganó, falla)
        const borrado = await S.pedirJson(url + '?currentDocument.updateTime=' + encodeURIComponent(doc.json.updateTime), { method: 'DELETE', headers: H });
        if (borrado.status !== 200) return S.responder(res, 410, { error: 'El pase ya se usó.' }, cors);

        if (S.valorFs(f.app) !== app) return S.responder(res, 403, { error: 'El pase es para otra aplicación.' }, cors);
        if (!(S.valorFs(f.expira) > Date.now())) return S.responder(res, 410, { error: 'El pase venció. Volvé a abrir la aplicación desde el Portal.' }, cors);

        const token = S.firmarTokenIngreso(sa, S.valorFs(f.uid), app);
        return S.responder(res, 200, { ok: true, token, email: S.valorFs(f.email) }, cors);
    } catch (e) {
        return S.responder(res, 500, { error: 'No se pudo canjear el pase: ' + (e && e.message ? e.message : 'error desconocido') }, cors);
    }
};
