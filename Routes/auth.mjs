'use strict';

import { users, UserType } from '../Stores/user.mjs';
import { addLog } from '../Stores/log.mjs';
import { sageToken, states } from '../Stores/session.mjs';

export function registerRoutes(server) {
    // Login
    server.route({
        method: 'POST',
        path: '/api/auth/login',
        handler: (request, h) => {
            if (request.payload.username === null || request.payload.password === null) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            var user = users.find(u => u.username === request.payload.username);
            if (user === undefined) {
                addLog(`User with unknown username '${request.payload.username}' tried to log in`, "warning");
                return h.response({ message: "Unknown username", errCode: "invalidUsername" }).code(403);
            }

            // This is usually a REALLY big security flaw, but applicants were often panicking why their login wasn't working and being late because of it
            // telling them which field is wrong should prevent that
            if (user.password !== request.payload.password) {
                addLog(`User '${request.payload.username}' tried to log in with wrong password`, "warning");
                return h.response({ message: "Wrong password", errCode: "invalidPassword" }).code(403);
            }

            if (!user.isActive()) {
                addLog(`User '${request.payload.username}' tried to login when not active`, "warning");
                return h.response({ message: "Correct login but incorrect time, please check the clock on the right and verify the time matches your admission exam time. If the time is correct please wait a minute or so and try again, we're preparing the next exam.", errCode: "wrongTime" }).code(403);
            }

            if (sageToken === undefined && user.userType === UserType.Applicant) {
                addLog(`User '${request.payload.username}' tried to login before SAGE`, "warning");
                // TODO: This should really automatically retry with a spinner...
                return h.response({ message: "We're preparing the exam, please try again in a few moments.", errCode: "sageNotOn" }).code(403);
            }

            let token = user.token;
            if (token !== "") addLog(`User '${request.payload.username}' logged in despite already getting a token, maybe a different pc?`, "warning");
            else token = user.generateToken();

            const room = states[token]?.interviewRoom;

            addLog(`User '${request.payload.username}' logged in with token '${token}'`, "success");
            return h.response({ token, state: user.state, room });
        }
    });

    // Token verification
    server.route({
        method: 'POST',
        path: '/api/auth/token',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            var user = users.find(u => u.token === request.headers["authorization"]);
            if (user === undefined) {
                addLog(`Unknown user attempted to verify invalid token '${request.headers["authorization"]}'`, "error");
                return h.response({ message: "Invalid token", errCode: "invalidToken" }).code(403);
            }

            return h.response({ success: true, state: user.state, username: user.username });
        }
    });
}