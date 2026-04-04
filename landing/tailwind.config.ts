import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
export default config
