import kurento from "kurento-client";
import { addLog } from "../Stores/log.mjs";
import SessionInfo from "./SessionInfo.mjs";
import { getKurentoClient } from "./webrtcServer.mjs";

export default class OneToManyRoom {
    /**
     * SAGE endpoint (sender)
     * There can always be only up to one active SAGE connection
     */
    presenter = new SessionInfo();

    /**
     * Non-SAGE endpoints (receivers)
     * @type {Object<string, SessionInfo>}
     */
    peers = {};

    /**
     * Room pipeline
     * @type {kurento.MediaPipeline}
     */
    pipeline = null;

    roomName;

    constructor(roomName) {
        this.roomName = roomName;
        
        Object.seal(this);
    }

    async createRoom() {
        const client = await getKurentoClient();
        this.pipeline = await client.create("MediaPipeline");
    }

    getConnection(token) {
        return (this.presenter.token === token ? this.presenter : this.peers[token]);
    }

    /**
     * Creates pipeline and endpoints for a presenter
     * @param {string} token Token of the active presenter
     * @param {WebSocket} ws Signalling websocket connected to the user
     * @param {string} offer SDP offer
     */
    async startPresenter(token, ws, offer) {
        if (this.presenter.token !== undefined) {
            // This should not happen in general, but the system should recreate all connection on applicant side if this happens
            addLog("Another SAGE session is being created under a different token, invalidating previous one.", "warning");
        }
        else {
            addLog(`Presenter with token '${token}' is joining the SAGE room.`, "info");
        }
    
        this.presenter.token = token;
        this.presenter.ws = ws;
        this.presenter.offer = offer;
        
        const endpoint = await this.pipeline.create("WebRtcEndpoint");
        this.presenter.endpoint = endpoint;
    
        // No need to add "pending" applicants, presenter always gets created first
        endpoint.on("OnIceCandidate", e => {
            var candidate = kurento.getComplexType('IceCandidate')(e.candidate);
            ws.send(JSON.stringify({
                command: 'iceCandidate',
                candidate,
                room: this.roomName
            }));
        });

        // Connect any pending peers
        for (const peer in this.peers) {
            endpoint.connect(this.peers[peer].endpoint);
        }
    
        const answer = await endpoint.processOffer(offer);
        await endpoint.gatherCandidates();
        return answer;
    }

    /**
     * Creates pipeline and endpoints for a peer, connecting them to the presenter
     * @param {string} token Token of the user
     * @param {WebSocket} ws Signalling websocket connected to the user
     * @param {string} offer SDP offer
     */
    async startPeer(token, ws, offer) {
        if (this.peers[token] !== undefined) {
            addLog(`User (${token}) is reconnecting to the WebRTC stream.`, "warning");
            
            this.peers[token].endpoint.removeAllListeners();
            this.peers[token].endpoint.release();
        }
        else {
            addLog(`User (${token}) is joining the main SAGE room.`, "info")
        }
    
        const endpoint = await this.pipeline.create("WebRtcEndpoint");
        endpoint.on("OnIceCandidate", e => {
            var candidate = kurento.getComplexType('IceCandidate')(e.candidate);
            ws.send(JSON.stringify({
                command: 'iceCandidate',
                candidate,
                room: this.roomName
            }));
        });
    
        this.peers[token] = new SessionInfo(token, endpoint, ws, offer);
        const answer = await endpoint.processOffer(offer);
        this.presenter.endpoint.connect(endpoint);
        await endpoint.gatherCandidates();
    
        return answer;
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