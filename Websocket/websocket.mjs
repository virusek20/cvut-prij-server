'use strict';

import { WebSocketServer } from 'ws';
import { findUserByToken } from '../Stores/user.mjs';
import { webSocketPort } from '../config.mjs';
import { addLog } from '../Stores/log.mjs';
import { onMessage as onAdminMessage } from './admin.mjs';
import { onMessage as onChatMessage } from './chat.mjs';
import { onMessage as onWebRtcMessage } from './webrtc.mjs';
import { onMessage as onSageMessage, notifySage } from './sage.mjs';
import TwoWayMap from '../Util/twoWayMap.mjs';
import { onWebSocketClosed as sessionClose, onWebSocketConnected as sessionOpen } from '../Stores/session.mjs';
import { v4 } from 'uuid';

export function getSocketByToken(token) {
    return socketTokenMap.get(token);
}

function verifyMessage(ws, srcAddress, data) {
    const jsonData = JSON.parse(data);
    
    jsonData.messageSource = findUserByToken(socketTokenMap.revGet(ws))?.username ?? "";
    let token = socketTokenMap.revGet(ws);
    if (token === undefined) // New socket, user needs to authenticate first
    {
        if (authenticate(jsonData)) {
            socketTokenMap.add(jsonData.token, ws);
            token = jsonData.token;

            const sessionState = sessionOpen(token);
            if (sessionState !== null) {
                const username = findUserByToken(token).username;
                notifySage(token, username, sessionState);
            }

            ws.send(JSON.stringify({ command: "authenticated", username: findUserByToken(socketTokenMap.revGet(ws))?.username }));
            addLog(`Websocket connection from ${srcAddress} authenticated as '${findUserByToken(token).username}'`, "success");
        }
        else {
            addLog(`Websocket connection from ${srcAddress} failed to authenticate, closing`, "warning");
            ws.send(JSON.stringify({ command: "disconnect", error: "wrongToken" }));
            ws.close();       
            return; 
        }
    }

    onAdminMessage(token, jsonData, ws);
    onChatMessage(token, jsonData, ws);
    onWebRtcMessage(token, jsonData, ws);
    onSageMessage(token, jsonData, ws);
}

function disconnect(ws) {
    const token = socketTokenMap.revGet(ws);
    if (token === undefined) return;

    const username = findUserByToken(token).username;
    const sessionState = sessionClose(token);
    if (sessionState !== null) notifySage(token, username, sessionState);

    addLog(`Websocket connection of user '${username}' closed`, "warning");
    socketTokenMap.revRemove(ws);
}

function authenticate(data) {
    if (data?.command !== "authenticate") return false;
    return findUserByToken(data.token) !== undefined;
}

const wss = new WebSocketServer({ port: webSocketPort });
export const socketTokenMap = new TwoWayMap();

wss.on('connection', (ws, req) => {
    const srcAddress = req.socket.remoteAddress;
    ws.id = v4();

    addLog(`New websocket connection received from '${srcAddress}'`, "info");
    ws.on('message', data => verifyMessage(ws, srcAddress, data));
    ws.on('close', () => disconnect(ws))
});