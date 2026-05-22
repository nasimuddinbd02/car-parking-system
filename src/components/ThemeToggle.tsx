"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
    let initialTheme: "dark" | "light" = "dark";
    if (savedTheme) {
      initialTheme = savedTheme;
    } else {
      const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      initialTheme = prefersLight ? "light" : "dark";
    }
    document.documentElement.setAttribute("data-theme", initialTheme);
    const timer = setTimeout(() => {
      setTheme(initialTheme);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-secondary"
      style={{
        padding: "0.5rem",
        borderRadius: "50%",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border-glass)",
        background: "var(--bg-card)",
        cursor: "pointer"
      }}
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Theme toggle"
    >
      {theme === "dark" ? (
        <Sun size={18} style={{ color: "var(--warning)" }} />
      ) : (
        <Moon size={18} style={{ color: "var(--primary)" }} />
      )}
    </button>
  );
}
