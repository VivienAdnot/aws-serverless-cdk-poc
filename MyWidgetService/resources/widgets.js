
const util = require('util');
const { 
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand
} = require("@aws-sdk/client-s3");

// The following code uses the AWS SDK for JavaScript (v3).
// For more information, see https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html.
const S3 = new S3Client({});
const bucketName = process.env.BUCKET;
/**
 *
 * @param {LambdaEvent} event
 */
const handler = async (event) => {
  try {
    const method = event.httpMethod;
    // Get name, if present
    const widgetName = event.path.startsWith('/') ? event.path.substring(1) : event.path;

    if (method === "GET") {
      // GET / to get the names of all widgets
      if (event.path === "/") {
        const data = await S3.send(new ListObjectsV2Command({ Bucket: bucketName }));
        const body = {
          widgets: data.Contents.map(function(e) { return e.Key })
        };
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        };
      }

      if (widgetName) {
        // GET /name to get info on widget name
        const headObjectResponse = await S3.send(new HeadObjectCommand({ Bucket: bucketName, Key: widgetName}));
        const {
          ContentLength,
          ContentType,
          ETag,
          LastModified,
          StorageClass,
          ServerSideEncryption,
          VersionId,
          Metadata, // Custom metadata headers
        } = headObjectResponse;

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ContentLength,
            ContentType,
            ETag,
            LastModified,
            StorageClass,
            ServerSideEncryption,
            VersionId,
            Metadata,
          }),
        };
      }
    }

    if (method === "POST") {
      // POST /name
      // Return error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
          },
          body: "Widget name missing"
        };
      }

      // Create some dummy data to populate object
      const now = new Date();
      const data = widgetName + " created: " + now;

      const base64data = Buffer.from(data, 'binary');

      await S3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: widgetName,
        Body: base64data,
        ContentType: 'application/json'
      }));

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: data
      };
    }

    if (method === "DELETE") {
      // DELETE /name
      // Return an error if we do not have a name
      if (!widgetName) {
        return {
          statusCode: 400,
          headers: {},
          body: "Widget name missing"
        };
      }

      await S3.send(new DeleteObjectCommand({
        Bucket: bucketName, Key: widgetName
      }));

      return {
        statusCode: 200,
        headers: {},
        body: "Successfully deleted widget " + widgetName
      };
    }

    // We got something besides a GET, POST, or DELETE
    return {
      statusCode: 400,
      headers: {},
      body: "We only accept GET, POST, and DELETE, not " + method
    };
  } catch(error) {
    var body = error.stack || JSON.stringify(error, null, 2);
    return {
      statusCode: 400,
      headers: {},
      body: body
    }
  }
};

module.exports = { handler };