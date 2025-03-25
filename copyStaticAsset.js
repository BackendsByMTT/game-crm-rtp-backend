const fs = require("fs-extra");
const path = require("path");

const srcDir = path.join(__dirname, "src", "public");
const destDir = path.join(__dirname, "dist", "src", "public");

fs.copy(srcDir, destDir)
  .then(() => console.log("✅ Static assets copied successfully!"))
  .catch(err => console.error("❌ Error copying static assets:", err));