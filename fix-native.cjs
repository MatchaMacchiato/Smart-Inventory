const fs = require("fs");
const path = require("path");

function fixDirectory(scopePath, targetName, pkgJsonContent) {
  if (!fs.existsSync(scopePath)) return;
  const items = fs.readdirSync(scopePath);

  const targetPath = path.join(scopePath, targetName);
  if (fs.existsSync(targetPath)) {
    const targetPkgJson = path.join(targetPath, "package.json");
    if (!fs.existsSync(targetPkgJson) && pkgJsonContent) {
      fs.writeFileSync(targetPkgJson, JSON.stringify(pkgJsonContent, null, 2));
    }
    return;
  }

  for (const item of items) {
    if (
      item.startsWith("." + targetName) ||
      (item.startsWith(".") && item.includes(targetName))
    ) {
      const oldPath = path.join(scopePath, item);
      try {
        fs.renameSync(oldPath, targetPath);
        console.log(
          `[Auto-Fix] Restored native module ${targetName} from ${item}`,
        );
        if (pkgJsonContent) {
          fs.writeFileSync(
            path.join(targetPath, "package.json"),
            JSON.stringify(pkgJsonContent, null, 2),
          );
        }
        break;
      } catch (e) {
        // Silent catch
      }
    }
  }
}

try {
  const nodeModules = path.join(__dirname, "node_modules");

  fixDirectory(path.join(nodeModules, "@rollup"), "rollup-win32-x64-msvc", {
    name: "@rollup/rollup-win32-x64-msvc",
    version: "4.62.2",
    main: "rollup.win32-x64-msvc.node",
    os: ["win32"],
    cpu: ["x64"],
  });

  fixDirectory(path.join(nodeModules, "@esbuild"), "win32-x64", {
    name: "@esbuild/win32-x64",
    version: "0.21.5",
    main: "esbuild.exe",
    os: ["win32"],
    cpu: ["x64"],
  });
} catch (err) {
  // Silent fail
}
