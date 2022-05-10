import { findUserByToken, UserType } from "../Stores/user.mjs";
import { mainRoom, rooms } from "../WebRTC/webrtcServer.mjs";
import { addLog } from "../Stores/log.mjs";

export async function onMessage(token, data, ws) {
    const sender = findUserByToken(token);

    switch (data.command) {
        // An ice candidate that represents that user
        case "iceCandidate":
            if (data.candidate === null) return;
            
            if (data.room === "sage") await mainRoom.addIceCandidate(token, data.candidate);
            else {
                const room = rooms[data.room];
                if (room === undefined) addLog(`Attempted to add ICE candidate to unknown room '${room}'`, "error");
                else await room.addIceCandidate(token, data.candidate);
            }
            break;
        // SDP offer
        case "sdpOffer":
            if (sender.userType === UserType.Sage) {
                let response;
                if (data.room === "sage") response = await mainRoom.startPresenter(token, ws, data.sdp.sdp);
                else response = await rooms[data.room].startPeer(token, ws, data.sdp.sdp);

                if (response === null) {
                    addLog(`Invalid SDP offer from SAGE, ignoring`, "error");
                    return;
                }
                
                ws.send(JSON.stringify({
                    command: "sdpAnswer",
                    response,
                    room: data.room
                }));
            }
            else {
                let response;
                if (data.room === "sage") response = await mainRoom.startPeer(token, ws, data.sdp.sdp);
                else response = await rooms[data.room].startPeer(token, ws, data.sdp.sdp);

                if (response === null) {
                    addLog(`Invalid SDP offer from token '${token}', ignoring`, "error");
                    return;
                }

                ws.send(JSON.stringify({
                    command: "sdpAnswer",
                    response,
                    room: data.room
                }));
            }
            break;
    }
}