// controllers/upload.controller.js
// File upload controller for S3 bucket

const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const config = require("../config");

// Configure AWS S3
const s3 = new AWS.S3({
  region: config.aws.region,
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
});

/**
 * Generate a pre-signed S3 URL for direct upload
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getSignedUploadUrl = async (req, res, next) => {
  try {
    const { fileType, fileName, folder = "general" } = req.body;

    if (!fileType || !fileName) {
      return res
        .status(400)
        .json({ message: "File type and name are required" });
    }

    // Validate file type
    const allowedFileTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedFileTypes.includes(fileType)) {
      return res.status(400).json({ message: "File type not allowed" });
    }

    // Create unique file name to prevent overwriting
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Set parameters for S3 upload
    const params = {
      Bucket: config.s3.bucket,
      Key: uniqueFileName,
      ContentType: fileType,
      Expires: config.s3.signedUrlExpiration,
      ACL: config.s3.acl,
    };

    // Generate signed URL
    const signedUrl = s3.getSignedUrl("putObject", params);

    // Calculate the URL where the file will be accessible after upload
    const fileUrl = `https://${config.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${uniqueFileName}`;

    res.json({
      signedUrl,
      fileUrl,
      fileName: uniqueFileName,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a file from S3
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const { fileName } = req.params;

    if (!fileName) {
      return res.status(400).json({ message: "File name is required" });
    }

    // Set parameters for S3 delete
    const params = {
      Bucket: config.s3.bucket,
      Key: fileName,
    };

    // Delete file from S3
    await s3.deleteObject(params).promise();

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * List all files in a folder
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.listFiles = async (req, res, next) => {
  try {
    const { folder = "general" } = req.params;

    // Set parameters for S3 list
    const params = {
      Bucket: config.s3.bucket,
      Prefix: folder + "/",
    };

    // List objects in S3 bucket
    const result = await s3.listObjectsV2(params).promise();

    // Format response
    const files = result.Contents.map((item) => {
      return {
        key: item.Key,
        lastModified: item.LastModified,
        size: item.Size,
        url: `https://${config.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${item.Key}`,
      };
    });

    res.json({ files });
  } catch (error) {
    next(error);
  }
};
