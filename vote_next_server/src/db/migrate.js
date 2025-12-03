const fs = require("fs");
const path = require("path");
const { pool } = require("../config/db");

async function runSQLFilesInDir(dirPath) {
  const files = fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const sql = fs.readFileSync(filePath, "utf8");

    console.log(`📦 Running: ${file}`);
    await pool.query(sql);
  }
}

async function migrate() {
  console.log("🚀 Running migrations...");
  await runSQLFilesInDir(path.join(__dirname, "migrations"));

  console.log("🌱 Running seeds...");
  await runSQLFilesInDir(path.join(__dirname, "seeds"));

  console.log("🎉 Done!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
