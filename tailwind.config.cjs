/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        background: "hsl(222, 47%, 11%)",
        foreground: "hsl(210, 40%, 98%)",
        card: "hsl(222, 47%, 14%)",
        "card-foreground": "hsl(210, 40%, 98%)",
        muted: "hsl(217, 19%, 27%)",
        "muted-foreground": "hsl(215, 20%, 65%)",
        accent: "hsl(212, 94%, 53%)",
        "accent-foreground": "hsl(210, 40%, 98%)",
        border: "hsl(217, 19%, 27%)"
      },
      boxShadow: {
        glow: "0 10px 30px rgba(14, 116, 144, 0.35)"
      }
    }
  },
  plugins: []
};
