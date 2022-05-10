import { addLog } from "../Stores/log.mjs";
import { states, ApplicantState, SeenState } from "../Stores/session.mjs";
import { findUserByToken, users, UserType } from "../Stores/user.mjs";
import { getSocketByToken } from "./websocket.mjs";

export async function onMessage(token, data, ws) {
    const sender = findUserByToken(token);

    if (sender.userType === UserType.Sage || sender.userType == UserType.Interviewer) await sageCommands(token, data, ws);
    else if (sender.userType === UserType.Applicant) await applicantCommands(token, data, ws);
}

export async function notifySage(token, username, state) {
    users.filter(u => u.userType == UserType.Sage || u.userType == UserType.Interviewer)
    .map(u => getSocketByToken(u.token))
    .filter(ws => ws !== undefined)
    .forEach(ws => {
        ws.send(JSON.stringify({
            command: "applicantState",
            username,
            token,
            state
        }));
    });
}

export async function applicantCommands(token, data, ws) {
    const applicant = findUserByToken(token);

    switch (data.command) {
        case "requestTalk":
            addLog(`User '${applicant.username}' requested to speak`, "info");

            states[token].requestTalk = true;
            notifySage(token, applicant.username, states[token]);
            states[token].requestTalk = false;
            break;
    }
}

export async function sageCommands(token, data, ws) {
    const applicant = findUserByToken(data.target);
    const target = getSocketByToken(data.target);
    const sageWs = getSocketByToken(token);

    switch (data.command) {
        case "stopExam":
            if (target === undefined) {
                addLog(`Invalid stop exam target '${data.target}'`, "error");
                return;
            }
            
            addLog(`Stopping ${data.target}`, "info");
            target.send(JSON.stringify({ command: "pageChange", state: "/logout/examEnd" }));
            break;
        case "disconnect":
            if (target === undefined) {
                addLog(`Invalid disconnect target '${data.target}'`, "error");
                return;
            }

            addLog(`Reconnecting ${data.target}`, "info");
            target.send(JSON.stringify({ command: "disconnect" }));
            break;
        case "talk":
            if (target === undefined) {
                addLog(`Invalid talk target '${data.target}'`, "error");
                return;
            }

            users.forEach(u => {
                if (u.userType !== UserType.Applicant) return;
                if (u.token === data.target) return;
                if (states[u.token].interviewRoom !== "") return;
        
                const socket = getSocketByToken(u.token);
                if (socket === undefined) return; // Not connected
        
                socket.send(JSON.stringify({ command: "talkSomeoneElse" }));
            });

            addLog(`Talking exclusively to '${data.target}'`, "info");
            break;
        case "stopTalk":
            if (target === undefined) {
                addLog(`Invalid stop talk target '${data.target}'`, "error");
                return;
            }

            users.forEach(u => {
                if (u.userType !== UserType.Applicant) return;
                if (u.token === data.target) return;
                if (states[u.token].interviewRoom !== "") return;
        
                const socket = getSocketByToken(u.token);
                if (socket === undefined) return; // Not connected
        
                socket.send(JSON.stringify({ command: "stopTalkSomeoneElse" }));
            });

            addLog(`Stopped talking exclusively to '${data.target}'`, "info");
            break;
        case "interviewReady":
            if (target === undefined) {
                addLog(`Invalid interview target '${data.target}'`, "error");
                return;
            }

            states[data.target].markedInterview = true;
            notifySage(data.target, applicant.username, states[data.target]);
            break;
        case "interviewCancel":
            if (target === undefined) {
                addLog(`Invalid interview cancel target ${data.target}`, "error");
                return;
            }

            states[data.target].markedInterview = false;
            notifySage(data.target, applicant.username, states[data.target]);
            break;
        case "requestSageState":
            // Merge static data and state
            const applicants = users
            .filter(u => u.userType === UserType.Applicant && u.isActive)
            .map(u => { 
                return {...u, ...(states[u.token] ?? new ApplicantState()) };
            });

            ws.send(JSON.stringify({ command: "fullSageState", applicants }));
            break;
        case "stop":
            target.send(JSON.stringify({ command: "pageChange", state: "/logout/examEnd" }));
            break;
        case "refresh":
            target.send(JSON.stringify({ command: "disconnect" }));
            break;
        case "changeRoom":
            if (applicant === undefined || applicant.userType !== UserType.Applicant) {
                addLog(`Attempted to change room of an invalid user '${data.target}'`, "warning");
                return;
            }
 
            if (target === undefined) {
                addLog(`Attempted to change room of a disconnected applicant '${data.target}'`, "warning");
                return;
            }

            states[data.target].interviewRoom = data.room;
            if (data.room === "") states[data.target].seenState = SeenState.Seen;
            else states[data.target].seenState = SeenState.Interview;

            target.send(JSON.stringify({ command: "changeRoom", room: data.room }));
            break;
    }
}