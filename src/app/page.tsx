"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import React from "react";
import Image from "next/image";
import jwt from "jsonwebtoken";
import { DecodedToken } from "./components/SecureRoute";

const LoginForm = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [activeField, setActiveField] = useState("username");
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please fill in all fields");
      return;
    }
    const formData = { username, password };
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      if (response.status === 200) {
        const { token, role } = await response.json();
        localStorage.setItem("token", token);
        const decodedToken = jwt.decode(token) as DecodedToken;
        if (decodedToken && decodedToken.user) {
          localStorage.setItem("user", decodedToken.user.toString());
        }

        if (role === "admin") {
          router.push("/admin");
        } else {
          router.push("/home");
        }
      } else {
        setError("Login Failed! Invalid credentials");
      }
    } catch (err) {
      setError("Login failed");
      console.error(err);
    }
  };

  const handleInputClick = (field: React.SetStateAction<string>) => {
    setActiveField(field);
  };

  const KeyPadWrite = (value: string | number) => {
    if (value === -1) {
      if (activeField === "username") {
        setUsername((prev) => prev.slice(0, -1));
      } else {
        setPassword((prev) => prev.slice(0, -1));
      }
    } else {
      if (activeField === "username") {
        setUsername((prev) => prev + value);
      } else {
        setPassword((prev) => prev + value);
      }
    }
  };

  return (
    <div className="container p-5">
      <div className="row px-5">
        <div className="col d-flex flex-column">
          <div className="p-3 border bg-light mb-3">
            <form onSubmit={handleSubmit} className="px-4 py-3">
              {error && <p style={{ color: "red" }}>{error}</p>}
              <div className="form-outline mb-4 col-xs-3">
                <label className="form-label" htmlFor="username">
                  User name / code
                </label>
                <input
                  type="text"
                  id="username"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onClick={() => handleInputClick("username")}
                />
              </div>
              <div className="form-outline mb-4">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  className="form-control lg-4"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onClick={() => handleInputClick("password")}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-block"
              >
                Sign in
              </button>
            </form>
          </div>

          <div className="btn-group-vertical w-100 mt-3" role="group">
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(1)}
              >
                1
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(2)}
              >
                2
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(3)}
              >
                3
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(4)}
              >
                4
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(5)}
              >
                5
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(6)}
              >
                6
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(7)}
              >
                7
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(8)}
              >
                8
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(9)}
              >
                9
              </button>
            </div>
            <div className="btn-group mb-2" role="group">
              <button
                type="button"
                className="btn btn-outline-danger py-4"
                onClick={() => KeyPadWrite(-1)}
              >
                &lt; Backspace
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary py-4"
                onClick={() => KeyPadWrite(0)}
              >
                0
              </button>
            </div>
          </div>
        </div>
        <div className="col d-flex flex-column">
          <div className="p-3 border bg-light mb-3">
            <div className="p-3 border bg-light h-100 d-flex flex-column justify-content-center align-items-center">
              <Image
                src="/images/jk-big.png"
                width={300}
                height={500}
                className="m-2"
                alt="logo"
              />
              <span className="text-muted display-4">PosMan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
