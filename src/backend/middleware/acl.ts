import { NextApiRequest, NextApiResponse } from 'next';
import { hasPermission, getRolePermissions } from '../config/role-permissions';

export interface AuthenticatedRequest extends NextApiRequest {
    user?: {
        id: number;
        roles: string[];
        permissions: string[];
    };
}

// ACL middleware factory
export function requirePermission(permission: string) {
    return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
        return async (req: AuthenticatedRequest, res: NextApiResponse) => {
            try {
                // Check if user is authenticated
                if (!req.user) {
                    return res.status(401).json({ message: 'Authentication required' });
                }

                // Check if user has the required permission
                if (!hasPermission(req.user.roles, permission)) {
                    return res.status(403).json({
                        message: 'Insufficient permissions',
                        required: permission,
                        userRoles: req.user.roles
                    });
                }

                // User has permission, proceed with handler
                return await handler(req, res);
            } catch (error) {
                console.error('ACL middleware error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        };
    };
}

// Multiple permissions middleware
export function requireAnyPermission(permissions: string[]) {
    return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
        return async (req: AuthenticatedRequest, res: NextApiResponse) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Authentication required' });
                }

                // Check if user has any of the required permissions
                const hasAnyPermission = permissions.some(permission =>
                    hasPermission(req.user.roles, permission)
                );

                if (!hasAnyPermission) {
                    return res.status(403).json({
                        message: 'Insufficient permissions',
                        required: permissions,
                        userRoles: req.user.roles
                    });
                }

                return await handler(req, res);
            } catch (error) {
                console.error('ACL middleware error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        };
    };
}

// All permissions middleware
export function requireAllPermissions(permissions: string[]) {
    return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
        return async (req: AuthenticatedRequest, res: NextApiResponse) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Authentication required' });
                }

                // Check if user has all required permissions
                const hasAllPermissions = permissions.every(permission =>
                    hasPermission(req.user.roles, permission)
                );

                if (!hasAllPermissions) {
                    return res.status(403).json({
                        message: 'Insufficient permissions',
                        required: permissions,
                        userRoles: req.user.roles
                    });
                }

                return await handler(req, res);
            } catch (error) {
                console.error('ACL middleware error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        };
    };
}

// Role-based middleware
export function requireRole(roles: string[]) {
    return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
        return async (req: AuthenticatedRequest, res: NextApiResponse) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Authentication required' });
                }

                // Check if user has any of the required roles
                const hasRequiredRole = roles.some(role =>
                    req.user.roles.includes(role)
                );

                if (!hasRequiredRole) {
                    return res.status(403).json({
                        message: 'Insufficient role',
                        required: roles,
                        userRoles: req.user.roles
                    });
                }

                return await handler(req, res);
            } catch (error) {
                console.error('ACL middleware error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        };
    };
}

// Business operation restriction for admin
export function restrictBusinessOperations() {
    return (handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) => {
        return async (req: AuthenticatedRequest, res: NextApiResponse) => {
            try {
                if (!req.user) {
                    return res.status(401).json({ message: 'Authentication required' });
                }

                // Check if user is admin and trying to perform business operations
                if (req.user.roles.includes('admin')) {
                    const businessOperations = [
                        'can_add_bill',
                        'can_edit_bill',
                        'can_add_bill_item',
                        'can_edit_bill_item',
                        'can_add_bill_payment',
                        'can_edit_bill_payment',
                        'can_add_payment',
                        'can_edit_payment',
                        'can_add_inventory',
                        'can_edit_inventory'
                    ];

                    // Check if the request is for a business operation
                    const isBusinessOperation = businessOperations.some(permission =>
                        req.url?.includes(permission.replace('can_', '').replace('_', '-'))
                    );

                    if (isBusinessOperation) {
                        return res.status(403).json({
                            message: 'Admin role cannot perform business operations',
                            restriction: 'Business operations are restricted for admin role'
                        });
                    }
                }

                return await handler(req, res);
            } catch (error) {
                console.error('ACL middleware error:', error);
                return res.status(500).json({ message: 'Internal server error' });
            }
        };
    };
}

// Enhanced auth middleware that includes role and permission loading
export function withACL(handler: (req: AuthenticatedRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
        try {
            // This would typically load user roles and permissions from the database
            // For now, we'll simulate this based on the JWT token
            const token = req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({ message: 'Authentication required' });
            }

            // In a real implementation, you would:
            // 1. Decode the JWT token
            // 2. Load user roles from the database
            // 3. Load user permissions based on roles
            // 4. Attach to req.user

            // For now, we'll simulate this
            req.user = {
                id: 1,
                roles: ['admin'], // This would come from the database
                permissions: [] // This would be calculated from roles
            };

            return await handler(req, res);
        } catch (error) {
            console.error('ACL middleware error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
}
