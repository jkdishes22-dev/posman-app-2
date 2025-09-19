"use client";

import { useState } from "react";
import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import { AuthError } from "src/app/types/types";

const UsersPage: React.FC = () => {

  const [authError, setAuthError] = useState<AuthError>(null);

  return (
    <RoleAwareLayout>
      <div>
        <h1>Users Register</h1>
        {/* Users page content */}
      </div>
    </RoleAwareLayout>
  );
}

export default UsersPage;