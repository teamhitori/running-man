

import { createFrontend, createBackend } from '@frakas/api/public';
import { LogLevel } from '@frakas/api/utils/LogLevel';
import { Color3 } from 'babylonjs';
import { babylonSceneServer } from './components/be/babylonSceneServer';
import { babylonSceneClient } from './components/fe/babylonSceneClient';

// Think twice before creating global variables, frontend state cannot see backend, and vice versa.
createFrontend(async api => {
    var client = new babylonSceneClient(api);

    await client.init();
}, { loglevel: LogLevel.info });


// Create backend and receive api for calling frontend
createBackend(api => {
    new babylonSceneServer(api);
}, { loglevel: LogLevel.info });

