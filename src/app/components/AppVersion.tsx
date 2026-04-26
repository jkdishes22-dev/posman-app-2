"use client";

import React from "react";

interface AppVersionProps {
  isCollapsed?: boolean;
}

const AppVersion: React.FC<AppVersionProps> = ({ isCollapsed = false }) => {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || "—";

  return (
    <div
      className="px-3 py-2 text-muted"
      style={{ fontSize: "0.75rem" }}
      title={`Version ${version}`}
    >
      {isCollapsed ? (
        <i className="bi bi-tag" style={{ opacity: 0.5 }}></i>
      ) : (
        <span style={{ opacity: 0.6 }}>
          <i className="bi bi-tag me-1"></i>v{version}
        </span>
      )}
    </div>
  );
};

export default AppVersion;
