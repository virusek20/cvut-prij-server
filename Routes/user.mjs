'use strict';

import { users, loadCSV, loadJSON, UserType } from '../Stores/user.mjs';
import { addLog } from '../Stores/log.mjs';
import { copyFileToUploads } from "../Util/fileUpload.mjs";
import Boom from '@hapi/boom';
import { createRooms } from '../WebRTC/webrtcServer.mjs';
import { notifyCompleteSage } from '../Websocket/sage.mjs';

export function registerRoutes(server) {
    // Current users
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

    // Enable user
    server.route({
        method: 'POST',
        path: '/api/user/enable',
        options: { auth: "admin" },
        handler: async (request, h) => {
            const id = request.payload.id;
            if (id === undefined) throw Boom.badRequest("No user specified");

            const user = users.find(u => u.id === id);
            if (user === undefined) throw Boom.notFound("Specified user does not exist");
            if (user.userType !== UserType.Applicant) throw Boom.badRequest("Cannot enable a non-applicant user");
            user.active = true;

            await createRooms();
            await notifyCompleteSage();
            return h.response()
        }
    });

    // Disable user
    server.route({
        method: 'POST',
        path: '/api/user/disable',
        options: { auth: "admin" },
        handler: async (request, h) => {
            const id = request.payload.id;
            if (id === undefined) throw Boom.badRequest("No user specified");

            const user = users.find(u => u.id === id);
            if (user === undefined) throw Boom.notFound("Specified user does not exist");
            if (user.userType !== UserType.Applicant) throw Boom.badRequest("Cannot disable a non-applicant user");
            user.active = false;

            await createRooms();
            await notifyCompleteSage();
            return h.response()
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