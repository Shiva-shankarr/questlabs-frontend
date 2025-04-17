import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const NotificationsDropdown = ({ notifications = [], onMarkAsRead, onMarkAllAsRead, onClose }) => {
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notifications-dropdown">
      <div className="notifications-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button 
            className="btn btn-link btn-sm mark-all-read"
            onClick={onMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>
      <div className="notifications-list">
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              onClick={() => !notification.read && onMarkAsRead(notification.id)}
            >
              <div className="notification-content">
                <p className="notification-message">{notification.message}</p>
                <span className="notification-time">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
              </div>
              {!notification.read && (
                <div className="notification-dot" />
              )}
            </div>
          ))
        ) : (
          <div className="no-notifications">
            <p>No notifications yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsDropdown; 