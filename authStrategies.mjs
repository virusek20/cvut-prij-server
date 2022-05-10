'use strict';

import Boom from "@hapi/boom";
import { addLog } from "./Stores/log.mjs";
import { findUserByToken, UserType } from "./Stores/user.mjs";

function headerTokenScheme(server, options) {
    return {
        authenticate: (request, h) => {
            const token = request.raw.req.headers.authorization;
            if (token === undefined) throw Boom.unauthorized("No token");

            const user = findUserByToken(token);
            if (user === undefined) {
                addLog(`Unknown user attempted to verify invalid token '${token}'`, "error");
                throw Boom.unauthorized("Invalid token");
            }

            if (options.priviledged === true && user.isPrivileged() === false) {
                addLog(`User '${user.username}' attempted to access a priviledged resource without permission`, "error");
                throw Boom.forbidden("Not a priviledged user");
            }

            if (options.type !== undefined && user.userType !== options.type) {
                addLog(`User '${user.username}' attempted to access a resource with the wrong user type`, "error");
                throw Boom.forbidden("Invalid user type");
            }

            return h.authenticated({ credentials: { token }, artifacts: { user } });
        }
    }
}

export async function registerAuthStrategies(server) {
    server.auth.scheme("headerTokenScheme", headerTokenScheme);

    server.auth.strategy("session", "headerTokenScheme");
    server.auth.strategy("priviledged", "headerTokenScheme", { priviledged: true });
    server.auth.strategy("admin", "headerTokenScheme", { type: UserType.Admin });
    server.auth.strategy("sage", "headerTokenScheme", { type: UserType.Sage });
}