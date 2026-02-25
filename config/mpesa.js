const mpesaConfig = {
  baseURL: process.env.MPESA_BASE_URL,
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  environment: process.env.MPESA_ENV, // 'sandbox' or 'production'
  passkey: process.env.MPESA_PASSKEY,
  shortcode: process.env.MPESA_SHORTCODE,
};

module.exports = mpesaConfig;
