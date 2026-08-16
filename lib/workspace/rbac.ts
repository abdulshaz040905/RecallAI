/**
 * Role based access control for workspaces.
 *
 * Deliberately dependency free: this module is pure data + pure functions so
 * it can be unit tested exhaustively and imported from both server routes and
 * client components (to hide buttons the user cannot use).
 */

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'

export const ROLES: Role[] = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']

export type Permission =
    | 'workspace:view'
    | 'workspace:update'
    | 'workspace:delete'
    | 'member:view'
    | 'member:invite'
    | 'member:remove'
    | 'member:change_role'
    | 'meeting:view'
    | 'meeting:create'
    | 'meeting:update'
    | 'meeting:delete'
    | 'integration:view'
    | 'integration:manage'
    | 'billing:manage'

const VIEWER_PERMISSIONS: Permission[] = [
    'workspace:view',
    'member:view',
    'meeting:view',
    'integration:view'
]

const MEMBER_PERMISSIONS: Permission[] = [
    ...VIEWER_PERMISSIONS,
    'meeting:create',
    'meeting:update'
]

const ADMIN_PERMISSIONS: Permission[] = [
    ...MEMBER_PERMISSIONS,
    'workspace:update',
    'member:invite',
    'member:remove',
    'member:change_role',
    'meeting:delete',
    'integration:manage'
]

const OWNER_PERMISSIONS: Permission[] = [
    ...ADMIN_PERMISSIONS,
    'workspace:delete',
    'billing:manage'
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    VIEWER: VIEWER_PERMISSIONS,
    MEMBER: MEMBER_PERMISSIONS,
    ADMIN: ADMIN_PERMISSIONS,
    OWNER: OWNER_PERMISSIONS
}

/** Higher number == more authority. Used for "can act on" comparisons. */
export const ROLE_RANK: Record<Role, number> = {
    VIEWER: 1,
    MEMBER: 2,
    ADMIN: 3,
    OWNER: 4
}

export const ROLE_LABELS: Record<Role, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member',
    VIEWER: 'Viewer'
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
    OWNER: 'Full control including billing and deleting the workspace.',
    ADMIN: 'Manage members, integrations and meetings.',
    MEMBER: 'Record meetings and edit their own meeting content.',
    VIEWER: 'Read-only access to meetings and transcripts.'
}

export function isRole(value: unknown): value is Role {
    return typeof value === 'string' && (ROLES as string[]).includes(value)
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
    if (!role || !isRole(role)) {
        return false
    }

    return ROLE_PERMISSIONS[role].includes(permission)
}

export function canAll(role: Role | null | undefined, permissions: Permission[]): boolean {
    return permissions.every((permission) => can(role, permission))
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
    return permissions.some((permission) => can(role, permission))
}

/**
 * Whether `actor` may modify or remove `target`.
 *
 * Rules:
 *  - You must outrank the person you are acting on (admins can't demote admins).
 *  - Nobody can act on an OWNER, including another OWNER — ownership transfer
 *    is a separate, explicit operation.
 */
export function canManageMember(actor: Role | null | undefined, target: Role): boolean {
    if (!actor || !isRole(actor) || !isRole(target)) {
        return false
    }

    if (!can(actor, 'member:change_role')) {
        return false
    }

    if (target === 'OWNER') {
        return false
    }

    return ROLE_RANK[actor] > ROLE_RANK[target]
}

/**
 * Which roles `actor` is allowed to assign. An admin can create members and
 * viewers but cannot mint another admin or an owner.
 */
export function assignableRoles(actor: Role | null | undefined): Role[] {
    if (!actor || !isRole(actor)) {
        return []
    }

    if (actor === 'OWNER') {
        return ['ADMIN', 'MEMBER', 'VIEWER']
    }

    if (actor === 'ADMIN') {
        return ['MEMBER', 'VIEWER']
    }

    return []
}

export class ForbiddenError extends Error {
    readonly status = 403

    constructor(permission: Permission) {
        super(`Missing permission: ${permission}`)
        this.name = 'ForbiddenError'
    }
}

export function assertCan(role: Role | null | undefined, permission: Permission): void {
    if (!can(role, permission)) {
        throw new ForbiddenError(permission)
    }
}
