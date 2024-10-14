import Image from "next/image";
import React from "react";

const NavbarTitleSection = ({ onClick }) => {
  return (
    <a className="navbar-brand" href="#" onClick={onClick}>
      <Image
        src="/icons/JKlogo.png"
        alt="Add user"
        width={64}
        height={32}
        className="m-2"
      />
      <small className="text-muted dt-font-weight">JK PosMan</small>
    </a>
  );
};

export default NavbarTitleSection;
