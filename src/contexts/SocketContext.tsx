"use client";

/**
 * SocketContext — Manages the Socket.IO connection lifecycle.
 *
 * Connects when a user is authenticated, disconnects on logout.
 * Provides the socket instance and connection state to all children.
 *
 * Also exposes event-specific state that many components need:
 *   - onlineCount: number of users in the chat room
 *   - unreadNotifications: real-time unread count
 *
 * Components use the `useSocket()` hook to access the socket and
 * subscribe to specific events via `useSocketEvent()`.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/lib/socket-events";
import { SERVER_EVENTS } from "@/lib/socket-events";

// ---- Types ----

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  connected: boolean;
  onlineCount: number;
}

// ---- Context ----

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  onlineCount: 0,
});

// ---- Provider ----

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setOnlineCount(0);
      }
      return;
    }

    // Already connected
    if (socketRef.current?.connected) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

    const socket: TypedSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected");
      setConnected(true);

      // Request initial online count
      socket.emit("chat:online" as any, (count: number) => {
        setOnlineCount(count);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      setConnected(false);
    });

    // Track online count updates
    socket.on(SERVER_EVENTS.CHAT_ONLINE_COUNT, (count: number) => {
      setOnlineCount(count);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const value = React.useMemo(
    () => ({
      socket: socketRef.current,
      connected,
      onlineCount,
    }),
    [connected, onlineCount]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

// ---- Hooks ----

/**
 * Access the socket instance and connection state.
 */
export function useSocket(): SocketContextValue {
  return useContext(SocketContext);
}

/**
 * Subscribe to a specific Socket.IO event.
 * Automatically cleans up on unmount or when the socket changes.
 *
 * Usage:
 *   useSocketEvent("ticker:event", (payload) => {
 *     setEvents(prev => [payload, ...prev]);
 *   });
 */
export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
): void {
  const { socket } = useSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;

    const wrappedHandler = (...args: any[]) => {
      (handlerRef.current as any)(...args);
    };

    (socket as any).on(event, wrappedHandler);
    return () => {
      (socket as any).off(event, wrappedHandler);
    };
  }, [socket, event]);
}
