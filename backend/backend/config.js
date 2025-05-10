// config.js
// AWS Configuration and environment variables

require("dotenv").config();

module.exports = {
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  // Database Configuration - Supports both RDS and DynamoDB
  database: {
    type: process.env.DB_TYPE || "rds", // 'rds' or 'dynamodb'

    // RDS Configuration
    rds: {
      host: process.env.RDS_HOST,
      port: process.env.RDS_PORT || 5432,
      database: process.env.RDS_DATABASE,
      username: process.env.RDS_USERNAME,
      password: process.env.RDS_PASSWORD,
      dialect: process.env.RDS_DIALECT || "postgres", // 'postgres' or 'mysql'
    },

    // DynamoDB Configuration
    dynamodb: {
      tableName: process.env.DYNAMODB_TABLE_NAME || "app-data",
    },
  },

  // S3 Configuration
  s3: {
    bucket: process.env.S3_BUCKET_NAME,
    acl: process.env.S3_ACL || "public-read",
    signedUrlExpiration: parseInt(
      process.env.S3_SIGNED_URL_EXPIRATION || "3600"
    ),
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || "your-jwt-secret-key",
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  },
};
