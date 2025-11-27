// Server entry point - starts the app and runs repository sync

const config = require("./config");
const dbInit = require("./services/dbInit.service");
const app = require("./app");

// Bootstrap: sync repository and initialize database
dbInit.bootstrap();

// Start the server
app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
