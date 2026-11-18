export default {
  globs: ["src/pixel-backdrop/element.ts", "src/emulated-canvas/element.ts"],
  packagejson: false,
  plugins: [
    {
      // The analyzer lists #private members too, which no consumer can reach,
      // modules in the order the file system returns them, which differs
      // between machines, and the TypeScript source rather than the shipped
      // JavaScript.
      name: "tidy",
      packageLinkPhase({ customElementsManifest }) {
        customElementsManifest.modules.sort((a, b) =>
          a.path.localeCompare(b.path),
        );
        for (const { declarations = [] } of customElementsManifest.modules) {
          for (const declaration of declarations) {
            declaration.members &&= declaration.members.filter(
              ({ name }) => !name.startsWith("#"),
            );
          }
        }
        const shipped = JSON.parse(
          JSON.stringify(customElementsManifest.modules)
            .replace(/"src\/([^"]+)\.ts"/g, '"dist/$1.js"')
            .replace(/"(\.{1,2}\/[^"]+)\.ts"/g, '"$1.js"'),
        );
        customElementsManifest.modules = shipped;
      },
    },
  ],
};
