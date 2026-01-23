// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core surfaces
        bg: "#f7f7fb",            // very light grey-blue
        surface: "#ffffff",      // cards
        border: "#e5e7eb",       // soft grey border
        text: "#1f2937",         // dark grey text
        muted: "#6b7280",        // muted grey text

        // Pastel accents
        pink: {
          DEFAULT: "#f6c1d1",
          soft: "#fde7ef",
        },
        purple: {
          DEFAULT: "#d7c7f7",
          soft: "#efeafd",
        },
        blue: {
          DEFAULT: "#c7ddf7",
          soft: "#e9f1fd",
        },

        // Semantic aliases (recommended)
        primary: "#d7c7f7",       // pastel purple
        secondary: "#f6c1d1",     // pastel pink
        accent: "#c7ddf7",        // pastel blue
      },
    },
  },
  plugins: [],
};