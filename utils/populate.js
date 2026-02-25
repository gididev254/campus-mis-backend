/**
 * Populate utility functions for common mongoose populate patterns
 * Helps reduce duplicate code across controllers
 */

/**
 * Common populate field configurations
 */
const POPULATE_FIELDS = {
  // User fields commonly needed
  USER_BASIC: 'name email phone location avatar',
  USER_PUBLIC: 'name email phone location averageRating totalReviews avatar',
  USER_FULL: 'name email phone location avatar averageRating totalReviews isVerified',

  // Product fields
  PRODUCT_BASIC: 'title images price',
  PRODUCT_FULL: 'title description price images condition location views likes averageRating',
  PRODUCT_WITH_CATEGORY: 'title images price condition category',

  // Category fields
  CATEGORY_BASIC: 'name slug',
  CATEGORY_FULL: 'name slug description',

  // Order fields
  ORDER_BASIC: 'orderNumber totalPrice status paymentStatus'
};

/**
 * Populate product with category and seller
 * @param {Object} query - Mongoose query object
 * @param {string} [productFields=PRODUCT_BASIC] - Fields to select from product
 * @param {string} [categoryFields=CATEGORY_BASIC] - Fields to select from category
 * @param {string} [sellerFields=USER_PUBLIC] - Fields to select from seller
 * @returns {Object} Query with populate chains
 */
const populateProduct = (
  query,
  productFields = POPULATE_FIELDS.PRODUCT_BASIC,
  categoryFields = POPULATE_FIELDS.CATEGORY_BASIC,
  sellerFields = POPULATE_FIELDS.USER_PUBLIC
) => {
  return query
    .populate('category', categoryFields)
    .populate('seller', sellerFields);
};

/**
 * Populate order with product, buyer, and seller
 * @param {Object} query - Mongoose query object
 * @param {string} [productFields=PRODUCT_BASIC] - Fields to select from product
 * @param {string} [buyerFields=USER_BASIC] - Fields to select from buyer
 * @param {string} [sellerFields=USER_BASIC] - Fields to select from seller
 * @returns {Object} Query with populate chains
 */
const populateOrder = (
  query,
  productFields = POPULATE_FIELDS.PRODUCT_BASIC,
  buyerFields = POPULATE_FIELDS.USER_BASIC,
  sellerFields = POPULATE_FIELDS.USER_BASIC
) => {
  return query
    .populate('product', productFields)
    .populate('buyer', buyerFields)
    .populate('seller', sellerFields);
};

/**
 * Populate message with sender, receiver, and product
 * @param {Object} query - Mongoose query object
 * @param {string} [senderFields=USER_BASIC] - Fields to select from sender
 * @param {string} [receiverFields=USER_BASIC] - Fields to select from receiver
 * @param {string} [productFields='title images'] - Fields to select from product
 * @returns {Object} Query with populate chains
 */
const populateMessage = (
  query,
  senderFields = 'name email avatar',
  receiverFields = 'name email avatar',
  productFields = 'title images'
) => {
  return query
    .populate('sender', senderFields)
    .populate('receiver', receiverFields)
    .populate('product', productFields);
};

/**
 * Populate notification with sender
 * @param {Object} query - Mongoose query object
 * @param {string} [senderFields='name avatar'] - Fields to select from sender
 * @returns {Object} Query with populate chains
 */
const populateNotification = (
  query,
  senderFields = 'name avatar'
) => {
  return query.populate('sender', senderFields);
};

/**
 * Populate review with reviewer, reviewedUser, product, and order
 * @param {Object} query - Mongoose query object
 * @param {string} [reviewerFields='name avatar'] - Fields to select from reviewer
 * @param {string} [reviewedUserFields='name avatar averageRating'] - Fields to select from reviewed user
 * @param {string} [productFields='title images'] - Fields to select from product
 * @param {string} [orderFields='orderNumber totalPrice'] - Fields to select from order
 * @returns {Object} Query with populate chains
 */
const populateReview = (
  query,
  reviewerFields = 'name avatar',
  reviewedUserFields = 'name avatar averageRating',
  productFields = 'title images',
  orderFields = 'orderNumber totalPrice'
) => {
  return query
    .populate('reviewer', reviewerFields)
    .populate('reviewedUser', reviewedUserFields)
    .populate('product', productFields)
    .populate('order', orderFields);
};

/**
 * Helper to create a populated query for a single document
 * @param {Model} Model - Mongoose model
 * @param {string} id - Document ID
 * @param {Function} populateFn - Populate function to use
 * @returns {Promise<Object>} Populated document
 */
const findAndPopulate = async (Model, id, populateFn) => {
  let query = Model.findById(id);
  query = populateFn(query);
  return await query;
};

/**
 * Helper to create a populated query for multiple documents
 * @param {Model} Model - Mongoose model
 * @param {Object} filter - Query filter
 * @param {Function} populateFn - Populate function to use
 * @param {Object} options - Query options (sort, skip, limit, lean)
 * @returns {Promise<Array>} Array of populated documents
 */
const findManyAndPopulate = async (Model, filter, populateFn, options = {}) => {
  let query = Model.find(filter);

  if (options.sort) query = query.sort(options.sort);
  if (options.skip) query = query.skip(options.skip);
  if (options.limit) query = query.limit(options.limit);
  if (options.lean) query = query.lean();

  query = populateFn(query);
  return await query;
};

module.exports = {
  POPULATE_FIELDS,
  populateProduct,
  populateOrder,
  populateMessage,
  populateNotification,
  populateReview,
  findAndPopulate,
  findManyAndPopulate
};
