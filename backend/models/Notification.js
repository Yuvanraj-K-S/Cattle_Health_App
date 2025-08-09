const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient of the notification
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  
  // Farm context (if applicable)
  farm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farm'
  },
  
  // Cattle context (if applicable)
  cattle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cattle'
  },
  
  // Notification details
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  
  // Notification type (e.g., 'health_alert', 'system', 'farm_update')
  type: {
    type: String,
    required: true,
    enum: [
      'health_alert', 
      'system', 
      'farm_update', 
      'cattle_status_change',
      'task_assignment',
      'other'
    ],
    default: 'other'
  },
  
  // Severity level
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  
  // Read status
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Related action URL (optional)
  actionUrl: String,
  
  // Additional data (for flexible storage of related info)
  data: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ severity: 1 });

// Static method to create a new notification
notificationSchema.statics.createNotification = async function(notificationData) {
  try {
    const notification = await this.create(notificationData);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.isRead = true;
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
