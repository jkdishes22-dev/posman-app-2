"use client";

import SecureRoute from "../../components/SecureRoute";
import RoleAwareLayout from "../../shared/RoleAwareLayout";

const mySales = () => {
  return (
    <RoleAwareLayout>
      <SecureRoute roleRequired="sales">
        <div className="container-fluid p-0">
          <h1>Post dated sales</h1>
        </div>
      </SecureRoute>
    </RoleAwareLayout>
  );
};

export default mySales;
