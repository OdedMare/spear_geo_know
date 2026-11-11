// eslint-config-next ships a flat config directly. Going through
// FlatCompat instead trips a circular-reference crash in its schema
// validator on this version.
import next from "eslint-config-next";

const config = [
  ...next,
  // Flags are small static SVGs from public/; next/image has nothing to optimise.
  { rules: { "@next/next/no-img-element": "off" } },
  { ignores: [".next/**", "node_modules/**", "public/**"] },
];

export default config;
