import app from "./app";

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number");
}

const server = app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

server.on("error", (error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

function shutdown(signal: string) {
  console.log(`${signal} received; shutting down`);

  server.close((error) => {
    if (error) {
      console.error("Error while closing server:", error);
      process.exitCode = 1;
    }
    process.exit();
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
