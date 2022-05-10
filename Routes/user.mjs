'use strict';

import { users, loadCSV, loadJSON } from '../Stores/user.mjs';
import { addLog } from '../Stores/log.mjs';
import { copyFileToUploads } from "../Util/fileUpload.mjs";

export function registerRoutes(server) {
    // Current aplicants
    server.route({
        method: 'GET',
        path: '/api/user',
        options: { auth: "admin" },
        handler: (request, h) => {
            return h.response(users)
        }
    });

    // Applicant add
    server.route({
        method: 'POST',
        path: '/api/user/add',
        options: { auth: "admin" },
        handler: (request, h) => {

        }
    });

    // Applicant update
    server.route({
        method: 'POST',
        path: '/api/user/update',
        options: { auth: "admin" },
        handler: (request, h) => {

        }
    });

    // Applicant file upload
    server.route({
        method: 'POST',
        path: '/api/user/upload',
        options : {
            auth: "admin",
            payload: {
                maxBytes: 10000000, // 10MB
                output: 'file',
                parse: true
            },
            handler: async (request, h) => {
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