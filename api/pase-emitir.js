// =======================================================================
// api/pase-emitir.js — Etapa 4: pase de un solo uso para entrar a una app desde Core (v1.7)
// POST { idToken, app }  →  { ok: true, pase }
//  1. Verifica la sesión de Core (token de Firebase).
//  2. Verifica que la persona esté activa y tenga acceso a la app (mismo criterio que Core v1.4+:
//     apps_habilitadas; administrador y cuenta de emergencia entran a todo; fichas sin el campo, por roles).
//  3. Guarda el pase en Firestore (pases_sso/{sha256(pase)}, solo accesible con la cuenta de servicio)
//     con vencimiento de 2 minutos, y devuelve el pase. El pase en sí no se guarda: solo su huella.
// Requiere FIREBASE_SERVICE_ACCOUNT en el proyecto de Vercel de Core.
// =======================================================================
const S = require('./_servicio');

const APPS_CON_PASE = ['admision', 'festival', 'docentes'];
const VENCE_MS = 2 * 60 * 1000;

// Respaldo por roles para fichas sin apps_habilitadas (igual que appsSegunRoles de permisos.js)
const ROLES_APP = {
    admision: ['admisor', 'admisiones', 'coordinador_grupos', 'coordinador', 'evaluador', 'atencion_cliente', 'docente', 'profesor'],
    festival: ['gestor_festivales', 'sonidista_festivales'],
    docentes: ['docente', 'profesor', 'evaluador', 'planificador_clases']
};

async function fichasPorEmail(H, email) {
    const r = await S.pedirJson(S.BASE_FS.replace(/\/documents\/$/, '/documents:runQuery'), {
        method: 'POST', headers: H,
        body: JSON.stringify({ structuredQuery: {
            from: [{ collectionId: 'usuarios_sistema' }],
            where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } }
        } })
    });
    if (r.status !== 200 || !Array.isArray(r.json)) throw new Error('No se pudieron leer los usuarios (' + r.status + ')');
    return r.json.filter(x => x.document).map(x => x.document.fields || {});
}

function tieneAcceso(fichas, email, app) {
    if (email === S.ADMIN_EMERGENCIA_EMAIL) return true;
    const activas = fichas.filter(f => S.valorFs(f.activo) !== false);
    if (activas.length === 0) return false;
    const roles = activas.flatMap(f => {
        const rs = S.valorFs(f.roles);
        return (Array.isArray(rs) ? rs : [S.valorFs(f.rol)]).map(x => String(x || '').toLowerCase().trim());
    });
    if (roles.includes('admin')) return true;
    const conCampo = activas.filter(f => Array.isArray(S.valorFs(f.apps_habilitadas)));
    if (conCampo.length > 0) return conCampo.some(f => S.valorFs(f.apps_habilitadas).includes(app));
    return roles.some(r => ROLES_APP[app].includes(r));
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') return S.responder(res, 405, { error: 'Método no permitido.' });
    const datos = S.leerCuerpo(req);
    const app = String(datos.app || '');
    if (!datos.idToken || !APPS_CON_PASE.includes(app)) return S.responder(res, 400, { error: 'Pedido incompleto.' });

    const sa = S.cuentaServicio();
    if (!sa) return S.responder(res, 500, { error: 'El servidor no tiene configurada la clave de servicio (FIREBASE_SERVICE_ACCOUNT).' });

    try {
        const sesion = await S.verificarSesion(datos.idToken);
        if (!sesion) return S.responder(res, 401, { error: 'Sesión no válida. Volvé a iniciar sesión.' });

        const H = { Authorization: 'Bearer ' + await S.tokenServicio(sa), 'Content-Type': 'application/json' };
        const fichas = await fichasPorEmail(H, sesion.email);
        if (!tieneAcceso(fichas, sesion.email, app)) return S.responder(res, 403, { error: 'No tenés acceso a esa aplicación.' });

        const pase = S.crypto.randomBytes(32).toString('base64url');
        const creado = Date.now();
        const r = await S.pedirJson(S.BASE_FS + 'pases_sso?documentId=' + S.hashPase(pase), {
            method: 'POST', headers: H,
            body: JSON.stringify({ fields: {
                uid: { stringValue: sesion.uid },
                email: { stringValue: sesion.email },
                app: { stringValue: app },
                creado: { integerValue: String(creado) },
                expira: { integerValue: String(creado + VENCE_MS) }
            } })
        });
        if (r.status !== 200) throw new Error('No se pudo guardar el pase (' + r.status + ')');
        return S.responder(res, 200, { ok: true, pase });
    } catch (e) {
        return S.responder(res, 500, { error: 'No se pudo emitir el pase: ' + (e && e.message ? e.message : 'error desconocido') });
    }
};
