import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

const config = tseslint.config(
  {
    ignores: [
      ".next/**",
      "dist/**",
      "coverage/**",
      "src/generated/**",
      "prisma/migrations/**",
      "next-env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
);

export default config;
