const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

// Middleware

app.use(cors());
app.use(express.json());

// server running //

app.get("/", (req, res) => {
  res.send("track mate server is tracking....");
});

app.listen(port, () => {
  console.log(`TrackMAte Server is running on PORT:${port}`);
});
