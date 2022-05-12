'use strict';

import Hapi from '@hapi/hapi';
import { restPort } from './config.mjs';
import { registerRoutes as authRoutes } from "./Routes/auth.mjs";
import { registerRoutes as userRoutes } from "./Routes/user.mjs";
import { registerRoutes as logRoutes } from "./Routes/log.mjs";
import { registerRoutes as groupRoutes } from "./Routes/group.mjs";
import { addLog } from './Stores/log.mjs';
import { createRooms } from './WebRTC/webrtcServer.mjs';
import { registerAuthStrategies } from './authStrategies.mjs';
import "./Websocket/websocket.mjs";

const init = async () => {
    const server = Hapi.server({ port: restPort });

    await registerAuthStrategies(server);
    server.auth.default("session");
    
    authRoutes(server);
    userRoutes(server);
    logRoutes(server);
    groupRoutes(server);

    await createRooms();

    await server.start();
    addLog(`Server running on ${server.info.uri}`, "info");
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();