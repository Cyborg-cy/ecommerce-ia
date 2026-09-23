import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Objeto dedicado SOLO a ignores: en flat config, ignores mezclado con
  // otras claves (como rules) no excluye archivos de los demás configs
  // del array — por eso .next/** igual se estaba lintiando.
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // ⚠️ permite usar any
      "@next/next/no-html-link-for-pages": "off",  // ⚠️ temporal: <a> en lugar de <Link>
      "react-hooks/exhaustive-deps": "warn",       // ⚠️ solo warning, no rompe
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@next/next/no-img-element": "warn",         // ⚠️ no bloquea por <img>
    },
  },
];

export default eslintConfig;
