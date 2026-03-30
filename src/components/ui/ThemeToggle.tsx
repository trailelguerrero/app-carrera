import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** Size in px of the button. Default 32. */
  size?: number;
}

export function ThemeToggle({ size = 32 }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ width: size, height: size }} />;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "1px solid var(--teg-border)",
        borderRadius: 8,
        cursor: "pointer",
        color: "var(--teg-text-secondary)",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--teg-cyan-subtle)";
        e.currentTarget.style.borderColor = "var(--teg-cyan-border)";
        e.currentTarget.style.color = "var(--teg-cyan)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "var(--teg-border)";
        e.currentTarget.style.color = "var(--teg-text-secondary)";
      }}
    >
      {isDark ? (
        <Sun size={size * 0.5} strokeWidth={2} />
      ) : (
        <Moon size={size * 0.5} strokeWidth={2} />
      )}
    </button>
  );
}
