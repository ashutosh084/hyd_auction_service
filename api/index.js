import startApp from "../src/index.js";

let appPromise = null;

export default async function handler(req, res) {
    if (!appPromise) {
        appPromise = startApp();
    }
    const fastify = await appPromise;
    fastify.server.emit("request", req, res);
}
