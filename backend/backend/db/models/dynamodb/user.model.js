// db/models/dynamodb/user.model.js
// User model for DynamoDB database

const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const config = require("../../../config");
const { dynamoDb } = require("../../init");

const tableName = config.database.dynamodb.tableName;

const UserModel = {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  async create(userData) {
    const userId = uuidv4();
    const now = new Date().toISOString();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    const item = {
      pk: `USER#${userId}`,
      sk: `PROFILE#${userId}`,
      id: userId,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImage: userData.profileImage || null,
      role: userData.role || "user",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Create email GSI for lookup
    const emailIndex = {
      pk: `EMAIL#${userData.email}`,
      sk: `USER#${userId}`,
      id: userId,
    };

    const params = {
      TransactItems: [
        {
          Put: {
            TableName: tableName,
            Item: item,
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
        {
          Put: {
            TableName: tableName,
            Item: emailIndex,
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
      ],
    };

    try {
      await dynamoDb.transactWrite(params).promise();
      // Remove password from returned user
      const { password, ...userWithoutPassword } = item;
      return userWithoutPassword;
    } catch (error) {
      if (error.code === "TransactionCanceledException") {
        throw new Error("User with this email already exists");
      }
      throw error;
    }
  },

  /**
   * Find user by ID
   * @param {string} userId - User ID
   * @returns {Object} User or null
   */
  async findById(userId) {
    const params = {
      TableName: tableName,
      Key: {
        pk: `USER#${userId}`,
        sk: `PROFILE#${userId}`,
      },
    };

    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return null;
    }

    // Remove password from returned user
    const { password, ...userWithoutPassword } = result.Item;
    return userWithoutPassword;
  },

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Object} User or null
   */
  async findByEmail(email) {
    const params = {
      TableName: tableName,
      Key: {
        pk: `EMAIL#${email}`,
        sk: { begins_with: "USER#" },
      },
    };

    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return null;
    }

    // Get full user record
    return this.findById(result.Item.id);
  },

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updates - User updates
   * @returns {Object} Updated user
   */
  async update(userId, updates) {
    const user = await this.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const now = new Date().toISOString();

    // Build expression attribute names and values
    let updateExpression = "SET updatedAt = :updatedAt";
    const expressionAttributeValues = {
      ":updatedAt": now,
    };

    // Add updated fields
    for (const [key, value] of Object.entries(updates)) {
      if (key !== "id" && key !== "email" && key !== "password") {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Handle password update separately
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(updates.password, salt);
      updateExpression += ", password = :password";
      expressionAttributeValues[":password"] = hashedPassword;
    }

    const params = {
      TableName: tableName,
      Key: {
        pk: `USER#${userId}`,
        sk: `PROFILE#${userId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDb.update(params).promise();

    // Remove password from returned user
    const { password, ...userWithoutPassword } = result.Attributes;
    return userWithoutPassword;
  },

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async delete(userId) {
    const user = await this.findById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const params = {
      TransactItems: [
        {
          Delete: {
            TableName: tableName,
            Key: {
              pk: `USER#${userId}`,
              sk: `PROFILE#${userId}`,
            },
          },
        },
        {
          Delete: {
            TableName: tableName,
            Key: {
              pk: `EMAIL#${user.email}`,
              sk: `USER#${userId}`,
            },
          },
        },
      ],
    };

    await dynamoDb.transactWrite(params).promise();
    return true;
  },

  /**
   * Validate user password
   * @param {string} email - User email
   * @param {string} password - Password to validate
   * @returns {Object} User if valid or null
   */
  async validateCredentials(email, password) {
    // Get user with password
    const params = {
      TableName: tableName,
      IndexName: "EmailIndex",
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": `EMAIL#${email}`,
      },
    };

    const result = await dynamoDb.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const userId = result.Items[0].id;

    // Get full user profile
    const userParams = {
      TableName: tableName,
      Key: {
        pk: `USER#${userId}`,
        sk: `PROFILE#${userId}`,
      },
    };

    const userResult = await dynamoDb.get(userParams).promise();

    if (!userResult.Item) {
      return null;
    }

    const user = userResult.Item;

    // Validate password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return null;
    }

    // Remove password from returned user
    const { password: hashedPassword, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  /**
   * Update last login timestamp
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  async updateLastLogin(userId) {
    const params = {
      TableName: tableName,
      Key: {
        pk: `USER#${userId}`,
        sk: `PROFILE#${userId}`,
      },
      UpdateExpression: "SET lastLogin = :lastLogin",
      ExpressionAttributeValues: {
        ":lastLogin": new Date().toISOString(),
      },
    };

    await dynamoDb.update(params).promise();
    return true;
  },
};

module.exports = UserModel;
