# AWS CRUD Application

A Node.js application that implements user authentication, CRUD operations, and AWS services integration.

## Features

- **User Authentication**: Secure user registration and login with JWT
- **CRUD Operations**: Complete create, read, update, delete functionality for products
- **Database Support**: Supports both Amazon RDS (PostgreSQL/MySQL) and Amazon DynamoDB
- **File Upload**: AWS S3 integration for file and image uploads
- **Security**: Input validation, error handling, and security best practices

## Tech Stack

- Node.js & Express.js
- AWS SDK (S3, RDS, DynamoDB)
- Sequelize ORM (for RDS option)
- JSON Web Tokens (JWT) for authentication
- bcrypt for password hashing

## Prerequisites

- Node.js (v14+)
- AWS Account with appropriate permissions
- S3 bucket
- RDS instance (PostgreSQL/MySQL) or DynamoDB table

## Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```
# Server Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=1d

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key

# Database Type (rds or dynamodb)
DB_TYPE=rds

# RDS Configuration (if DB_TYPE=rds)
RDS_HOST=your-rds-host
RDS_PORT=5432
RDS_DATABASE=your-database-name
RDS_USERNAME=your-database-username
RDS_PASSWORD=your-database-password
RDS_DIALECT=postgres  # or mysql

# DynamoDB Configuration (if DB_TYPE=dynamodb)
DYNAMODB_TABLE_NAME=app-data

# S3 Configuration
S3_BUCKET_NAME=your-s3-bucket-name
S3_ACL=public-read
S3_SIGNED_URL_EXPIRATION=3600
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up the environment variables as described above
4. Start the application:
   ```
   npm start
   ```
   or for development:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:productId` - Get product by ID
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products` - Create a new product (protected)
- `PUT /api/products/:productId` - Update a product (protected)
- `DELETE /api/products/:productId` - Delete a product (protected)
- `GET /api/products/user/me` - Get user's products (protected)

### File Upload

- `POST /api/upload/sign-url` - Get a pre-signed URL for S3 upload (protected)
- `DELETE /api/upload/:fileName` - Delete a file from S3 (protected)
- `GET /api/upload/list/:folder?` - List files in a folder (protected)

## Database Configuration

The application supports both RDS and DynamoDB. Set the `DB_TYPE` environment variable to choose between them.

### RDS (PostgreSQL/MySQL)

Configure the RDS environment variables and ensure your RDS instance is accessible.

### DynamoDB

Configure the DynamoDB environment variables. The application will create the necessary table if it doesn't exist.

## Folder Structure

```
├── app.js                  # Application entry point
├── config.js               # Configuration file
├── controllers/            # Route controllers
│   ├── auth.controller.js
│   ├── product.controller.js
│   └── upload.controller.js
├── db/                     # Database models and initialization
│   ├── init.js
│   └── models/
│       ├── dynamodb/
│       │   ├── product.model.js
│       │   └── user.model.js
│       └── rds/
│           ├── product.model.js
│           └── user.model.js
├── middleware/             # Express middlewares
│   └── auth.middleware.js
├── routes/                 # Route definitions
│   ├── auth.routes.js
│   ├── product.routes.js
│   └── upload.routes.js
└── utils/                  # Utility functions
    ├── errorHandler.js
    ├── logger.js
    └── validators.js
```

## Security

- JWT is used for authentication
- Passwords are hashed with bcrypt
- Input validation is performed for all requests
- Error handling is implemented to prevent information leakage
- CORS and Helmet middleware are used to enhance security

## License

MIT
