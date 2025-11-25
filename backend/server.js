// Minimal Node.js API server

const express = require("express");
const app = express();
const port = 5000;

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello, world" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
