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

   Transición (v1.1): mientras Admisión y Festival sigan asignando roles, el acceso efectivo
   es la UNIÓN de apps_habilitadas y lo que se deduce de los roles. Así nadie pierde acceso
   por un usuario creado o editado desde Admisión que todavía no tenga el campo nuevo.
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

/* Acceso efectivo durante la transición: unión de lo guardado y lo deducido de los roles */
export function appsEfectivas(u) {
    return ordenarApps([...new Set([...appsGuardadas(u), ...appsSegunRoles(u)])]);
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
