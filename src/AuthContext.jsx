import axios from "axios";
import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // user info
  const [loading, setLoading] = useState(true);

  // At mount, check for user in sessionStorage
  useEffect(() => {
    const savedUser = sessionStorage.getItem("user");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Function to handle login
  const login = async (email, password) => {
    const res = await axios.post(`${import.meta.env.VITE_API}/auth/login`, { email, password });
    const data = res.data;
    setUser(data.user);

    sessionStorage.setItem("user", JSON.stringify(data.user));
  };

  // Function to handle logout
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}