// TODO: This is just a concept for further expansions, this NOT used anywhere
// This could be used for advanced interviews with many users

import SessionInfo from "./SessionInfo.mjs";
import { getKurentoClient } from "./webrtcServer.mjs";

export default class ManyToManyRoom {
    pipeline = null;

    /**
     * Users connected to this room
     * @type {SessionInfo[]}
     */
    peers = [];

    constructor() {
        Object.seal(this);
    }

    async createRoom() {
        const client = await getKurentoClient();
        this.pipeline = await client.create("MediaPipeline");
    }

    getConnection(token) {
        return this.peers[token];
    }

    async startPeer(token, ws, offer) {
        if (this.peers[token] !== undefined) {
            addLog(`User (${token}) is reconnecting to the WebRTC stream.`, "warning");
        }
    
        const endpoint = await this.presenter.pipeline.create("WebRtcEndpoint");
        endpoint.on("OnIceCandidate", e => {
            var candidate = kurento.getComplexType('IceCandidate')(e.candidate);
            ws.send(JSON.stringify({
                command: 'iceCandidate',
                candidate
            }));
        });
    
        const answer = await endpoint.processOffer(offer);
        this.presenter.endpoint.connect(endpoint);
        await endpoint.gatherCandidates();
    
        this.peers[token] = new SessionInfo(token, this.presenter.pipeline, endpoint, ws, offer);
        return answer;
    }

    /**
     * Registers an ice candidate and assigns them to respective endpoint
     * @param {string} token Token from which the candidate was received
     * @param {*} candidate ICE candidate data
     */
    async addIceCandidate(token, candidate) {
        const connection = getConnection(token);
        connection.iceCandidate = candidate;
        await connection.endpoint.addIceCandidate(candidate);
    }
}