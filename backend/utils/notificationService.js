const Notification = require('../models/Notification');

async function createAdminNotification({ type, title, message, metadata = {}, entityType = null, entityId = null, recipientUserId = null }) {
  await Notification.create({
    type,
    title,
    message,
    metadata,
    entity_type: entityType,
    entity_id: entityId,
    recipient_role: 'admin',
    recipient_user_id: recipientUserId || null
  });
}

async function createUserNotification({ type, title, message, metadata = {}, entityType = null, entityId = null, recipientUserId }) {
  if (!recipientUserId) {
    throw new Error('recipientUserId is required to notify a user');
  }

  await Notification.create({
    type,
    title,
    message,
    metadata,
    entity_type: entityType,
    entity_id: entityId,
    recipient_role: 'user',
    recipient_user_id: recipientUserId
  });
}

async function markNotificationsReadByEntity(entityType, entityId) {
  await Notification.update(
    { status: 'read' },
    {
      where: {
        entity_type: entityType,
        entity_id: entityId
      }
    }
  );
}

module.exports = {
  createAdminNotification,
  createUserNotification,
  markNotificationsReadByEntity
};
