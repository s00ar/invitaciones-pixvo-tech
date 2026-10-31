import { writeFile } from "node:fs/promises";
import { z } from "zod";
import { documentSchema, makeDocument } from "../src/domain/document";
const schema = z.toJSONSchema(documentSchema, { target: "draft-2020-12" });
await writeFile(
  "schemas/invitation.schema.json",
  JSON.stringify(
    {
      ...schema,
      $id: "urn:pixvo:invitation:1",
      title: "Pixvo Invitation Document",
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  "examples/quince.json",
  JSON.stringify(makeDocument("pixvo-glam-pink"), null, 2) + "\n",
);
console.log(
  "Schema y ejemplo actualizados. Las refinaciones semánticas también se validan en servidor.",
);
