'use strict';

import {promises as fsp} from "fs";
import { onLog } from "../Websocket/admin.mjs";

let lastLogId = 0;
const severityColor = { info: "\u001b[36m", warning: "\u001b[33m", error: "\u001b[31m", success: "\u001b[32m", reset: "\u001b[0m" }

// TODO: Make severity a class

class Log {
    severity = "";
    text = "";
    timestamp;
    id = 0;

    constructor(text, severity) {
        this.severity = severity;
        this.text = text;
        this.timestamp = new Date();
        this.id = lastLogId++;
    }
}

export async function saveJSON(fileName) {
    const json = JSON.stringify(logs);
    await fsp.writeFile(fileName, json);
}

export function addLog(text, severity) {
    const log = new Log(text, severity);

    console.log(`[${new Date().toLocaleTimeString()}] ${severityColor[severity] ?? severityColor.reset}${severity.toUpperCase()}\u001b[0m | ${text}`);

    logs.push(log);
    onLog(log);
}

export const logs = [];