
const util = require('util');
const { S3Client, ListObjectsCommand } = require("@aws-sdk/client-s3");

// The following code uses the AWS SDK for JavaScript (v3).
// For more information, see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html.
const s3Client = new S3Client({});

/**
 * @param {string} bucketName
 */
const listObjectNames = async (bucketName) => {
  console.log(`Getting objects from bucket: ${bucketName}`);
  const command = new ListObjectsCommand({ Bucket: bucketName });

  try {
    const data = await s3Client.send(command);
  
      // bucket is empty
    if (!data.Contents || data.Contents.length === 0) {
      return [];
    }
  
  
    // Map the response to a list of strings representing the keys of the Amazon Simple Storage Service (Amazon S3) objects.
    // Filter out any objects that don't have keys.
    return data.Contents.map(({ Key }) => Key).filter((k) => !!k);
  } catch (error) {
    console.log(error);
    throw error;
  }
};

/**
 * @typedef {{ httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', path: string }} LambdaEvent
 */

/**
 *
 * @param {LambdaEvent} lambdaEvent
 */
const routeRequest = (lambdaEvent) => {
  if (lambdaEvent.httpMethod === "GET" && lambdaEvent.path === "/") {
    return handleGetRequest();
  }

  const error = new Error(
    `Unimplemented HTTP method: ${lambdaEvent.httpMethod}`
  );
  error.name = "UnimplementedHTTPMethodError";
  throw error;
};

const handleGetRequest = async () => {
  if (process.env.BUCKET === "undefined") {
    const err = new Error(`No bucket name provided.`);
    err.name = "MissingBucketName";
    throw err;
  }

  const objects = await listObjectNames(process.env.BUCKET);
  console.log(`Found ${objects.length} objects in bucket`);
  return buildResponseBody(200, objects);
};

/**
 * @typedef {{statusCode: number, body: string, headers: Record<string, string> }} LambdaResponse
 */

/**
 *
 * @param {number} status
 * @param {Record<string, string>} headers
 * @param {Record<string, unknown>} body
 *
 * @returns {LambdaResponse}
 */
const buildResponseBody = (status, body, headers = {
    'Content-Type': 'application/json',
  }) => {
  return {
    statusCode: status,
    headers,
    body: JSON.stringify(body),
  };
};

/**
 *
 * @param {LambdaEvent} event
 */
const handler = async (event) => {
  try {
    const result = await routeRequest(event);
    console.log(`Result: ${util.inspect(result)}`);
    return result;
  } catch (err) {
    console.log(err);

    if (err.name === "MissingBucketName") {
      return buildResponseBody(400, err.message);
    }

    if (err.name === "EmptyBucketError") {
      return buildResponseBody(204, []);
    }

    if (err.name === "UnimplementedHTTPMethodError") {
      return buildResponseBody(400, err.message);
    }

    return buildResponseBody(500, err.message || "Unknown server error");
  }
};

module.exports = { handler };