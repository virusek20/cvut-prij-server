import { addLog } from "./log.mjs"
import { findUserByToken, UserType } from "./user.mjs"

export class SeenState {
    // Create new instances of the same class as static attributes
    static Connected = new SeenState("connected")
    static Disconnected = new SeenState("disconnected")
    static Seen = new SeenState("seen")
    static Interview = new SeenState("interview")
    static NoShow = new SeenState("noshow")
  
    constructor(name) {
      this.name = name
    }
}

export class ApplicantState {
    markedInterview = false;
    interviewRoom = "";
    requestTalk = false;
    seenState = SeenState.NoShow;
    lastSeen = null;

    constructor() {
        Object.seal(this);
    }
}

/**
 * @type {Object<string, ApplicantState>}
 */
export const states = {};
export let sageToken;

/**
 * 
 * @param {string} token 
 * @returns {ApplicantState} Updated state or null if no change is needed
 */
export function onWebSocketConnected(token) {
    const user = findUserByToken(token);
    
    if (user.userType === UserType.Sage) {
        sageToken = token;
        return null;
    }
    else if (user.userType !== UserType.Applicant) return null;

    const state = states[token];
    if (state === undefined) {
        addLog(`Applicant '${user.username}' connected for the first time`, "info");
        states[token] = new ApplicantState();
        states[token].seenState = SeenState.Connected;
        return states[token];
    }
    else if (state.seenState === SeenState.Disconnected) {
        addLog(`Applicant '${user.username}' connected again`, "info");
        state.seenState = SeenState.Seen;
        state.lastSeen = new Date();
        return state;
    }
    else {
        addLog("Applicant websocket connected despite being open? Are they trying to log in from multiple computers?", "warning");
        return null;
    }
}

/**
 * 
 * @param {string} token 
 * @returns {ApplicantState} Updated state or null if no change is needed
 */
export function onWebSocketClosed(token) {
    const user = findUserByToken(token);
    if (user === undefined || user.userType !== UserType.Applicant) return null;

    states[token].seenState = SeenState.Disconnected;
    return states[token];
}