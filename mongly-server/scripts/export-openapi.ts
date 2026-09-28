import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openapi } from "../src/docs/openapi";

const target = resolve(__dirname, "../../docs/openapi.json");
writeFileSync(target, `${JSON.stringify(openapi, null, 2)}\n`);
console.log("Exported docs/openapi.json from the Swagger UI source.");
