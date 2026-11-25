'use strict';

/* ================================================================
   MANDALA ENSAMBLES – MDL Core
   permisos.js – Reglas de acceso a las aplicaciones (nivel 1)
   ----------------------------------------------------------------
   Lógica pura (sin Firebase): se puede probar fuera del navegador.

   Dos niveles de permisos:
   - Nivel 1 (este archivo, se maneja en Core): a qué aplicaciones entra cada persona.
     Se guarda en usuarios_sistema/{id}.apps_habilitadas, por ejemplo ['admision', 'festival'].
   - Nivel 2 (dentro de cada app): qué puede hacer adentro (módulos, aptitudes, sonidista…).

   v1.4 (etapa 3): Core es la única fuente de los accesos. Si la ficha tiene apps_habilitadas,
   el acceso es exactamente ese campo; solo las fichas sin el campo se deducen de los roles
   (mismo respaldo que usan Admisión v8.21 y Festivales v2.14).
   ================================================================ */

/* Aplicaciones que controla Core y los roles que hoy dan acceso a cada una
   (tomados de ROLES_MODULOS de Admisión y de consultarAccesoUsuario de Festival). */
export const APPS_CON_ACCESO = {
    admision: {
        nombre: 'Admisión',
        roles: ['admisor', 'admisiones', 'coordinador_grupos', 'coordinador', 'evaluador', 'atencion_cliente', 'docente', 'profesor']
    },
    festival: {
        nombre: 'Festivales',
        roles: ['gestor_festivales', 'sonidista_festivales', 'planificador_clases']
    }
};

export const IDS_APPS = Object.keys(APPS_CON_ACCESO);

/* Valores especiales del campo "Acceso" de un módulo de tipo Aplicación */
export const ACCESO_SOLO_ADMIN = 'admin';
export const ACCESO_TODOS = 'todos';

export const EMAIL_CUENTA_EMERGENCIA = 'productora.mandalahouse@gmail.com';

const normalizar = (v) => String(v || '').toLowerCase().trim();

export function listaRoles(u) {
    if (!u) return [];
    const roles = Array.isArray(u.roles) ? u.roles : (u.rol ? [u.rol] : []);
    return roles.map(normalizar).filter(Boolean);
}

export function esRolAdmin(roles) {
    return (roles || []).map(normalizar).includes('admin');
}

/* Apps que se deducen de los roles actuales de una ficha */
export function appsSegunRoles(u) {
    const roles = listaRoles(u);
    if (esRolAdmin(roles)) return [...IDS_APPS];
    const apps = IDS_APPS.filter(id => roles.some(r => APPS_CON_ACCESO[id].roles.includes(r)));
    // "personalizado" en Admisión: entra si tiene algún módulo habilitado
    if (roles.includes('personalizado') && Array.isArray(u.modulos_habilitados) && u.modulos_habilitados.length > 0 && !apps.includes('admision')) {
        apps.push('admision');
    }
    return ordenarApps(apps);
}

/* Apps guardadas en la ficha (campo nuevo), solo ids conocidos */
export function appsGuardadas(u) {
    if (!u || !Array.isArray(u.apps_habilitadas)) return [];
    return ordenarApps(u.apps_habilitadas.map(normalizar).filter(id => IDS_APPS.includes(id)));
}

/* Acceso efectivo (v1.4): el campo apps_habilitadas si existe; si no, lo que dan los roles.
   El administrador entra a todo (se resuelve en armarPerfil y en el formulario). */
export function appsEfectivas(u) {
    if (u && Array.isArray(u.apps_habilitadas)) return appsGuardadas(u);
    return appsSegunRoles(u);
}

export function ordenarApps(apps) {
    return [...new Set(apps)].sort((a, b) => IDS_APPS.indexOf(a) - IDS_APPS.indexOf(b));
}

/* Valor que se propone guardar en apps_habilitadas (nunca quita lo que ya estaba) */
export function appsPropuestas(u) {
    return appsEfectivas(u);
}

export function mismasApps(a, b) {
    const x = ordenarApps(a || []);
    const y = ordenarApps(b || []);
    return x.length === y.length && x.every((v, i) => v === y[i]);
}

/* ----------------------------------------------------------------
   PERFIL DE SESIÓN
   Puede haber varias fichas con el mismo correo (altas duplicadas):
   alcanza con una activa y se unen roles y apps de todas las activas
   (mismo criterio que Festival).
   ---------------------------------------------------------------- */
export function armarPerfil(email, fichas) {
    const emailNorm = normalizar(email);
    const esEmergencia = emailNorm === EMAIL_CUENTA_EMERGENCIA;
    const coincidencias = (fichas || []).filter(f => normalizar(f.email) === emailNorm);

    if (coincidencias.length === 0) {
        if (esEmergencia) {
            return { estado: 'ok', perfil: { id: null, email: emailNorm, nombre: 'Administración', roles: ['admin'], esAdmin: true, esEmergencia: true, apps: [...IDS_APPS], password_modificada: true } };
        }
        return { estado: 'sin_perfil', perfil: null };
    }

    const activas = coincidencias.filter(f => f.activo !== false);
    if (activas.length === 0) {
        if (esEmergencia) {
            return { estado: 'ok', perfil: { id: coincidencias[0].id || null, email: emailNorm, nombre: coincidencias[0].nombre || 'Administración', roles: ['admin'], esAdmin: true, esEmergencia: true, apps: [...IDS_APPS], password_modificada: true } };
        }
        return { estado: 'inactivo', perfil: null };
    }

    const roles = [...new Set(activas.flatMap(listaRoles))];
    const apps = ordenarApps(activas.flatMap(appsEfectivas));
    const base = activas.find(f => f.profesor_id) || activas[0];
    const esAdmin = esRolAdmin(roles) || esEmergencia;

    return {
        estado: 'ok',
        perfil: {
            id: base.id || null,
            ids: activas.map(f => f.id).filter(Boolean),
            email: emailNorm,
            nombre: base.nombre || emailNorm.split('@')[0],
            roles,
            esAdmin,
            esEmergencia,
            apps: esAdmin ? [...IDS_APPS] : apps,
            // Si alguna ficha activa tiene la clave inicial sin cambiar, se exige el cambio
            password_modificada: !activas.some(f => f.password_modificada === false)
        }
    };
}

/* ----------------------------------------------------------------
   TARJETAS DE CORE
   ---------------------------------------------------------------- */

/* Si un módulo de tipo Aplicación todavía no tiene definido su acceso,
   se deduce por la dirección; si no se reconoce, queda solo para administradores. */
export function accesoDeModulo(mod) {
    if (!mod || mod.type === 'web') return ACCESO_TODOS;
    const definido = normalizar(mod.acceso_app);
    if (definido === ACCESO_TODOS || definido === ACCESO_SOLO_ADMIN || IDS_APPS.includes(definido)) return definido;
    return inferirAccesoPorUrl(mod.url);
}

export function inferirAccesoPorUrl(url) {
    const u = normalizar(url);
    if (u.includes('admision')) return 'admision';
    if (u.includes('festival')) return 'festival';
    return ACCESO_SOLO_ADMIN;
}

export function puedeVerModulo(mod, perfil) {
    if (!mod || mod.hidden || !perfil) return false;
    if (perfil.esAdmin) return true;
    const acceso = accesoDeModulo(mod);
    if (acceso === ACCESO_TODOS) return true;
    if (acceso === ACCESO_SOLO_ADMIN) return false;
    return (perfil.apps || []).includes(acceso);
}

export function etiquetaAcceso(acceso) {
    if (acceso === ACCESO_TODOS) return 'Todos los usuarios';
    if (acceso === ACCESO_SOLO_ADMIN) return 'Solo administradores';
    return APPS_CON_ACCESO[acceso] ? `Con acceso a ${APPS_CON_ACCESO[acceso].nombre}` : acceso;
}

/* ================================================================
   v1.3 – GESTIÓN DE USUARIOS DESDE CORE (etapa 2)
   Lógica pura del guardado: roles por app, módulos de Admisión y lista de acceso.
   ================================================================ */

/* Roles que se asignan desde Core, por aplicación (id, nombre, descripción) */
export const ROLES_POR_APP = {
    admision: [
        ['admisor', 'Admisor', 'Inbox, lista de espera, Match, altas, seguimientos y métricas.'],
        ['coordinador_grupos', 'Coordinador de grupos', 'Match, altas y seguimientos. Edita perfil y disponibilidad de otros.'],
        ['docente', 'Docente', 'Portal docente. Su perfil, aptitudes y disponibilidad se cargan en Admisión.'],
        ['atencion_cliente', 'Atención al cliente', 'Solo Inbox.']
    ],
    festival: [
        ['gestor_festivales', 'Gestor de Festivales', 'Acceso completo a Festivales.'],
        ['sonidista_festivales', 'Sonidista', 'Rider técnico y REC de los eventos en curso.'],
        ['planificador_clases', 'Planificador de clases', 'Eventos en lectura y Planificación de clases.']
    ]
};

/* Nombres viejos de roles que todavía pueden estar en algunas fichas → rol actual */
export const ROLES_EQUIVALENTES = { admisiones: 'admisor', coordinador: 'coordinador_grupos', profesor: 'docente', evaluador: 'docente' };

/* Copia exacta de ROLES_MODULOS de Admisión (src/modules/abm.module.js). Si cambia allá, cambiar acá. */
export const ROLES_MODULOS = {
    admin: ['dashboard', 'inbox', 'espera', 'match', 'match_etapa4', 'altas', 'seguimientos', 'suspendidos', 'metricas', 'portal_profesor', 'configuracion', 'permisos'],
    admisor: ['dashboard', 'inbox', 'espera', 'match', 'match_etapa4', 'altas', 'seguimientos', 'suspendidos', 'metricas'],
    admisiones: ['dashboard', 'inbox', 'espera', 'match', 'match_etapa4', 'altas', 'seguimientos', 'suspendidos', 'metricas'],
    coordinador_grupos: ['dashboard', 'espera', 'match', 'match_etapa4', 'altas', 'seguimientos', 'suspendidos', 'configuracion'],
    coordinador: ['dashboard', 'espera', 'match', 'match_etapa4', 'altas', 'seguimientos', 'suspendidos', 'configuracion'],
    evaluador: ['dashboard', 'inbox', 'seguimientos'],
    atencion_cliente: ['inbox'],
    gestor_festivales: [],
    sonidista_festivales: [],
    planificador_clases: [],
    docente: ['portal_profesor'],
    profesor: ['portal_profesor'],
    personalizado: []
};
const ORDEN_MODULOS = ROLES_MODULOS.admin;

const ROLES_DE_APPS = Object.values(ROLES_POR_APP).flat().map(r => r[0]);
const ROLES_FESTIVAL = ROLES_POR_APP.festival.map(r => r[0]);
/* Roles que maneja Core: al guardar se reemplazan; cualquier otro rol de la ficha se conserva */
const ROLES_GESTIONADOS = new Set(['admin', ...ROLES_DE_APPS, ...Object.keys(ROLES_EQUIVALENTES)]);

export function appDeRol(rol) {
    return IDS_APPS.find(id => ROLES_POR_APP[id].some(r => r[0] === rol)) || null;
}

/* Roles actuales de la ficha con los nombres viejos convertidos (para marcar las casillas) */
export function rolesCanonicos(u) {
    return [...new Set(listaRoles(u).map(r => ROLES_EQUIVALENTES[r] || r))];
}

export function modulosSegunRoles(roles) {
    const s = new Set();
    (roles || []).forEach(r => (ROLES_MODULOS[r] || []).forEach(m => s.add(m)));
    return [...s].sort((a, b) => ORDEN_MODULOS.indexOf(a) - ORDEN_MODULOS.indexOf(b));
}

function mismosElementos(a, b) {
    const x = new Set(a || []);
    const y = new Set(b || []);
    return x.size === y.size && [...x].every(v => y.has(v));
}

/* Estado del formulario a partir de una ficha (o vacío para un usuario nuevo) */
export function formularioDesdeFicha(u) {
    const roles = rolesCanonicos(u || {});
    const admin = roles.includes('admin');
    const appsFicha = u ? appsEfectivas(u) : [];
    const apps = {};
    IDS_APPS.forEach(id => { apps[id] = admin || appsFicha.includes(id); });
    return {
        nombre: (u && u.nombre) || '',
        email: (u && u.email) || '',
        celular: (u && u.celular) || '',
        activo: u ? u.activo !== false : true,
        admin,
        apps,
        roles: roles.filter(r => ROLES_DE_APPS.includes(r)),
        // "Personalizado" de Admisión: sin rol, con módulos elegidos a mano (cuenta como acceso válido a Admisión)
        personalizado: roles.includes('personalizado') && Array.isArray(u && u.modulos_habilitados) && u.modulos_habilitados.length > 0
    };
}

/* Errores que impiden guardar (lista vacía = se puede guardar) */
export function validarFormulario(form, esNuevo) {
    const errores = [];
    if (esNuevo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(form.email || '').trim())) errores.push('Ingresá un correo válido.');
    if (!String(form.nombre || '').trim()) errores.push('Ingresá el nombre.');
    if (!form.admin) {
        IDS_APPS.forEach(id => {
            if (id === 'admision' && form.personalizado) return;
            if (form.apps[id] && !form.roles.some(r => appDeRol(r) === id)) {
                errores.push(`Elegí al menos un rol en ${APPS_CON_ACCESO[id].nombre} o desactivá su acceso.`);
            }
        });
    }
    return errores;
}

/* Campos que se escriben en usuarios_sistema. `ficha` es la ficha actual (null si es nueva). */
export function calcularGuardado(ficha, form) {
    const rolesViejos = ficha ? listaRoles(ficha) : [];
    const appsActivas = form.admin ? [...IDS_APPS] : IDS_APPS.filter(id => form.apps[id]);

    // Roles de las apps activas (el administrador conserva además los roles que tenga marcados)
    const rolesApps = (form.roles || []).filter(r => ROLES_DE_APPS.includes(r) && appsActivas.includes(appDeRol(r)));
    // Roles que no maneja Core (por ejemplo "personalizado"): se conservan, salvo que ya no tenga Admisión
    const otros = rolesViejos.filter(r => !ROLES_GESTIONADOS.has(r) && !(r === 'personalizado' && (!appsActivas.includes('admision') || rolesApps.length > 0 || form.admin)));
    let roles = [...new Set([...(form.admin ? ['admin'] : []), ...rolesApps, ...otros])];
    if (roles.length === 0) roles = ['personalizado']; // mismo criterio que Admisión

    // Rol principal: mismo criterio que Admisión (el primero que no sea de Festivales)
    const rol = roles.find(r => !ROLES_FESTIVAL.includes(r)) || roles[0];

    const datos = {
        nombre: String(form.nombre || '').trim(),
        celular: String(form.celular || '').trim(),
        activo: Boolean(form.activo),
        roles,
        rol,
        apps_habilitadas: appsActivas
    };

    // Módulos de Admisión: si estaban "según los roles" (o no había), se recalculan; si eran personalizados, se respetan
    const modsActuales = ficha && Array.isArray(ficha.modulos_habilitados) ? ficha.modulos_habilitados : null;
    if (!modsActuales || mismosElementos(modsActuales, modulosSegunRoles(rolesViejos))) {
        datos.modulos_habilitados = modulosSegunRoles(roles);
    }
    return datos;
}

/* Documento acceso/lista: copia exacta de sincronizarListaAcceso() de Admisión, en versión pura */
export function construirListaAcceso(fichas) {
    const emails = new Set(), admins = new Set(), festivales = new Set(), sonidistas = new Set(), planificadores = new Set(), coordinadores = new Set();
    (fichas || []).forEach(u => {
        const e = (u.email || '').toLowerCase().trim();
        if (!e || u.activo === false) return;
        const roles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [u.rol || ''];
        const esSonidistaU = roles.includes('sonidista_festivales');
        const esPlanificadorU = roles.includes('planificador_clases');
        const soloFestivalesU = (esSonidistaU || esPlanificadorU) && roles.every(r => !r || r === 'sonidista_festivales' || r === 'planificador_clases');
        if (esSonidistaU) sonidistas.add(e);
        if (esPlanificadorU) planificadores.add(e);
        if (!soloFestivalesU) emails.add(e);
        const esAdminU = roles.includes('admin') || u.rol === 'admin';
        if (esAdminU) admins.add(e);
        if (esAdminU || roles.includes('gestor_festivales')) festivales.add(e);
        if (roles.includes('coordinador') || roles.includes('coordinador_grupos') || u.rol === 'coordinador' || u.rol === 'coordinador_grupos') coordinadores.add(e);
    });
    return {
        emails: [...emails].sort(),
        admins: [...admins].sort(),
        festivales: [...festivales].sort(),
        sonidistas: [...sonidistas].sort(),
        planificadores: [...planificadores].sort(),
        coordinadores: [...coordinadores].sort(),
        actualizado: new Date().toISOString()
    };
}
