'use strict';

import { addLog, logs } from '../Stores/log.mjs';

export function registerRoutes(server) {
    // Complete log listing
    server.route({
        method: 'GET',
        path: '/api/log',
        options: { auth: "admin" },
        handler: (request, h) => {
            return h.response(logs);
        }
    });

    // Clear website logs
    server.route({
        method: 'POST',
        path: '/api/log/clear',
        options: { auth: "admin" },
        handler: (request, h) => {
            logs.length = 0;
            addLog("Cleared website logs, old logs are still available on the server", "info");
            return h.response();
        }
    });
}