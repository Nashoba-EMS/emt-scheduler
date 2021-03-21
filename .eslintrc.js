module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 6,
  },
  rules: {
    "import/order": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-expressions": "off",
    "handle-callback-err": "off",
    "prefer-promise-reject-errors": "off",
    "prefer-const": "error",
    "no-var": "error",
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
  ],
};
