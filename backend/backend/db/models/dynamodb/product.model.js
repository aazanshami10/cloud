// db/models/dynamodb/product.model.js
// Product model for DynamoDB database

const { v4: uuidv4 } = require("uuid");
const config = require("../../../config");
const { dynamoDb } = require("../../init");

const tableName = config.database.dynamodb.tableName;

const ProductModel = {
  /**
   * Create a new product
   * @param {Object} productData - Product data
   * @param {string} userId - ID of the user creating the product
   * @returns {Object} Created product
   */
  async create(productData, userId) {
    const productId = uuidv4();
    const now = new Date().toISOString();

    const item = {
      pk: `PRODUCT#${productId}`,
      sk: `DETAILS#${productId}`,
      id: productId,
      name: productData.name,
      description: productData.description || null,
      price: productData.price,
      imageUrl: productData.imageUrl || null,
      category: productData.category || null,
      stock: productData.stock || 0,
      isActive: true,
      userId: userId,
      createdAt: now,
      updatedAt: now,
    };

    // Create user GSI for lookup
    const userIndex = {
      pk: `USER#${userId}`,
      sk: `PRODUCT#${productId}`,
      id: productId,
    };

    // Create category GSI for lookup if category exists
    let categoryItem = null;
    if (productData.category) {
      categoryItem = {
        pk: `CATEGORY#${productData.category}`,
        sk: `PRODUCT#${productId}`,
        id: productId,
      };
    }

    const transactItems = [
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
          Item: userIndex,
          ConditionExpression:
            "attribute_not_exists(pk) AND attribute_not_exists(sk)",
        },
      },
    ];

    if (categoryItem) {
      transactItems.push({
        Put: {
          TableName: tableName,
          Item: categoryItem,
        },
      });
    }

    const params = {
      TransactItems: transactItems,
    };

    await dynamoDb.transactWrite(params).promise();
    return item;
  },

  /**
   * Find product by ID
   * @param {string} productId - Product ID
   * @returns {Object} Product or null
   */
  async findById(productId) {
    const params = {
      TableName: tableName,
      Key: {
        pk: `PRODUCT#${productId}`,
        sk: `DETAILS#${productId}`,
      },
    };

    const result = await dynamoDb.get(params).promise();

    if (!result.Item) {
      return null;
    }

    return result.Item;
  },

  /**
   * Find products by user ID
   * @param {string} userId - User ID
   * @returns {Array} Products
   */
  async findByUserId(userId) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "PRODUCT#",
      },
    };

    const result = await dynamoDb.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Get full product details
    const products = [];
    for (const item of result.Items) {
      const product = await this.findById(item.id);
      if (product) {
        products.push(product);
      }
    }

    return products;
  },

  /**
   * Find products by category
   * @param {string} category - Category name
   * @returns {Array} Products
   */
  async findByCategory(category) {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CATEGORY#${category}`,
        ":sk": "PRODUCT#",
      },
    };

    const result = await dynamoDb.query(params).promise();

    if (!result.Items || result.Items.length === 0) {
      return [];
    }

    // Get full product details
    const products = [];
    for (const item of result.Items) {
      const product = await this.findById(item.id);
      if (product) {
        products.push(product);
      }
    }

    return products;
  },

  /**
   * List all products
   * @param {number} limit - Maximum number of products to return
   * @param {string} lastEvaluatedKey - Last evaluated key for pagination
   * @returns {Object} Products and last evaluated key
   */
  async list(limit = 20, lastEvaluatedKey = null) {
    const params = {
      TableName: tableName,
      FilterExpression: "begins_with(pk, :pk) AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": "PRODUCT#",
        ":sk": "DETAILS#",
      },
      Limit: limit,
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(
        Buffer.from(lastEvaluatedKey, "base64").toString()
      );
    }

    const result = await dynamoDb.scan(params).promise();

    return {
      products: result.Items || [],
      lastEvaluatedKey: result.LastEvaluatedKey
        ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString(
            "base64"
          )
        : null,
    };
  },

  /**
   * Update product
   * @param {string} productId - Product ID
   * @param {Object} updates - Product updates
   * @param {string} userId - ID of the user updating the product
   * @returns {Object} Updated product
   */
  async update(productId, updates, userId) {
    const product = await this.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    // Check if the user owns the product
    if (product.userId !== userId) {
      throw new Error("Unauthorized to update this product");
    }

    const now = new Date().toISOString();

    // Build expression attribute names and values
    let updateExpression = "SET updatedAt = :updatedAt";
    const expressionAttributeValues = {
      ":updatedAt": now,
    };

    // Add updated fields
    for (const [key, value] of Object.entries(updates)) {
      if (
        key !== "id" &&
        key !== "userId" &&
        key !== "pk" &&
        key !== "sk" &&
        key !== "createdAt"
      ) {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    // Handle category update
    let categoryTransaction = null;
    if (updates.category && updates.category !== product.category) {
      // Remove old category association
      if (product.category) {
        categoryTransaction = {
          Delete: {
            TableName: tableName,
            Key: {
              pk: `CATEGORY#${product.category}`,
              sk: `PRODUCT#${productId}`,
            },
          },
        };
      }

      // Add new category association
      const newCategoryItem = {
        pk: `CATEGORY#${updates.category}`,
        sk: `PRODUCT#${productId}`,
        id: productId,
      };

      const newCategoryTransaction = {
        Put: {
          TableName: tableName,
          Item: newCategoryItem,
        },
      };

      if (categoryTransaction) {
        await dynamoDb
          .transactWrite({
            TransactItems: [categoryTransaction, newCategoryTransaction],
          })
          .promise();
      } else {
        await dynamoDb
          .put({
            TableName: tableName,
            Item: newCategoryItem,
          })
          .promise();
      }
    }

    const params = {
      TableName: tableName,
      Key: {
        pk: `PRODUCT#${productId}`,
        sk: `DETAILS#${productId}`,
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    };

    const result = await dynamoDb.update(params).promise();
    return result.Attributes;
  },

  /**
   * Delete product
   * @param {string} productId - Product ID
   * @param {string} userId - ID of the user deleting the product
   * @returns {boolean} Success
   */
  async delete(productId, userId) {
    const product = await this.findById(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    // Check if the user owns the product
    if (product.userId !== userId) {
      throw new Error("Unauthorized to delete this product");
    }

    const transactItems = [
      {
        Delete: {
          TableName: tableName,
          Key: {
            pk: `PRODUCT#${productId}`,
            sk: `DETAILS#${productId}`,
          },
        },
      },
      {
        Delete: {
          TableName: tableName,
          Key: {
            pk: `USER#${userId}`,
            sk: `PRODUCT#${productId}`,
          },
        },
      },
    ];

    // Delete category association if it exists
    if (product.category) {
      transactItems.push({
        Delete: {
          TableName: tableName,
          Key: {
            pk: `CATEGORY#${product.category}`,
            sk: `PRODUCT#${productId}`,
          },
        },
      });
    }

    const params = {
      TransactItems: transactItems,
    };

    await dynamoDb.transactWrite(params).promise();
    return true;
  },
};
