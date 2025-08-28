import { Sequelize } from "sequelize";

const sequelize = new Sequelize("testdb", "dbuser", "dbpassword", {
  host: "localhost",
  dialect: "mysql",
});

export default sequelize;
