const axios = require("axios");
const crypto = require("crypto");

exports.handler = async function () {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

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
      signature,
    });

    const publicIds = res.data.resources.map((file) => file.public_id.split("/").pop());

    return {
      statusCode: 200,
      body: JSON.stringify(publicIds),
    };
  } catch (err) {
    return {
      statusCode: err.response?.status || 500,
      body: JSON.stringify({ error: err.response?.data || err.message }),
    };
  }
};
