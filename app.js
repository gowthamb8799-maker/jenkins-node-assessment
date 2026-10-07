const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const APP_NAME = process.env.APP_NAME || "Node CI/CD Application";

const DATA_DIR = "/app/data";
const DATA_FILE = path.join(DATA_DIR, "activity.log");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

app.get("/", (req, res) => {
    res.status(200).json({
        application: APP_NAME,
        message: "Jenkins CI/CD deployment successful",
        status: "running"
    });
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "UP",
        application: APP_NAME
    });
});

app.get("/save", (req, res) => {

    const message =
        `Application accessed at ${new Date().toISOString()}\n`;

    fs.appendFileSync(DATA_FILE, message);

    res.status(200).json({
        message: "Persistent data saved successfully"
    });
});

app.get("/data", (req, res) => {

    if (!fs.existsSync(DATA_FILE)) {
        return res.status(200).json({
            message: "No persistent data available"
        });
    }

    const data = fs.readFileSync(DATA_FILE, "utf8");

    res.type("text/plain").send(data);
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`${APP_NAME} running on port ${PORT}`);
});
