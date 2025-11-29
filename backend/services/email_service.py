"""
Email service for sending OTP codes and notifications.
"""
import os
import smtplib
import random
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

class EmailService:
    def __init__(self):
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL", "")
        self.sender_password = os.getenv("SENDER_PASSWORD", "")
        self.otp_storage = {}  # In production, use Redis
        
    def generate_otp(self) -> str:
        """Generate a 6-digit OTP."""
        return str(random.randint(100000, 999999))
    
    def store_otp(self, email: str, otp: str, expiry_minutes: int = 5):
        """Store OTP with expiration time."""
        expiry_time = datetime.now() + timedelta(minutes=expiry_minutes)
        self.otp_storage[email] = {
            "otp": otp,
            "expiry": expiry_time,
            "attempts": 0
        }
    
    def verify_otp(self, email: str, otp: str) -> tuple[bool, str]:
        """Verify OTP code."""
        if email not in self.otp_storage:
            return False, "No OTP found for this email"
        
        stored_data = self.otp_storage[email]
        
        # Check expiration
        if datetime.now() > stored_data["expiry"]:
            del self.otp_storage[email]
            return False, "OTP has expired"
        
        # Check attempts
        if stored_data["attempts"] >= 3:
            del self.otp_storage[email]
            return False, "Too many failed attempts"
        
        # Verify OTP
        if stored_data["otp"] == otp:
            del self.otp_storage[email]
            return True, "OTP verified successfully"
        else:
            stored_data["attempts"] += 1
            return False, "Invalid OTP"
    
    def send_otp_email(self, recipient_email: str, otp: str, username: str) -> bool:
        """Send OTP via email."""
        try:
            # Create message
            msg = MIMEMultipart()
            msg['From'] = self.sender_email
            msg['To'] = recipient_email
            msg['Subject'] = "Your FinBuddy Verification Code"
            
            # HTML body
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                        <h2 style="color: #4f46e5; text-align: center;">FinBuddy Verification</h2>
                        <p>Hello {username},</p>
                        <p>Your verification code is:</p>
                        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
                            <h1 style="letter-spacing: 5px; margin: 0; color: #1f2937;">{otp}</h1>
                        </div>
                        <p>This code will expire in 5 minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
                        <p style="font-size: 12px; color: #6b7280; text-align: center;">
                            &copy; 2025 FinBuddy. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            msg.attach(MIMEText(html, 'html'))
            
            # Connect to server and send
            print(f"DEBUG: Connecting to SMTP server {self.smtp_server}:{self.smtp_port}...")
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            print(f"DEBUG: Logging in as {self.sender_email}...")
            server.login(self.sender_email, self.sender_password)
            print(f"DEBUG: Sending email to {recipient_email}...")
            server.send_message(msg)
            server.quit()
            print("DEBUG: Email sent successfully!")
            return True
            
        except Exception as e:
            print(f"ERROR: Failed to send OTP email: {str(e)}")
            traceback.print_exc()
            return False
    
    def send_welcome_email(self, recipient_email: str, username: str) -> bool:
        """Send welcome email after registration."""
        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = "Welcome to FinBuddy!"
            message["From"] = self.sender_email
            message["To"] = recipient_email
            
            html = f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #667eea; text-align: center;">Welcome to FinBuddy!</h2>
                        <h3 style="color: #333;">Hello {username}!</h3>
                        <p style="color: #666; font-size: 16px;">
                            Thank you for registering with FinBuddy. Your account has been created successfully.
                        </p>
                        <p style="color: #666; font-size: 16px;">
                            Start managing your finances with AI-powered insights and smart budgeting tools.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://localhost:8000" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Get Started
                            </a>
                        </div>
                        <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                            © 2025 FinBuddy AI. All rights reserved.
                        </p>
                    </div>
                </body>
            </html>
            """
            
            part = MIMEText(html, "html")
            message.attach(part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient_email, message.as_string())
            
            return True
        except Exception as e:
            print(f"Failed to send welcome email: {str(e)}")
            return False

# Global instance
email_service = EmailService()
