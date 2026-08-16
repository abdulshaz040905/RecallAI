import { describe, expect, it } from 'vitest'
import {
    assertCan,
    assignableRoles,
    can,
    canAll,
    canAny,
    canManageMember,
    ForbiddenError,
    isRole,
    ROLE_PERMISSIONS,
    ROLES
} from '@/lib/workspace/rbac'

describe('can', () => {
    it('gives owners everything', () => {
        expect(can('OWNER', 'workspace:delete')).toBe(true)
        expect(can('OWNER', 'billing:manage')).toBe(true)
        expect(can('OWNER', 'member:invite')).toBe(true)
    })

    it('stops admins short of billing and deletion', () => {
        expect(can('ADMIN', 'member:invite')).toBe(true)
        expect(can('ADMIN', 'integration:manage')).toBe(true)
        expect(can('ADMIN', 'workspace:delete')).toBe(false)
        expect(can('ADMIN', 'billing:manage')).toBe(false)
    })

    it('lets members create but not administer', () => {
        expect(can('MEMBER', 'meeting:create')).toBe(true)
        expect(can('MEMBER', 'meeting:update')).toBe(true)
        expect(can('MEMBER', 'meeting:delete')).toBe(false)
        expect(can('MEMBER', 'member:invite')).toBe(false)
    })

    it('keeps viewers read-only', () => {
        expect(can('VIEWER', 'meeting:view')).toBe(true)
        expect(can('VIEWER', 'meeting:create')).toBe(false)
        expect(can('VIEWER', 'meeting:update')).toBe(false)
        expect(can('VIEWER', 'integration:manage')).toBe(false)
    })

    it('denies everything for a missing or bogus role', () => {
        expect(can(null, 'meeting:view')).toBe(false)
        expect(can(undefined, 'meeting:view')).toBe(false)
        expect(can('SUPERUSER' as never, 'meeting:view')).toBe(false)
    })
})

describe('permission hierarchy', () => {
    it('makes each role a strict superset of the one below', () => {
        const order = ['VIEWER', 'MEMBER', 'ADMIN', 'OWNER'] as const

        for (let i = 1; i < order.length; i++) {
            const lower = ROLE_PERMISSIONS[order[i - 1]]
            const higher = ROLE_PERMISSIONS[order[i]]

            for (const permission of lower) {
                expect(higher).toContain(permission)
            }

            expect(higher.length).toBeGreaterThan(lower.length)
        }
    })

    it('has no duplicate permissions in any role', () => {
        for (const role of ROLES) {
            const permissions = ROLE_PERMISSIONS[role]
            expect(new Set(permissions).size).toBe(permissions.length)
        }
    })
})

describe('canAll / canAny', () => {
    it('requires every permission for canAll', () => {
        expect(canAll('ADMIN', ['member:invite', 'meeting:delete'])).toBe(true)
        expect(canAll('ADMIN', ['member:invite', 'billing:manage'])).toBe(false)
    })

    it('requires one permission for canAny', () => {
        expect(canAny('MEMBER', ['billing:manage', 'meeting:create'])).toBe(true)
        expect(canAny('VIEWER', ['billing:manage', 'meeting:create'])).toBe(false)
    })
})

describe('canManageMember', () => {
    it('lets an owner manage admins and below', () => {
        expect(canManageMember('OWNER', 'ADMIN')).toBe(true)
        expect(canManageMember('OWNER', 'MEMBER')).toBe(true)
        expect(canManageMember('OWNER', 'VIEWER')).toBe(true)
    })

    it('never lets anyone act on an owner', () => {
        expect(canManageMember('OWNER', 'OWNER')).toBe(false)
        expect(canManageMember('ADMIN', 'OWNER')).toBe(false)
    })

    it('stops an admin acting on a peer admin', () => {
        expect(canManageMember('ADMIN', 'ADMIN')).toBe(false)
        expect(canManageMember('ADMIN', 'MEMBER')).toBe(true)
    })

    it('gives members and viewers no management rights at all', () => {
        expect(canManageMember('MEMBER', 'VIEWER')).toBe(false)
        expect(canManageMember('VIEWER', 'VIEWER')).toBe(false)
    })
})

describe('assignableRoles', () => {
    it('stops an owner minting another owner', () => {
        expect(assignableRoles('OWNER')).toEqual(['ADMIN', 'MEMBER', 'VIEWER'])
    })

    it('stops an admin promoting to admin', () => {
        expect(assignableRoles('ADMIN')).toEqual(['MEMBER', 'VIEWER'])
    })

    it('gives members and viewers nothing to assign', () => {
        expect(assignableRoles('MEMBER')).toEqual([])
        expect(assignableRoles('VIEWER')).toEqual([])
        expect(assignableRoles(null)).toEqual([])
    })
})

describe('isRole', () => {
    it('accepts valid roles only', () => {
        expect(isRole('OWNER')).toBe(true)
        expect(isRole('owner')).toBe(false)
        expect(isRole(42)).toBe(false)
        expect(isRole(null)).toBe(false)
    })
})

describe('assertCan', () => {
    it('is silent when allowed', () => {
        expect(() => assertCan('OWNER', 'workspace:delete')).not.toThrow()
    })

    it('throws a 403-shaped error when denied', () => {
        try {
            assertCan('VIEWER', 'workspace:delete')
            throw new Error('expected assertCan to throw')
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError)
            expect((error as ForbiddenError).status).toBe(403)
        }
    })
})
