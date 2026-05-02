import React from "react";

const NavbarTitleSection = ({ onClick }) => {
  return (
    <a className="navbar-brand" href="#" onClick={onClick}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/JKlogo.png"
        alt="JK PosMan"
        width={64}
        height={32}
        className="m-2"
        style={{ height: "auto" }}
      />
      <small className="text-muted dt-font-weight">JK PosMan</small>
    </a>
  );
};

export default NavbarTitleSection;
