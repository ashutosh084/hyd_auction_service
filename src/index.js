import Fastify from "fastify";
import path from "path";
import { fileURLToPath } from "url";
import multer from "fastify-multer";
import { connectDatabase } from "./db.js";
import { registerRoutes } from "./routes.js";
import fastifyCookie from "fastify-cookie";
import fastifyCors from "@fastify/cors";

const fastify = Fastify();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public directory
fastify.register(import("@fastify/static"), {
  root: path.join(__dirname, "../public"),
  prefix: "/public/",
  decorateReply: false,
});

// Serve static files from the static directory at root
fastify.register(import("@fastify/static"), {
  root: path.join(__dirname, "../static"),
  prefix: "/",
});

// Serve index.html at root
fastify.get("/", (req, reply) => {
  reply.sendFile("index.html");
});

// Configure multer for handling image uploads
fastify.register(multer.contentParser);
fastify.decorate(
  "upload",
  multer({ dest: path.join(__dirname, "../public/uploads") })
);

// Register fastify-cookie for handling cookies
fastify.register(fastifyCookie);

// Register CORS before routes
if (process.env.NODE_ENV !== 'production') {
  fastify.register(fastifyCors, {
    origin: true, // Allow all origins for development
    credentials: true,
  });
}

// Connect to embedded MongoDB before starting server
connectDatabase()
  .then(() => {
    // Register routes
    registerRoutes(fastify);

    // Start the server
    fastify.listen({ port: 9090 }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Server running at ${address}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
