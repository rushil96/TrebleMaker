"use client";

import React from "react";
import { usePlayer } from "@/context/PlayerContext";
import { AlertCircle, X, Info, AlertTriangle } from "lucide-react";

export default function NotificationOverlay() {
  const { notification, clearNotification } = usePlayer();

  if (!notification) return null;

  const Icon = notification.type === "error" ? AlertCircle : notification.type === "warning" ? AlertTriangle : Info;

  return (
    <div className={`notification-toast glass-effect ${notification.type}`}>
      <div className="notification-content">
        <Icon className="notif-icon" size={20} />
        <p>{notification.message}</p>
      </div>
      <button onClick={clearNotification} className="close-btn">
        <X size={16} />
      </button>

      <style jsx>{`
        .notification-toast {
          position: fixed;
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          min-width: 320px;
          max-width: 450px;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: white;
        }

        .notification-content p {
          font-size: 0.9rem;
          font-weight: 500;
          margin: 0;
        }

        .notif-icon {
          flex-shrink: 0;
        }

        .error .notif-icon {
          color: #ff4d4d;
        }
        
        .warning .notif-icon {
          color: #ffcc00;
        }
        
        .info .notif-icon {
          color: var(--spotify-green);
        }

        .close-btn {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: white;
        }

        @keyframes slideDown {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
