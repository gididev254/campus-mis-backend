# JSDoc Quick Reference - Campus Market Backend

Quick reference for commonly used JSDoc patterns in the Campus Market backend.

## Controller Function Template

```javascript
/**
 * @desc    Brief description of what the function does
 * @route   METHOD /api/path
 * @access  Public|Private|Private (Admin|Seller|Buyer)
 * @param   {Type} req.param.name - Description
 * @param   {Object} req.body - Request body
 * @param   {Type} [req.body.optionalField] - Description (optional)
 * @returns {Promise<Object>} Response description
 * @throws  {ErrorCode} Error condition description
 */
exports.functionName = async (req, res, next) => {
  // Implementation
};
```

## Model Schema Template

```javascript
/**
 * @fileoverview Brief description of the model
 * @description More detailed description of the model's purpose
 * @module models/ModelName
 */

const mongoose = require('mongoose');

/**
 * ModelName Schema
 * @typedef {Object} ModelName
 * @property {Type} fieldName - Field description (validation rules)
 * @property {Type} requiredField - Required field (required)
 * @property {Type} [optionalField] - Optional field
 */
const modelNameSchema = new mongoose.Schema({
  // Schema definition
});

/**
 * Method description
 * @method
 * @memberof ModelName
 * @param {Type} paramName - Description
 * @returns {Promise<Type>} Description
 */
modelNameSchema.methods.methodName = function(paramName) {
  // Implementation
};

module.exports = mongoose.model('ModelName', modelNameSchema);
```

## Utility Function Template

```javascript
/**
 * @fileoverview Brief description of the utility module
 * @description Detailed description of the module's purpose
 * @module utils/filename
 */

/**
 * Function description
 * @function
 * @param {Type} paramName - Description
 * @param {Type} [optionalParam=default] - Description with default
 * @returns {Type} Description of return value
 * @throws {Error} When and why error is thrown
 */
exports.functionName = (paramName, optionalParam = default) => {
  // Implementation
};
```

## Common Tags Reference

### Documentation Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `@desc` | Function description | `@desc    Get all users` |
| `@route` | API endpoint | `@route   GET /api/users` |
| `@access` | Access level | `@access  Private (Admin)` |
| `@param` | Parameter | `@param   {string} name - User name` |
| `@returns` | Return value | `@returns {Promise<Object>} Response data` |
| `@throws` | Errors thrown | `@throws  {404} If user not found` |

### Type Tags

| Tag | Type | Example |
|-----|------|---------|
| `{string}` | String | `{string}` |
| `{number}` | Number | `{number}` |
| `{boolean}` | Boolean | `{boolean}` |
| `{Object}` | Object | `{Object}` |
| `{Array}` | Array | `{Array}` |
| `{Date}` | Date | `{Date}` |
| `{Function}` | Function | `{Function}` |
| `{Promise<Type>}` | Promise | `{Promise<User>}` |
| `{mongoose.Types.ObjectId}` | MongoDB ID | `{mongoose.Types.ObjectId}` |

### Modifier Tags

| Tag | Purpose | Example |
|-----|---------|---------|
| `[param]` | Optional | `{string} [name]` |
| `default` | Default value | `[page=1]` |
| `...param` | Rest parameter | `{...string} tags` |

### Special Tags

| Tag | Purpose | Usage |
|-----|---------|-------|
| `@fileoverview` | File description | Top of file |
| `@module` | Module name | Top of file |
| `@typedef` | Type definition | For schemas |
| `@property` | Object property | In typedef |
| `@enum` | Enum values | In typedef |
| `@async` | Async function | Before function |
| `@function` | Function declaration | Before function |
| `@method` | Class method | Before method |
| `@static` | Static method | Before static method |
| `@class` | Class definition | Before class |
| `@memberof` | Class membership | For methods |

## Access Control Levels

- `Public` - No authentication required
- `Private` - Authentication required
- `Private (Admin)` - Admin only
- `Private (Seller)` - Seller only
- `Private (Buyer)` - Buyer only
- `Private (Seller or Admin)` - Seller or Admin
- `Private (Review owner or Admin)` - Owner or Admin

## Common Parameter Patterns

### Request Body
```javascript
/**
 * @param   {Object} req.body - Request body
 * @param   {string} req.body.email - User email
 * @param   {string} req.body.password - User password
 */
```

### Query Parameters
```javascript
/**
 * @param   {Object} req.query - Query parameters
 * @param   {number} [req.query.page=1] - Page number
 * @param   {number} [req.query.limit=10] - Items per page
 * @param   {string} [req.query.search] - Search term
 */
```

### Route Parameters
```javascript
/**
 * @param   {string} req.params.id - Resource ID
 */
```

### Multiple Access Levels
```javascript
/**
 * @access  Private (Admin or Seller)
 */
```

## Return Value Patterns

### Success Response
```javascript
/**
 * @returns {Promise<Object>} Response with success status and data
 * // Returns: { success: true, data: {...} }
 */
```

### Paginated Response
```javascript
/**
 * @returns {Promise<Object>} Paginated response
 * // Returns: { data: [...], pagination: {...} }
 */
```

### Array Response
```javascript
/**
 * @returns {Promise<Array<Object>>} Array of items
 */
```

### Primitive Response
```javascript
/**
 * @returns {Promise<string>} Formatted string
 */
```

## Error Documentation

### Single Error
```javascript
/**
 * @throws  {404} If resource not found
 */
```

### Multiple Errors
```javascript
/**
 * @throws  {400} If validation fails
 * @throws  {401} If not authenticated
 * @throws  {403} If not authorized
 * @throws  {404} If not found
 */
```

### Custom Error
```javascript
/**
 * @throws  {ErrorResponse} With message and status code
 */
```

## Model Documentation Patterns

### Schema Fields
```javascript
/**
 * @property {string} name - Field name (required, max 50 chars)
 * @property {number} count - Count (default: 0, min: 0)
 * @property {boolean} isActive - Active status (default: true)
 * @property {Date} createdAt - Timestamp
 */
```

### Reference Fields
```javascript
/**
 * @property {mongoose.Types.ObjectId} user - Reference to User (required)
 * @property {mongoose.Types.ObjectId[]} products - Array of Product references
 */
```

### Enum Fields
```javascript
/**
 * @property {'active'|'inactive'|'pending'} status - Status (default: 'pending')
 */
```

### Array Fields
```javascript
/**
 * @property {string[]} tags - Array of tag strings
 * @property {Object[]} items - Array of item objects
 */
```

## Method Documentation

### Instance Method
```javascript
/**
 * Method description
 * @method
 * @memberof ModelName
 * @param {Type} paramName - Description
 * @returns {Promise<Type>} Description
 */
modelNameSchema.methods.methodName = function(paramName) {
  // Implementation
};
```

### Static Method
```javascript
/**
 * Static method description
 * @static
 * @method
 * @memberof ModelName
 * @param {Type} paramName - Description
 * @returns {Promise<Type>} Description
 */
modelNameSchema.statics.methodName = async function(paramName) {
  // Implementation
};
```

### Middleware
```javascript
/**
 * Pre-save middleware description
 * @async
 * @function
 * @memberof ModelName
 * @param {Function} next - Express next middleware function
 */
modelNameSchema.pre('save', async function(next) {
  // Implementation
});
```

## Index Documentation

```javascript
/**
 * Compound index: Field1 and Field2 with sorting
 * Used in specific query context
 */
schema.index({ field1: 1, field2: -1 });
```

## Quick Examples

### Simple Controller Function
```javascript
/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 * @param   {string} req.params.id - User ID
 * @returns {Promise<Object>} User object
 */
exports.getUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  res.json({ success: true, user });
};
```

### Simple Utility Function
```javascript
/**
 * Format price as currency
 * @function
 * @param {number} price - Price to format
 * @returns {string} Formatted price string
 */
exports.formatPrice = (price) => {
  return `KES ${price.toLocaleString()}`;
};
```

### Model with Method
```javascript
/**
 * @fileoverview User model
 * @module models/User
 */

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true }
});

/**
 * Compare password
 * @method
 * @memberof User
 * @param {string} candidatePassword - Password to check
 * @returns {Promise<boolean>} True if match
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

## Tips

1. **Be Consistent**: Follow the same format across all files
2. **Be Clear**: Describe what, not just how
3. **Be Complete**: Document all parameters and returns
4. **Be Specific**: Use exact types, not generic ones
5. **Document Errors**: Always document what can go wrong
6. **Update Regularly**: Keep docs in sync with code
7. **Use Defaults**: Document default parameter values
8. **Access Control**: Always specify @access for controllers
9. **Route Info**: Always include @route for API endpoints
10. **File Overview**: Start every file with @fileoverview

## IDE Integration

Most modern IDEs (VS Code, WebStorm, etc.) will show JSDoc information:
- On hover over functions
- In autocomplete suggestions
- In parameter hints
- In go-to-definition previews

Enable JSDoc typing in `jsconfig.json`:
```json
{
  "compilerOptions": {
    "checkJs": true
  }
}
```

## Resources

- [JSDoc Official Documentation](https://jsdoc.app/)
- [JSDoc Tag Reference](https://jsdoc.app/#tag-reference)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

---

Quick Reference v1.0 - Campus Market Backend
Generated: 2025-02-25
