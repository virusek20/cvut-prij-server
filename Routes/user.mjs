'use strict';

import { users, isTokenAdmin, loadCSV, loadJSON } from '../Stores/user.mjs';
import { addLog } from '../Stores/log.mjs';
import { copyFileToUploads } from "../Util/fileUpload.mjs";

export function registerRoutes(server) {
    // Current aplicants
    server.route({
        method: 'GET',
        path: '/api/user',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            if (!isTokenAdmin(request.headers["authorization"])) {
                return h.response({ message: "Forbidden", errCode: "forbidden" }).code(403);
            }

            return h.response(users)
        }
    });

    // Applicant add
    server.route({
        method: 'POST',
        path: '/api/user/add',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            if (!isTokenAdmin(request.headers["authorization"])) {
                return h.response({ message: "Forbidden", errCode: "forbidden" }).code(403);
            }
        }
    });

    // Applicant update
    server.route({
        method: 'POST',
        path: '/api/user/update',
        handler: (request, h) => {
            if (request.headers["authorization"] === undefined) {
                return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
            }

            if (!isTokenAdmin(request.headers["authorization"])) {
                return h.response({ message: "Forbidden", errCode: "forbidden" }).code(403);
            }
        }
    });

    // Applicant file upload
    server.route({
        method: 'POST',
        path: '/api/user/upload',
        config: {
            payload: {
                maxBytes: 10000000, // 10MB
                output: 'file',
                parse: true
            },
            handler: async (request, h) => {
                if (request.headers["authorization"] === undefined) {
                    return h.response({ message: "Malformed request, missing parameters", errCode: "malform" }).code(400);
                }

                if (!isTokenAdmin(request.headers["authorization"])) {
                    return h.response({ message: "Invalid token", errCode: "invalidToken" }).code(403);
                }

                return copyFileToUploads(request.payload.path)
                .then(target => {
                    try {
                        loadCSV(target);

                        addLog(`Parsed user CSV file`, "info");
                        return h.response({ message: "ok" });
                    }
                    catch(e) { addLog(e, "error"); }

                    try {
                        loadJSON(target);

                        addLog(`Parsed user JSON file`, "info");
                        return h.response({ message: "ok" });
                    }
                    catch(e) { addLog(e, "error"); }
                    
                    addLog(`Failed to parse uploaded user file, error: ${err.toString()}`, "error");
                    return h.response({ errCode: "invalid_format" }).code(400);
                })
                .catch(err => {
                    addLog(`Failed to save uploaded user file, error: ${err.toString()}`, "error");
                    return h.response({ message: "Failed to save uploaded file", error: err.toString() }).code(500);
                });
            }
        }
    });
}