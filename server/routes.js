import fs from "fs";
import path from "path";

const dataFolder = path.join(process.cwd(), "server", "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { recursive: true });
}

export default function routes(app) {
  // Home test
  app.get("/", (req, res) => {
    res.send("Hello velu! Your server is working 😊");
  });

  // Ping test
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong 🏓" });
  });

  // SAVE PROJECT  (POST /api/save)
  app.post("/api/save", (req, res) => {
    const project = req.body;
    if (!project || !project.name) {
      return res.status(400).json({ error: "Project must have name" });
    }
    const filePath = path.join(dataFolder, `${project.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(project, null, 2));
    res.json({ ok: true, saved: project.name });
  });

  // LOAD PROJECT (GET /api/load/:name)
  app.get("/api/load/:name", (req, res) => {
    const name = req.params.name;
    const filePath = path.join(dataFolder, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Not found" });
    }
    const data = fs.readFileSync(filePath, "utf8");
    res.type("application/json").send(data);
  });

  // LIST PROJECTS (GET /api/list)
  app.get("/api/list", (req, res) => {
    const files = fs.readdirSync(dataFolder).filter(f => f.endsWith(".json"));
    const names = files.map(f => f.replace(".json", ""));
    res.json({ projects: names });
  });
}
