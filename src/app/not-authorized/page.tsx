"use client";

import React from "react";
import { useRouter } from "next/navigation";

const NotAuthorizedPage = () => {
  const router = useRouter();

  const loginPage = () => {
    router.push("/");
  };
  return (
    <div className="container">
      <h3>Access Denied</h3>
      <p>You do not have permission to view this page. </p>
      <span>
        Have an account? &nbsp;
        <a className="navbar-brand link-primary" href="#" onClick={loginPage}>
          Login instead
        </a>
      </span>
    </div>
  );
};

export default NotAuthorizedPage;
