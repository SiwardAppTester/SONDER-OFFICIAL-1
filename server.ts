import express, { Request, Response } from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// 1) Serve the static files from the "dist" (or "build") folder
app.use(express.static(path.join(__dirname, "dist")));

// 2) For *any* request that isn’t a static file, serve index.html
app.get("*", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// 3) Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});