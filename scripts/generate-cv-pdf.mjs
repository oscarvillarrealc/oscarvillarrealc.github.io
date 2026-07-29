import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import puppeteer from "puppeteer";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cvHtmlPath = path.join(root, "dist", "cv", "index.html");
const outputPath = path.join(root, "public", "Oscar Villarreal Chaccourt CV.pdf");

console.log("Building site...");
execSync("npm run build", { cwd: root, stdio: "inherit" });

console.log("Rendering CV to PDF...");
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto(`file://${cvHtmlPath}`, { waitUntil: "networkidle0" });
await page.pdf({
  path: outputPath,
  format: "Letter",
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();

console.log(`CV written to ${outputPath}`);
