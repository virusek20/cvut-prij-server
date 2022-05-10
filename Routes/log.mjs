'use strict';

import { addLog, logs } from '../Stores/log.mjs';
import { isTokenPrivileged } from '../Stores/user.mjs';

export function registerRoutes(server) {
    // Complete log listing
    server.route({
        method: 'GET',
        path: '/api/log',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            if (!isTokenPrivileged(request.headers["authorization"])) {
                return h.response({ message: "Forbidden", errCode: "forbidden" }).code(403);
            }

            return h.response(logs);
        }
    });

    server.route({
        method: 'POST',
        path: '/api/log/clear',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            if (!isTokenPrivileged(request.headers["authorization"])) {
                return h.response({ message: "Forbidden", errCode: "forbidden" }).code(403);
            }

            logs.length = 0;
            addLog("Cleared website logs, old logs are still available on the server", "info");
            return h.response();
        }
    });
}