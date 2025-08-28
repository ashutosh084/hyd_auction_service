import bcrypt from "bcrypt";
import crypto from "crypto";
import { getImageCollection, getItemCollection, getUserCollection } from "./models.js";
import { getDb } from "./db.js";
import { create } from "domain";
import { ObjectId } from "mongodb";

const sessionStore = {}; // In-memory session storage

export async function registerRoutes(fastify) {
  // List items available for auction
  fastify.get("/items", async (request, reply) => {
    try {
      const db = getDb();
      const items = await getItemCollection(db).find({}).toArray();
      const images = await getImageCollection(db).find({}).toArray();
      const response = items.map((item) => ({
        id: item._id,
        name: item.name,
        price: item.price,
        images: (item.imageIds || []).map(
          (id) => `/${images.find((img) => img._id.toString() === id)?.imagePath}`
        ),
        isAuthoredByCurrentUser: request.user && item.addedBy?.toString() === request.user.userId?.toString(),
      }));
      reply.send(response);
    } catch (err) {
      reply.status(500).send({ error: "Failed to fetch items" });
      console.error(err);
    }
  });

  // Add an item by a user
  fastify.post(
    "/items",
    { preHandler: fastify.upload.array("images") },
    async (request, reply) => {
      try {
        const db = getDb();
        const { name, price } = request.body;
        const images = request.files.map((file) => file.filename);
        const imageDocs = await getImageCollection(db).insertMany(
          images.map((imagePath) => ({ imagePath }))
        );
        const imageIds = Object.values(imageDocs.insertedIds).map((id) => id.toString());
        await getItemCollection(db).insertOne({
          name,
          price,
          addedBy: request.user.userId,
          imageIds,
        });
        reply.status(201).send({ message: "Item added successfully" });
      } catch (err) {
        reply.status(500).send({ error: "Failed to add item" });
        console.error(err);
      }
    }
  );

  fastify.delete(
    "/items/:id",
    async (request, reply) => {
      try {

        const db = getDb();
        const itemId = request.params.id;

        // Find the item to ensure it exists and check ownership
        const item = await getItemCollection(db).findOne({ _id: new ObjectId(itemId) });
        if (!item) {
          reply.status(404).send({ error: "Item not found" });
          return;
        }
        if (item.addedBy?.toString() !== request.user.userId?.toString()) {
          reply.status(403).send({ error: "You do not have permission to delete this item" });
          return;
        }

        // Delete associated images
        if (item.imageIds && item.imageIds.length > 0) {
          const imageObjectIds = item.imageIds.map((id) => new ObjectId(id));
          await getImageCollection(db).deleteMany({ _id: { $in: imageObjectIds } });
        }

        // Delete the item
        await getItemCollection(db).deleteOne({ _id: new ObjectId(itemId) });

        reply.send({ message: "Item deleted successfully" });
      } catch (err) {
        reply.status(500).send({ error: "Failed to delete item" });
        console.error(err);
      }
    });

  // Middleware to validate sessionId and attach user context
  fastify.addHook("preHandler", async (request, reply) => {
    const url = request.routerPath || request.raw.url || "";
    if (
      url === "/signup" ||
      url === "/login" ||
      url.startsWith("/public/") ||
      url === "/" ||
      url === "/*"
    ) {
      return; // Skip validation for signup, login, public, static, and root endpoints
    }

    const sessionId = request.cookies?.sessionId;
    if (!sessionId || !sessionStore[sessionId]) {
      reply.status(400).send({ error: "Invalid session" });
      return;
    }
    request.user = sessionStore[sessionId];
  });

  // User signup endpoint
  fastify.post(
    "/signup",
    { preHandler: fastify.upload.none() },
    async (request, reply) => {
      try {
        const db = getDb();
        const users = getUserCollection(db);
        const { username, email, password: encodedPassword } = request.body;
        const password = Buffer.from(encodedPassword, "base64").toString("utf-8");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check for existing user
        const existingUser = await users.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
          reply.status(400).send({ error: "User already exists" });
          return;
        }

        const result = await users.insertOne({ username, email, password: hashedPassword });
        reply.status(201).send({ message: "User created successfully", userId: result.insertedId });
      } catch (err) {
        reply.status(500).send({ error: "Failed to create user" });
        console.error(err);
      }
    }
  );

  // User login endpoint
  fastify.post(
    "/login",
    { preHandler: fastify.upload.none() },
    async (request, reply) => {
      try {
        const db = getDb();
        const users = getUserCollection(db);
        const { username, password: encodedPassword } = request.body;
        const password = Buffer.from(encodedPassword, "base64").toString("utf-8");

        const user = await users.findOne({ username });
        if (!user || !(await bcrypt.compare(password, user.password))) {
          reply.status(400).send({ error: "Invalid username or password" });
          return;
        }

        // Check if the user already has an active session
        const existingSessionId = Object.keys(sessionStore).find(
          (key) => sessionStore[key].userId?.toString() === user._id.toString()
        );

        if (existingSessionId) {
          reply
            .setCookie("sessionId", existingSessionId, { httpOnly: true })
            .send({ message: "Login successful", sessionId: existingSessionId });
          return;
        }

        const sessionId = crypto.randomUUID();
        sessionStore[sessionId] = { ...user, userId: user._id, createdAt: Date.now() };

        reply
          .setCookie("sessionId", sessionId, { httpOnly: true })
          .send({ message: "Login successful" });
      } catch (err) {
        reply.status(500).send({ error: "Failed to login" });
        console.error(err);
      }
    }
  );

  // User logout endpoint
  fastify.post("/logout", async (request, reply) => {
    try {
      const sessionId = request.cookies?.sessionId;
      if (sessionId && sessionStore[sessionId]) {
        delete sessionStore[sessionId];
      }
      reply.clearCookie("sessionId").send({ message: "Logged out successfully" });
    } catch (err) {
      reply.status(500).send({ error: "Failed to logout" });
      console.error(err);
    }
  });

  // Timely cleanup of expired sessions (e.g., older than 1 hour)
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of Object.entries(sessionStore)) {
      if (now - session.createdAt > 3600000) {
        delete sessionStore[sessionId];
      }
    }
  }, 600000); // Run every 10 minutes
}

