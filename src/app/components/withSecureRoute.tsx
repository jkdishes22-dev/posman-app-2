import React from "react";
import SecureRoute from "./SecureRoute";

export function withSecureRoute(Component, options) {
    return function WrappedComponent(props) {
        // Support both roleRequired (single) and rolesRequired (array) for backward compatibility
        const secureRouteProps = options.rolesRequired 
            ? { rolesRequired: options.rolesRequired }
            : { roleRequired: options.roleRequired };
        
        return (
            <SecureRoute {...secureRouteProps} allowAnyAuthenticated={options.allowAnyAuthenticated}>
                <Component {...props} />
            </SecureRoute>
        );
    };
} 