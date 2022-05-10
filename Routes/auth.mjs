'use strict';

import Boom from "@hapi/boom";
import { users, UserType } from '../Stores/user.mjs';
import { addLog } from '../Stores/log.mjs';
import { sageToken, states } from '../Stores/session.mjs';

export function registerRoutes(server) {
    // Login
    server.route({
        method: 'POST',
        path: '/api/auth/login',
        options: {
            auth: false
        },
        handler: (request, h) => {
            if (request.payload.username === null || request.payload.password === null) {
                throw Boom.badRequest("Malformed request, missing parameters");
            }

            var user = users.find(u => u.username === request.payload.username);
            if (user === undefined) {
                addLog(`User with unknown username '${request.payload.username}' tried to log in`, "warning");
                throw Boom.unauthorized("Unknown username");
            }

            // This is usually a REALLY big security flaw, but applicants were often panicking why their login wasn't working and being late because of it
            // telling them which field is wrong should prevent that
            if (user.password !== request.payload.password) {
                addLog(`User '${request.payload.username}' tried to log in with wrong password`, "warning");
                throw Boom.unauthorized("Wrong password");
            }

            if (!user.isActive()) {
                addLog(`User '${request.payload.username}' tried to login when not active`, "warning");
                throw Boom.forbidden("Correct login but incorrect time, please check the clock on the right and verify the time matches your admission exam time. If the time is correct please wait a minute or so and try again, we're preparing the next exam.");
            }

            if (sageToken === undefined && user.userType === UserType.Applicant) {
                addLog(`User '${request.payload.username}' tried to login before SAGE`, "warning");
                throw Boom.forbidden("We're preparing the exam, please try again in a few moments.");
            }

            let token = user.token;
            if (token !== null) addLog(`User '${request.payload.username}' logged in despite already getting a token, maybe a different pc?`, "warning");
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
            const user = request.auth.artifacts.user;
            return h.response({ success: true, state: user.state, username: user.username });
        }
    });
}