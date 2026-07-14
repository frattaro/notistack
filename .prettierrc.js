import sortImportsPlugin from "@trivago/prettier-plugin-sort-imports";

const config = {
  trailingComma: "none",
  importOrder: ["<THIRD_PARTY_MODULES>", "^[../]", "^[./]"],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  plugins: [sortImportsPlugin]
};

export default config;
