import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mongoServer;
let client;
let db;

export async function connectDatabase() {

  // create the .mongo-data directory if it doesn't exist
  const mongoDataDir = path.join(__dirname, "../.mongo-data");
  if (!fs.existsSync(mongoDataDir)) {
    fs.mkdirSync(mongoDataDir);
  }

  mongoServer = await MongoMemoryServer.create({
    instance: { dbPath: "./.mongo-data", storageEngine: "wiredTiger" }
  });
  const uri = mongoServer.getUri();
  client = new MongoClient(uri);
  await client.connect();
  db = client.db("hydauction");
  return db;
}

export function getDb() {
  return db;
}

export async function closeDatabase() {
  if (client) await client.close();
  if (mongoServer) await mongoServer.stop();
}
