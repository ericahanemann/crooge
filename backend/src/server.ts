import { app } from "./app.ts";

const PORT = 3333;

app.listen({ host: "0.0.0.0", port: PORT }).then(() => {
  console.log(`🚀 HTTP server running on port ${PORT}`);
});
