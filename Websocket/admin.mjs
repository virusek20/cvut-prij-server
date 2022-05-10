import { isTokenAdmin } from "../Stores/user.mjs"
import { socketTokenMap } from "./websocket.mjs";
import { logs } from "../Stores/log.mjs";

export function onLog(log) {
    const connectedAdmins = [];

    for (const token in socketTokenMap.map) {
        if (isTokenAdmin(token)) connectedAdmins.push(socketTokenMap.get(token));
    }

    connectedAdmins.forEach(a => a.send(JSON.stringify({ command: "log", log })))
}

export function onMessage(token, data, ws) {
    if (!isTokenAdmin(token)) {
        return;
    };

    switch (data.command) {
        case "requestLogs":
            ws.send(JSON.stringify({ command: "fullLog", logs }))
            break;
        case "requestSessionState":
            break;
    }
}