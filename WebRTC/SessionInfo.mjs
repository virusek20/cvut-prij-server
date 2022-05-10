/**
 * Descibes a WebRTC session of a single user
 */
 export default class SessionInfo {
    /**
     * User to which this session belongs
     * @type {string}
     */
    token = null;

    /**
     * WebRTC endpoint
     * @type {kurento.WebRtcEndpoint}
     */
    endpoint = null;

    /**
     * Signalling websocket
     * @type {WebSocket}
     */
    ws = null;

    /**
     * SDP offer
     * @type {string}
     */
    offer = null;

    /**
     * ICE candidate for connecting to this user
     * @type {kunreto.IceCandidate}
     */
    pendingCandidates = [];

    constructor(token, endpoint, ws, offer) {
        this.token = token;
        this.endpoint = endpoint,
        this.ws = ws;
        this.offer = offer;

        Object.seal(this);
    }
}