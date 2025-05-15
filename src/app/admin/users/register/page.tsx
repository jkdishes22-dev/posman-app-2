"use client";

import { useState } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import { AuthError } from "src/app/types/types";

const UsersPage: React.FC = () => {

  const [authError, setAuthError] = useState<AuthError>(null);

  return (
    <AdminLayout authError={authError}>
      <div>
        <h1>Users Register</h1>
        {/* Users page content */}
      </div>
    </AdminLayout>
  );
}

export default UsersPage;