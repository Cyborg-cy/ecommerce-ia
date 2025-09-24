const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
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
