// MongoDB collections
export function getUserCollection(db) {
  return db.collection("users");
}
export function getImageCollection(db) {
  return db.collection("images");
}
export function getItemCollection(db) {
  return db.collection("items");
}
