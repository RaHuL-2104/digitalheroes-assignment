import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F172A",
        sand: "#F8F5EF",
        pine: "#134E4A",
        ember: "#B45309",
        ocean: "#1D4ED8"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top left, rgba(29,78,216,0.3), transparent 38%), radial-gradient(circle at 80% 20%, rgba(180,83,9,0.25), transparent 42%), linear-gradient(140deg, #F8F5EF, #EEF4FF)"
      },
      boxShadow: {
        card: "0 10px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
