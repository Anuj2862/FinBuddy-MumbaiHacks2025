"""
Proactive Notification Engine - Multi-channel notification system for Agentic AI
Sends intelligent, context-aware notifications to users
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class NotificationUrgency(Enum):
    """Notification urgency levels"""
    CRITICAL = "critical"  # Red - Immediate action required
    HIGH = "high"          # Orange - Important warning
    MEDIUM = "medium"      # Blue - Helpful suggestion
    LOW = "low"            # Green - Celebration/info


class NotificationChannel(Enum):
    """Available notification channels"""
    PUSH = "push"          # Push notification
    IN_APP = "in_app"      # In-app banner/modal
    EMAIL = "email"        # Email digest
    SMS = "sms"            # SMS alert (critical only)


class ProactiveNotification:
    """Represents a proactive notification"""
    
    def __init__(
        self,
        title: str,
        message: str,
        urgency: NotificationUrgency,
        agent_name: str,
        action_buttons: Optional[List[Dict]] = None,
        data: Optional[Dict] = None
    ):
        self.id = f"notif_{datetime.now().timestamp()}"
        self.title = title
        self.message = message
        self.urgency = urgency
        self.agent_name = agent_name
        self.action_buttons = action_buttons or []
        self.data = data or {}
        self.created_at = datetime.now()
        self.read = False
        self.dismissed = False
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "urgency": self.urgency.value,
            "agent_name": self.agent_name,
            "action_buttons": self.action_buttons,
            "data": self.data,
            "created_at": self.created_at.isoformat(),
            "read": self.read,
            "dismissed": self.dismissed
        }


class ProactiveNotificationEngine:
    """
    Intelligent notification engine that decides when and how to notify users
    Prevents notification fatigue through smart batching and timing
    """
    
    def __init__(self):
        self.notifications = []  # In-memory store (use DB in production)
        self.user_preferences = {}  # User notification preferences
        self.notification_history = []  # Track sent notifications
        
        logger.info("ProactiveNotificationEngine initialized")
    
    # ==================== SEND NOTIFICATION ====================
    
    def send_notification(
        self,
        user_id: str,
        title: str,
        message: str,
        urgency: NotificationUrgency,
        agent_name: str,
        action_buttons: Optional[List[Dict]] = None,
        data: Optional[Dict] = None
    ) -> ProactiveNotification:
        """
        Send a proactive notification to user
        
        Args:
            user_id: User identifier
            title: Notification title
            message: Notification message
            urgency: Urgency level
            agent_name: Name of agent sending notification
            action_buttons: Optional action buttons
            data: Optional additional data
        
        Returns:
            ProactiveNotification object
        """
        # Create notification
        notification = ProactiveNotification(
            title=title,
            message=message,
            urgency=urgency,
            agent_name=agent_name,
            action_buttons=action_buttons,
            data=data
        )
        
        # Check if should send based on user state
        if self._should_send_notification(user_id, notification):
            # Determine channels
            channels = self._select_channels(urgency)
            
            # Send through channels
            for channel in channels:
                self._send_through_channel(user_id, notification, channel)
            
            # Store notification
            self.notifications.append(notification)
            self.notification_history.append({
                "user_id": user_id,
                "notification_id": notification.id,
                "sent_at": datetime.now(),
                "channels": [c.value for c in channels]
            })
            
            logger.info(f"📬 Sent {urgency.value} notification: {title}")
        else:
            logger.info(f"⏸️ Batched notification for later: {title}")
        
        return notification
    
    # ==================== SMART DECISION MAKING ====================
    
    def _should_send_notification(self, user_id: str, notification: ProactiveNotification) -> bool:
        """
        Decide if notification should be sent immediately or batched
        Prevents notification fatigue
        """
        # Always send critical notifications
        if notification.urgency == NotificationUrgency.CRITICAL:
            return True
        
        # Check notification frequency
        recent_notifications = self._get_recent_notifications(user_id, hours=1)
        
        # If user received 5+ notifications in last hour, batch non-critical ones
        if len(recent_notifications) >= 5 and notification.urgency != NotificationUrgency.HIGH:
            return False
        
        # Check user active hours (9 AM - 10 PM)
        current_hour = datetime.now().hour
        if current_hour < 9 or current_hour > 22:
            # Only send critical/high during off-hours
            return notification.urgency in [NotificationUrgency.CRITICAL, NotificationUrgency.HIGH]
        
        return True
    
    def _select_channels(self, urgency: NotificationUrgency) -> List[NotificationChannel]:
        """Select appropriate channels based on urgency"""
        if urgency == NotificationUrgency.CRITICAL:
            return [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.EMAIL]
        elif urgency == NotificationUrgency.HIGH:
            return [NotificationChannel.PUSH, NotificationChannel.IN_APP]
        elif urgency == NotificationUrgency.MEDIUM:
            return [NotificationChannel.IN_APP]
        else:  # LOW
            return [NotificationChannel.IN_APP]
    
    # ==================== CHANNEL DELIVERY ====================
    
    def _send_through_channel(
        self,
        user_id: str,
        notification: ProactiveNotification,
        channel: NotificationChannel
    ):
        """Send notification through specific channel"""
        if channel == NotificationChannel.PUSH:
            self._send_push_notification(user_id, notification)
        elif channel == NotificationChannel.IN_APP:
            self._send_in_app_notification(user_id, notification)
        elif channel == NotificationChannel.EMAIL:
            self._send_email_notification(user_id, notification)
        elif channel == NotificationChannel.SMS:
            self._send_sms_notification(user_id, notification)
    
    def _send_push_notification(self, user_id: str, notification: ProactiveNotification):
        """Send push notification (implement with FCM/APNS)"""
        logger.info(f"📱 Push notification sent: {notification.title}")
        # TODO: Implement actual push notification service
    
    def _send_in_app_notification(self, user_id: str, notification: ProactiveNotification):
        """Send in-app notification (stored for display)"""
        logger.info(f"🔔 In-app notification queued: {notification.title}")
        # Notification is already stored in self.notifications
    
    def _send_email_notification(self, user_id: str, notification: ProactiveNotification):
        """Send email notification"""
        logger.info(f"📧 Email notification sent: {notification.title}")
        # TODO: Implement email service
    
    def _send_sms_notification(self, user_id: str, notification: ProactiveNotification):
        """Send SMS notification (critical only)"""
        logger.info(f"📲 SMS notification sent: {notification.title}")
        # TODO: Implement SMS service
    
    # ==================== NOTIFICATION MANAGEMENT ====================
    
    def get_notifications(
        self,
        user_id: str,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get notifications for user"""
        notifications = self.notifications
        
        if unread_only:
            notifications = [n for n in notifications if not n.read]
        
        # Sort by urgency and time
        urgency_order = {
            NotificationUrgency.CRITICAL: 0,
            NotificationUrgency.HIGH: 1,
            NotificationUrgency.MEDIUM: 2,
            NotificationUrgency.LOW: 3
        }
        
        notifications.sort(
            key=lambda n: (urgency_order[n.urgency], n.created_at),
            reverse=True
        )
        
        return [n.to_dict() for n in notifications[:limit]]
    
    def mark_as_read(self, notification_id: str):
        """Mark notification as read"""
        for notification in self.notifications:
            if notification.id == notification_id:
                notification.read = True
                logger.info(f"✅ Notification marked as read: {notification_id}")
                break
    
    def dismiss_notification(self, notification_id: str):
        """Dismiss notification"""
        for notification in self.notifications:
            if notification.id == notification_id:
                notification.dismissed = True
                logger.info(f"🗑️ Notification dismissed: {notification_id}")
                break
    
    def clear_all_notifications(self, user_id: str):
        """Clear all notifications for user"""
        self.notifications = []
        logger.info(f"🧹 All notifications cleared for user: {user_id}")
    
    # ==================== HELPER METHODS ====================
    
    def _get_recent_notifications(self, user_id: str, hours: int = 1) -> List[Dict]:
        """Get notifications sent in last N hours"""
        from datetime import timedelta
        cutoff = datetime.now() - timedelta(hours=hours)
        
        return [
            h for h in self.notification_history
            if h["user_id"] == user_id and h["sent_at"] > cutoff
        ]
    
    # ==================== BATCH NOTIFICATIONS ====================
    
    def send_daily_digest(self, user_id: str):
        """Send daily digest of batched notifications"""
        unread = self.get_notifications(user_id, unread_only=True)
        
        if not unread:
            return
        
        digest_message = f"You have {len(unread)} financial insights:\n"
        for notif in unread[:5]:  # Top 5
            digest_message += f"• {notif['title']}\n"
        
        self.send_notification(
            user_id=user_id,
            title="📊 Your Daily Financial Digest",
            message=digest_message,
            urgency=NotificationUrgency.LOW,
            agent_name="digest_service"
        )
        
        logger.info(f"📰 Daily digest sent to user: {user_id}")


# Global notification engine instance
notification_engine = ProactiveNotificationEngine()
