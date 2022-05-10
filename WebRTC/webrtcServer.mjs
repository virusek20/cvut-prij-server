import kurento from "kurento-client";
import { kurentoEndpoint } from "../config.mjs";
import { addLog } from "../Stores/log.mjs";
import { users, UserType } from "../Stores/user.mjs";
import OneToManyRoom from "./OneToManyRoom.mjs";
import OneToOneRoom from "./OneToOneRoom.mjs";

let kurentoClient = null;

/**
 * @type {OneToManyRoom}
 */
export let mainRoom = null;

/**
 * @type {Object<string, OneToOneRoom>}
 */
export let rooms = {}

export async function createRooms() {
    if (mainRoom === null) {
        addLog("Created SAGE one to many room", "info");
        mainRoom = new OneToManyRoom("sage");
        await mainRoom.createRoom();
    }

    users.forEach(u => {
        if (u.userType === UserType.Applicant || u.userType === UserType.Interviewer)
        {
            if (!u.isActive()) {
                delete rooms[u.username];
                return;
            }

            if (rooms[u.username] === undefined) {
                addLog(`Created one to one room for user '${u.username}'`, "info");
                rooms[u.username] = new OneToOneRoom(u.username);
                rooms[u.username].createRoom();
            }
        }
    });
}

/**
 * Gets or creates a Kurento client.
 * @returns {Promise<kurento.ClientInstance>}
 */
export async function getKurentoClient() {
    if (kurentoClient !== null) return kurentoClient;

    try {
        kurentoClient = await kurento(kurentoEndpoint);
        return kurentoClient;
    }
    catch (e) {
        addLog(`Could not find media server at address ${argv.ws_uri}.`, "error");
        throw e;
    }
}