const { exec } = require("node:child_process");

const CONTAINER = "backend-postgres-1";

function checkPostgres() {
  exec(`docker exec ${CONTAINER} pg_isready --host localhost`, handleReturn);

  function handleReturn(_error, stdout) {
    if ((stdout || "").search("accepting connections") === -1) {
      process.stdout.write(".");
      setTimeout(checkPostgres, 300);
      return;
    }

    console.log("\n🟢 Postgres is ready and accepting connections!");
  }
}

process.stdout.write("\n🔴 Waiting for Postgres to accept connections");
checkPostgres();
