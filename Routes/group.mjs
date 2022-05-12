'use strict';

import Boom from "@hapi/boom";
import { users, UserType } from '../Stores/user.mjs';
import { createRooms } from '../WebRTC/webrtcServer.mjs';
import { notifyCompleteSage } from '../Websocket/sage.mjs';

export function registerRoutes(server) {
    // Enable user group
    server.route({
        method: 'POST',
        path: '/api/group/enable',
        options: { auth: "admin" },
        handler: async (request, h) => {
            const group = request.payload.group;
            if (group === undefined) throw Boom.badRequest("No group specified");

            users.filter(u => u.group === group)
            .filter(u => u.userType === UserType.Applicant)
            .forEach(u => {
                u.active = true;
            });

            await createRooms();
            await notifyCompleteSage();
            return h.response()
        }
    });

    // Disable user group
    server.route({
        method: 'POST',
        path: '/api/group/disable',
        options: { auth: "admin" },
        handler: async (request, h) => {
            const group = request.payload.group;
            if (group === undefined) throw Boom.badRequest("No group specified");

            users.filter(u => u.group === group)
            .filter(u => u.userType === UserType.Applicant)
            .forEach(u => {
                u.active = false;
            });

            await createRooms();
            await notifyCompleteSage();
            return h.response()
        }
    });
}