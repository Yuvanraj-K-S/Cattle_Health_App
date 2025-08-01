const nodemailer = require('nodemailer');
const pug = require('pug');
const { htmlToText } = require('html-to-text');

// For development - logs emails to console instead of sending
const devTransport = {
  host: 'smtp.ethereal.email',
  port: 587,
  auth: {
    user: process.env.ETHEREAL_EMAIL,
    pass: process.env.ETHEREAL_PASSWORD
  }
};

// For production - uses real SMTP
const prodTransport = {
  service: 'SendGrid',
  auth: {
    user: process.env.SENDGRID_USERNAME,
    pass: process.env.SENDGRID_PASSWORD
  }
};

// Create email transporter based on environment
const transporter = nodemailer.createTransport(
  process.env.NODE_ENV === 'production' ? prodTransport : devTransport
);

// Email template path
const emailTemplates = {
  welcome: 'welcome',
  passwordReset: 'passwordReset',
  emailConfirmation: 'emailConfirmation',
  healthAlert: 'healthAlert'
};

/**
 * Send an email using a template
 * @param {Object} options - Email options
 * @param {string} options.email - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.template - Template name (from emailTemplates)
 * @param {Object} options.templateVars - Variables to pass to the template
 * @param {string} [options.message] - Plain text message (alternative to template)
 * @returns {Promise} - Result of the email sending operation
 */
const sendEmail = async ({
  email,
  subject,
  template,
  templateVars = {},
  message
}) => {
  try {
    let html, text;
    
    // If using a template
    if (template) {
      // In a real app, you would load the template from the filesystem
      // For now, we'll use a simple switch statement
      switch (template) {
        case emailTemplates.welcome:
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Welcome to Cattle Health Monitor!</h2>
              <p>Hello ${templateVars.firstName || 'there'},</p>
              <p>Thank you for registering with Cattle Health Monitor. Your account has been successfully created.</p>
              <p>You can now log in to your account and start managing your cattle health data.</p>
              <p>If you have any questions, feel free to contact our support team.</p>
              <br>
              <p>Best regards,<br>The Cattle Health Monitor Team</p>
            </div>
          `;
          break;
          
        case emailTemplates.passwordReset:
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>Hello ${templateVars.firstName || 'there'},</p>
              <p>You are receiving this email because you (or someone else) has requested a password reset for your account.</p>
              <p>Please click the button below to reset your password:</p>
              <p style="margin: 30px 0;">
                <a href="${templateVars.resetUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
                  Reset Password
                </a>
              </p>
              <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
              <br>
              <p>Best regards,<br>The Cattle Health Monitor Team</p>
            </div>
          `;
          break;
          
        case emailTemplates.emailConfirmation:
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Confirmation</h2>
              <p>Hello ${templateVars.firstName || 'there'},</p>
              <p>Thank you for registering with Cattle Health Monitor. Please confirm your email address by clicking the button below:</p>
              <p style="margin: 30px 0;">
                <a href="${templateVars.confirmUrl}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 4px;">
                  Confirm Email
                </a>
              </p>
              <p>If you did not create an account, no further action is required.</p>
              <br>
              <p>Best regards,<br>The Cattle Health Monitor Team</p>
            </div>
          `;
          break;
          
        case emailTemplates.healthAlert:
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Health Alert for ${templateVars.cattleName || 'Your Cattle'}</h2>
              <p>Hello ${templateVars.userName || 'there'},</p>
              <p>We've detected an abnormal health reading for ${templateVars.cattleName || 'your cattle'}.</p>
              
              <h3>Alert Details:</h3>
              <ul>
                <li><strong>Animal ID:</strong> ${templateVars.cattleId || 'N/A'}</li>
                <li><strong>Alert Type:</strong> ${templateVars.alertType || 'Health Warning'}</li>
                <li><strong>Reading:</strong> ${templateVars.reading || 'N/A'}</li>
                <li><strong>Time Detected:</strong> ${new Date().toLocaleString()}</li>
              </ul>
              
              <p><strong>Recommended Action:</strong> ${templateVars.recommendation || 'Please check on the animal as soon as possible.'}</p>
              
              <p>You can view more details by logging into your Cattle Health Monitor dashboard.</p>
              
              <p>Best regards,<br>The Cattle Health Monitor Team</p>
            </div>
          `;
          break;
          
        default:
          throw new Error(`Unknown email template: ${template}`);
      }
      
      // Convert HTML to plain text
      text = htmlToText(html);
    } else if (message) {
      // If using plain message
      text = message;
      html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; white-space: pre-line;">${message.replace(/\n/g, '<br>')}</div>`;
    } else {
      throw new Error('Either template or message is required');
    }

    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Cattle Health Monitor <noreply@cattlehealth.com>',
      to: email,
      subject: subject || 'Notification from Cattle Health Monitor',
      text,
      html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // In development, log the preview URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Export the email templates and send function
module.exports = {
  sendEmail,
  emailTemplates
};
