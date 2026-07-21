import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT ?? 4000);

createApp().listen(port, () => {
  console.log(`mongly-server listening on http://localhost:${port} (docs: /api/docs)`);
});
