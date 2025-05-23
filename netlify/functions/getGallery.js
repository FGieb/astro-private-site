const axios = require("axios");
const crypto = require("crypto");

exports.handler = async function () {
const apiKey = process.env.TEST_CLOUDINARY_API_KEY;
const apiSecret = process.env.TEST_CLOUDINARY_API_SECRET;
const cloudName = process.env.TEST_CLOUDINARY_CLOUD_NAME;

  const folder = "daily-images";
  const timestamp = Math.floor(Date.now() / 1000);
  const expression = `resource_type:image OR resource_type:video AND folder=${folder}`;
  const signature = crypto
    .createHash("sha1")
    .update(`expression=${expression}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`;

  try {
    const res = await axios.post(url, {
      expression,
      timestamp,
      api_key: apiKey,
      signature
    });

    const publicIds = res.data.resources.map((file) => file.public_id);
    return {
      statusCode: 200,
      body: JSON.stringify(publicIds)
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({ error: error.response?.data || error.message })
    };
  }
};
