import { findUserByToken, users, UserType } from "../Stores/user.mjs";
import { addLog } from "../Stores/log.mjs";
import { getSocketByToken } from "./websocket.mjs";
import { v4 } from "uuid";

export function onMessage(token, data, ws) {
    const sender = findUserByToken(token);

    switch (data.command) {
        case "requestChatState":
            //ws.send(JSON.stringify({})); // TODO: Do we even want this?
            break;
        case "message":
            if (data.room === "all") messageAll(sender, data.message)
            else message(sender, data.message, data.room);
            break;
    }
}

function message(sender, message, room) {
    const recipient = users.find(u => u.username === room);
    if (recipient === undefined) {
        addLog(`User '${sender.username}' attempted to send a chat message to an invalid room ${room}`, "error");
        return;
    }

    addLog(`User '${sender.username}' sent a chat message '${message}' to room '${recipient.username}'`, "info");

    const recipientSocket = getSocketByToken(recipient.token);
    recipientSocket.send(JSON.stringify({
        command: "message",
        message: {
            timestamp: Date(),
            isRemote: sender.username !== recipient.username, // It's only remote if it gets sent to someone else
            msg: message,
            room,
            sender: sender.username,
            id: v4()
        }
    }));

    // Notify all priviledged users
    // TODO: No real security breach here but wasteful
    users.forEach(u => {
        if (u.userType === UserType.Applicant) return;

        const socket = getSocketByToken(u.token);
        if (socket === undefined) return; // Not connected

        socket.send(JSON.stringify({
            command: "message",
            message: {
                timestamp: Date(),
                isRemote: sender.username !== u.username,
                msg: message,
                room,
                sender: sender.username,
                id: v4()
            }
        }));
    });
}

function messageAll(sender, message) {
    if (sender.userType !== UserType.Sage) {
        addLog(`User '${sender.username}' attempted to send a chat message to everyone`, "error");
        return;
    }

    // Notify sage of their own message
    const sageSocket = getSocketByToken(sender.token);
    sageSocket.send(JSON.stringify({
        command: "message",
        message: {
            timestamp: Date(),
            isRemote: false,
            msg: message,
            room: "all",
            sender: sender.username,
            id: v4()
        }
    }));

    users.forEach(u => {
        if (u.userType !== UserType.Applicant && u.state !== "/exam") return;
        addLog(`SAGE to sent a chat message '${message}' to all applicants in exam`, "info");

        const socket = getSocketByToken(u.token);
        if (socket === undefined) return; // Not connected

        socket.send(JSON.stringify({
            command: "message",
            message: {
                timestamp: Date(),
                isRemote: true,
                msg: message,
                room: "all",
                sender: sender.username,
                id: v4()
            }
        }));
    });
}