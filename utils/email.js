// Simple email utility (can be extended with actual email service)
// For now, this is a placeholder that logs emails

exports.sendEmail = async (options) => {
  // Placeholder for email functionality
  // In production, integrate with services like SendGrid, Mailgun, or AWS SES

  console.log('📧 Email would be sent:', {
    to: options.to,
    subject: options.subject,
    text: options.text
  });

  return {
    success: true,
    message: 'Email logged (configure actual email service in production)'
  };
};

// Send welcome email
exports.sendWelcomeEmail = async (email, name) => {
  return this.sendEmail({
    to: email,
    subject: 'Welcome to Campus Market!',
    text: `Hi ${name},\n\nWelcome to Campus Market! We're excited to have you.\n\nStart buying and selling products on campus today!\n\nBest regards,\nThe Campus Market Team`
  });
};

// Send order confirmation email
exports.sendOrderConfirmationEmail = async (email, orderNumber, productName) => {
  return this.sendEmail({
    to: email,
    subject: `Order Confirmed - ${orderNumber}`,
    text: `Your order for "${productName}" has been confirmed.\n\nOrder Number: ${orderNumber}\n\nThank you for shopping with Campus Market!`
  });
};

// Send password reset email
exports.sendPasswordResetEmail = async (email, resetURL) => {
  return this.sendEmail({
    to: email,
    subject: 'Password Reset Request',
    text: `You requested a password reset. Click the link below to reset your password:\n\n${resetURL}\n\nIf you didn't request this, please ignore this email.\n\nThis link expires in 10 minutes.`
  });
};

module.exports = exports;
