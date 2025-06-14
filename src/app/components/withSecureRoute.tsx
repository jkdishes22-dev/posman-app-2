import React from "react";
import SecureRoute from "./SecureRoute";

export function withSecureRoute(Component, options) {
    return function WrappedComponent(props) {
        return (
            <SecureRoute {...options}>
                <Component {...props} />
            </SecureRoute>
        );
    };
} 