"use client";
import React, { useState, useEffect } from "react";
import { Nav, Navbar, NavDropdown, Badge } from "react-bootstrap";
import Link from "next/link";
import { getMenuItems } from "../../backend/config/role-permissions";

interface User {
  id: number;
  roles: string[];
  firstName: string;
  lastName: string;
}

interface RoleBasedNavigationProps {
  user: User;
  currentPath: string;
}

export default function RoleBasedNavigation({ user, currentPath }: RoleBasedNavigationProps) {
  const [menuItems, setMenuItems] = useState<any[]>([]);

  useEffect(() => {
    // Get menu items based on user's primary role
    const primaryRole = user.roles[0] || "sales";
    const items = getMenuItems(primaryRole);
    setMenuItems(items);
  }, [user.roles]);

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: "Administrator",
      supervisor: "Supervisor",
      sales: "Sales",
      cashier: "Cashier",
      storekeeper: "Storekeeper"
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: "danger",
      supervisor: "warning",
      sales: "primary",
      cashier: "success",
      storekeeper: "info"
    };
    return colors[role] || "secondary";
  };

  return (
    <Navbar expand="lg" className="bg-white shadow-sm">
      <div className="container-fluid">
        <Navbar.Brand href="/" className="fw-bold">
          <i className="bi bi-shop me-2 text-primary"></i>
          POS System
        </Navbar.Brand>
        
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {menuItems.map((item, index) => (
              <Nav.Link
                key={index}
                as={Link}
                href={item.path}
                className={`fw-semibold ${
                  currentPath === item.path ? "text-primary" : "text-dark"
                }`}
              >
                <i className={`${item.icon} me-1`}></i>
                {item.name}
              </Nav.Link>
            ))}
          </Nav>
          
          <Nav>
            <NavDropdown
              title={
                <div className="d-flex align-items-center">
                  <i className="bi bi-person-circle me-2"></i>
                  <span className="fw-semibold">
                    {user.firstName} {user.lastName}
                  </span>
                </div>
              }
              id="user-dropdown"
              align="end"
            >
              <NavDropdown.Header>
                <div className="text-center">
                  <div className="fw-bold">{user.firstName} {user.lastName}</div>
                  <div className="small text-muted">
                    {user.roles.map(role => (
                      <Badge 
                        key={role} 
                        bg={getRoleBadgeColor(role)} 
                        className="me-1"
                      >
                        {getRoleDisplayName(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </NavDropdown.Header>
              <NavDropdown.Divider />
              <NavDropdown.Item href="/profile">
                <i className="bi bi-person me-2"></i>
                Profile
              </NavDropdown.Item>
              <NavDropdown.Item href="/settings">
                <i className="bi bi-gear me-2"></i>
                Settings
              </NavDropdown.Item>
              <NavDropdown.Divider />
              <NavDropdown.Item href="/logout">
                <i className="bi bi-box-arrow-right me-2"></i>
                Logout
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
}
