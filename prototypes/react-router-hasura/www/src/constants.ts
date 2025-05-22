import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const srcDir = path.join(__dirname);
export const wwwDir = path.join(srcDir, "..");
