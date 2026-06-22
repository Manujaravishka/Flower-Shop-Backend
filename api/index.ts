import app, { connectDB } from "../src/app";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

connectDB().catch((err) => {
  console.error("Initial DB connection failed:", err);
});

export default app;
