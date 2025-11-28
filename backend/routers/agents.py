"""
Autonomous Agents API Router
Endpoints for managing and monitoring autonomous AI agents
"""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging

from backend.services.autonomous_scheduler import autonomous_scheduler
from backend.services.proactive_notification_engine import (
    notification_engine,
    NotificationUrgency
)

router = APIRouter(prefix="/api/agents", tags=["Autonomous Agents"])
logger = logging.getLogger(__name__)


# ==================== AGENT STATUS ====================

@router.get("/status")
async def get_agent_status():
    """
    Get status of all autonomous agents
    
    Returns:
        - scheduler_running: bool
        - agents: dict of agent states
        - total_alerts: int
    """
    try:
        status = autonomous_scheduler.get_agent_status()
        return {
            "success": True,
            "data": status
        }
    except Exception as e:
        logger.error(f"Error getting agent status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_all_alerts():
    """
    Get all current alerts from all agents
    Sorted by urgency (critical first)
    """
    try:
        alerts = autonomous_scheduler.get_all_alerts()
        return {
            "success": True,
            "count": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        logger.error(f"Error getting alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== NOTIFICATIONS ====================

@router.get("/notifications")
async def get_notifications(
    user_id: str = "default_user",
    unread_only: bool = False,
    limit: int = 50
):
    """
    Get notifications for user
    
    Query params:
        - user_id: User identifier
        - unread_only: Only return unread notifications
        - limit: Maximum number of notifications
    """
    try:
        notifications = notification_engine.get_notifications(
            user_id=user_id,
            unread_only=unread_only,
            limit=limit
        )
        return {
            "success": True,
            "count": len(notifications),
            "notifications": notifications
        }
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark notification as read"""
    try:
        notification_engine.mark_as_read(notification_id)
        return {
            "success": True,
            "message": "Notification marked as read"
        }
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notifications/{notification_id}/dismiss")
async def dismiss_notification(notification_id: str):
    """Dismiss notification"""
    try:
        notification_engine.dismiss_notification(notification_id)
        return {
            "success": True,
            "message": "Notification dismissed"
        }
    except Exception as e:
        logger.error(f"Error dismissing notification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/notifications")
async def clear_all_notifications(user_id: str = "default_user"):
    """Clear all notifications for user"""
    try:
        notification_engine.clear_all_notifications(user_id)
        return {
            "success": True,
            "message": "All notifications cleared"
        }
    except Exception as e:
        logger.error(f"Error clearing notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MANUAL TRIGGERS (FOR DEMO) ====================

@router.post("/trigger/hourly-check")
async def trigger_hourly_check():
    """Manually trigger hourly checks (for demo purposes)"""
    try:
        autonomous_scheduler.run_hourly_checks()
        return {
            "success": True,
            "message": "Hourly checks triggered",
            "alerts": autonomous_scheduler.get_all_alerts()
        }
    except Exception as e:
        logger.error(f"Error triggering hourly check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger/deep-analysis")
async def trigger_deep_analysis():
    """Manually trigger deep analysis (for demo purposes)"""
    try:
        autonomous_scheduler.run_deep_analysis()
        return {
            "success": True,
            "message": "Deep analysis triggered",
            "alerts": autonomous_scheduler.get_all_alerts()
        }
    except Exception as e:
        logger.error(f"Error triggering deep analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== SCHEDULER CONTROL ====================

@router.post("/scheduler/start")
async def start_scheduler():
    """Start the autonomous scheduler"""
    try:
        autonomous_scheduler.start()
        return {
            "success": True,
            "message": "Autonomous scheduler started",
            "status": autonomous_scheduler.get_agent_status()
        }
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scheduler/stop")
async def stop_scheduler():
    """Stop the autonomous scheduler"""
    try:
        autonomous_scheduler.stop()
        return {
            "success": True,
            "message": "Autonomous scheduler stopped"
        }
    except Exception as e:
        logger.error(f"Error stopping scheduler: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== DEMO SCENARIOS ====================

@router.post("/demo/budget-alert")
async def demo_budget_alert(user_id: str = "default_user"):
    """
    Demo: Trigger a budget overspend alert
    Shows proactive intervention
    """
    try:
        notification = notification_engine.send_notification(
            user_id=user_id,
            title="🚨 Budget Alert: Food Category",
            message="You've spent ₹8,500 of ₹10,000 food budget (85%). At this pace, you'll exceed by ₹2,300. Suggested action: Limit dining out to ₹500 for next 10 days.",
            urgency=NotificationUrgency.HIGH,
            agent_name="budget_guardian",
            action_buttons=[
                {"label": "Accept Suggestion", "action": "accept_budget_plan"},
                {"label": "Adjust Budget", "action": "adjust_budget"},
                {"label": "Ignore", "action": "dismiss"}
            ],
            data={"category": "Food", "current": 8500, "budget": 10000, "percentage": 85}
        )
        
        return {
            "success": True,
            "message": "Budget alert demo triggered",
            "notification": notification.to_dict()
        }
    except Exception as e:
        logger.error(f"Error in budget alert demo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/demo/gst-warning")
async def demo_gst_warning(user_id: str = "default_user"):
    """
    Demo: Trigger GST compliance warning
    Shows proactive compliance monitoring
    """
    try:
        notification = notification_engine.send_notification(
            user_id=user_id,
            title="⚠️ GST Compliance Warning",
            message="Your yearly income is ₹18,50,000 (92.5% of ₹20,00,000 threshold). Only ₹1,50,000 away from mandatory GST registration. Prepare documents now.",
            urgency=NotificationUrgency.CRITICAL,
            agent_name="compliance_monitor",
            action_buttons=[
                {"label": "View Details", "action": "view_gst_details"},
                {"label": "Set Reminder", "action": "set_reminder"},
                {"label": "Talk to AI", "action": "open_chat"}
            ],
            data={"current_income": 1850000, "threshold": 2000000, "percentage": 92.5}
        )
        
        return {
            "success": True,
            "message": "GST warning demo triggered",
            "notification": notification.to_dict()
        }
    except Exception as e:
        logger.error(f"Error in GST warning demo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/demo/savings-opportunity")
async def demo_savings_opportunity(user_id: str = "default_user"):
    """
    Demo: Trigger savings opportunity detection
    Shows autonomous optimization
    """
    try:
        notification = notification_engine.send_notification(
            user_id=user_id,
            title="💡 Savings Opportunity Detected",
            message="I detected ₹5,000 surplus this month! Smart allocation: ₹3,000 → Emergency Fund (60% of goal), ₹2,000 → ELSS (tax saving + growth).",
            urgency=NotificationUrgency.MEDIUM,
            agent_name="savings_optimizer",
            action_buttons=[
                {"label": "Auto-Save", "action": "auto_save"},
                {"label": "Customize", "action": "customize_savings"},
                {"label": "Skip This Month", "action": "skip"}
            ],
            data={"surplus": 5000, "emergency_allocation": 3000, "investment_allocation": 2000}
        )
        
        return {
            "success": True,
            "message": "Savings opportunity demo triggered",
            "notification": notification.to_dict()
        }
    except Exception as e:
        logger.error(f"Error in savings opportunity demo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
