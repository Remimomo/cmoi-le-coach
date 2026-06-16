import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#F6F2EB",
          900: "#FFFDF8",
          850: "#FDF8EF",
          800: "#ECE4D8"
        },
        moss: "#A8C3A5",
        ember: "#D87D4A",
        night: "#2C3E50",
        mist: "#5F6F7D",
        cloud: "#FFFDF8"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(44, 62, 80, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
