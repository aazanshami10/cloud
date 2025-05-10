// db/init.js
// Database initialization and connection management

const config = require("../config");
const { Sequelize } = require("sequelize");
const AWS = require("aws-sdk");

// Configure AWS
AWS.config.update({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

let sequelize = null;
let dynamoDb = null;

const initializeDatabase = async () => {
  try {
    if (config.database.type === "rds") {
      console.log("Initializing RDS connection...");

      // Initialize Sequelize for RDS
      sequelize = new Sequelize({
        host: config.database.rds.host,
        port: config.database.rds.port,
        database: config.database.rds.database,
        username: config.database.rds.username,
        password: config.database.rds.password,
        dialect: config.database.rds.dialect,
        logging: process.env.NODE_ENV === "development" ? console.log : false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
      });

      // Authenticate connection
      await sequelize.authenticate();
      console.log("RDS connection has been established successfully.");

      // Sync models
      await sequelize.sync();
      console.log("Database synchronized successfully.");

      // Export models
      module.exports.User = require("./models/rds/user.model")(sequelize);
      module.exports.Product = require("./models/rds/product.model")(sequelize);
    } else if (config.database.type === "dynamodb") {
      console.log("Initializing DynamoDB connection...");

      // Initialize DynamoDB
      dynamoDb = new AWS.DynamoDB.DocumentClient();

      // Check if table exists, otherwise create it
      const dynamoDB = new AWS.DynamoDB();
      const tables = await dynamoDB.listTables().promise();

      if (!tables.TableNames.includes(config.database.dynamodb.tableName)) {
        console.log(
          `Creating DynamoDB table: ${config.database.dynamodb.tableName}`
        );

        const params = {
          TableName: config.database.dynamodb.tableName,
          KeySchema: [
            { AttributeName: "pk", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" },
          ],
          AttributeDefinitions: [
            { AttributeName: "pk", AttributeType: "S" },
            { AttributeName: "sk", AttributeType: "S" },
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
        };

        await dynamoDB.createTable(params).promise();
        console.log("DynamoDB table created successfully.");
      } else {
        console.log("DynamoDB table already exists.");
      }

      module.exports.dynamoDb = dynamoDb;
    } else {
      throw new Error("Invalid database type specified in configuration.");
    }

    console.log("Database initialization completed.");
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
};

module.exports = initializeDatabase;
module.exports.sequelize = sequelize;
module.exports.dynamoDb = dynamoDb;
