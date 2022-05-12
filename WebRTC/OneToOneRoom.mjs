import kurento from "kurento-client";
import SessionInfo from "./SessionInfo.mjs";
import { getKurentoClient } from "./webrtcServer.mjs";
import { addLog } from "../Stores/log.mjs";

export default class OneToOneRoom {
    /**
     * @type {kurento.MediaPipeline}
     */
    pipeline = null;

    peers = [ new SessionInfo(), new SessionInfo() ];

    roomName

    constructor(roomName) {
        this.roomName = roomName;

        Object.seal(this);
    }

    async createRoom() {
        const client = await getKurentoClient();
        this.pipeline = await client.create("MediaPipeline");
    }

    /**
     * Gets a connection assigned to a specific token
     * @param {string} token 
     * @returns {SessionInfo}
     */
    getConnection(token) {
        return this.peers.find(p => p.token === token);
    }

    /**
     * Gets a connection that is not assigned
     * @param {string} token 
     * @returns {SessionInfo}
     */
    getFreeConnection() {
        return this.peers.find(p => p.token === undefined);
    }

    async startPeer(token, ws, offer) {
        let connection = this.getConnection(token);
        if (this.getConnection(token) !== undefined) {
            addLog(`User (${token}) is reconnecting to the WebRTC stream.`, "warning");
        }
        else {
            connection = this.getFreeConnection();
            if (connection === undefined) {
                addLog(`User (${token}) attempted to connect to a full 1 to 1 room.`, "error");
                return;
            }

            addLog(`User (${token}) is connecting to a 1 to 1 room.`, "info");
        }
    
        connection.token = token;
        connection.ws = ws;
        connection.offer = offer;

        if (connection.endpoint !== undefined) {
            connection.endpoint.removeAllListeners();
            connection.endpoint.release();
        }

        connection.endpoint = await this.pipeline.create("WebRtcEndpoint");
        connection.endpoint.setMaxVideoSendBandwidth(5000);

        // Only connect after we have both peers
        if (this.peers[0].endpoint !== undefined && this.peers[1].endpoint !== undefined)
        {
            this.peers[0].endpoint.connect(this.peers[1].endpoint);
            this.peers[1].endpoint.connect(this.peers[0].endpoint);
        }

        connection.endpoint.on("OnIceCandidate", e => {
            var candidate = kurento.getComplexType('IceCandidate')(e.candidate);
            ws.send(JSON.stringify({
                command: 'iceCandidate',
                candidate,
                room: this.roomName
            }));
        });
    
        const answer = await connection.endpoint.processOffer(offer);
        await connection.endpoint.gatherCandidates();

        return answer;
    }

    async stopPeer(token) {
        const connection = this.getConnection(token);
        if (connection === undefined) {
            addLog(`Attempted to stop user (${token}) from a room which they are not connected to.`, "warning");
            return;
        }

        // We can just reuse the endpoint
        connection.token = null;
    }

    /**
     * Registers an ice candidate and assigns them to respective endpoint
     * @param {string} token Token from which the candidate was received
     * @param {*} candidate ICE candidate data
     */
    async addIceCandidate(token, candidate) {
        const connection = this.getConnection(token);
        
        if (connection === undefined) {
            addLog(`Attempted to add candidate to invalid connection (${this.roomName})`, "error");
            return;
        }

        if (connection.endpoint === undefined) {
            connection.pendingCandidates.push(candidate);
        }
        else {
            await connection.endpoint.addIceCandidate(candidate);
            while (connection.pendingCandidates.length) {
                const pendingCandidate = connection.pendingCandidates.pop();
                await connection.endpoint.addIceCandidate(pendingCandidate);
            }
        }
    }
}