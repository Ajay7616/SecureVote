require("dotenv").config(); 
const express    = require("express");
const cors       = require("cors");
const path       = require("path");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const cron = require("node-cron");
const { autoUpdateElectionStatus } = require("./controllers/electionController");

const decryptRequest  = require("./middleware/decryptRequest");
const encryptResponse = require("./middleware/encryptResponse");
const cspMiddleware   = require("./middleware/csp");
const { generalLimiter } = require("./middleware/rateLimiter");

const pool = require("./config/database");
const { deleteOldFeedback } = require("./controllers/issueController");
const app = express();

app.use(cspMiddleware);
app.use(
  cors({
    origin:      process.env.FRONTEND_URL,   
    credentials: true,                    
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(decryptRequest);
app.use(encryptResponse);

(async () => {
  try {
    const client = await pool.connect();
    client.release();
  } catch (error) {
    process.exit(1);
  }
})();

app.use("/api/auth",      require("./routes/auth"));
app.use("/api/elections", require("./routes/elections"));
app.use("/api/wards",     require("./routes/ward"));
app.use("/api/candidates",require("./routes/candidates"));
app.use("/api/voters",    require("./routes/voters"));
app.use("/api/votes",     require("./routes/votes"));
app.use("/api/issues",    require("./routes/issues"));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "OK", database: "connected" });
  } catch {
    res.status(500).json({ status: "ERROR", database: "disconnected" });
  }
});

app.use((err, req, res, next) => {
  res.status(500).json({
    error:   "Something went wrong!",
    message: err.message,
  });
});

cron.schedule("* * * * *", () => {
  autoUpdateElectionStatus();
  deleteOldFeedback();
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ✅ Database connected successfully
  🚀 Server running on port ${PORT}`
  );
});