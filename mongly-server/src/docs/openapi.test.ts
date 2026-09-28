import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv from "ajv-draft-04";
import { describe, expect, it } from "vitest";
import { openapi } from "./openapi";

describe("frontend OpenAPI contract", () => {
  it("exported docs/openapi.json matches the Swagger UI source", () => {
    const exported = JSON.parse(readFileSync(resolve(__dirname, "../../../docs/openapi.json"), "utf8"));
    expect(exported).toEqual(openapi);
  });

  it("all local schema references resolve", () => {
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      if ("$ref" in value && typeof value.$ref === "string" && value.$ref.startsWith("#/")) {
        const segments = value.$ref.slice(2).split("/").map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
        let target: any = openapi;
        for (const part of segments) target = target?.[part];
        expect(target, `Unresolved reference: ${value.$ref}`).toBeDefined();
      }
      for (const item of Object.values(value)) visit(item);
    };
    visit(openapi);
  });

  it("is valid OpenAPI 3.0 and every documented response example matches its schema", async () => {
    // The parser dereferences in place: isolate it from the live app's spec object.
    const spec: any = await SwaggerParser.validate(JSON.parse(JSON.stringify(openapi)));
    const ajv = new Ajv({ strict: false, validateFormats: false, allErrors: true });
    let examplesChecked = 0;
    for (const [path, item] of Object.entries<any>(spec.paths)) {
      for (const [method, operation] of Object.entries<any>(item)) {
        for (const [status, response] of Object.entries<any>(operation.responses ?? {})) {
          for (const media of Object.values<any>(response.content ?? {})) {
            if (!media.schema) continue;
            const validate = ajv.compile(media.schema);
            const examples = [
              ...(media.example === undefined ? [] : [media.example]),
              ...Object.values<any>(media.examples ?? {}).map((example) => example.value),
            ];
            for (const example of examples) {
              expect(validate(example), `${method} ${path} ${status}: ${JSON.stringify(validate.errors)}`).toBe(true);
              examplesChecked++;
            }
          }
        }
      }
    }
    expect(examplesChecked).toBeGreaterThan(0);
  });
});
