"use client";

/**
 * SocketContext — Manages the Socket.IO connection lifecycle.
 *
 * Connects when a user is authenticated, disconnects on logout.
 * Provides the socket instance and connection state to all children.
 *
 * Also exposes event-specific state that many components need:
 *   - onlineCount: number of users in the chat room
 *
 * Components use the `useSocket()` hook to access the socket and
 * subscribe to specific events via `useSocketEvent()`.
 */
import React, {
  createContext,
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
  // Expose socket via state so context consumers re-render when it changes
  const [socketState, setSocketState] = useState<TypedSocket | null>(null);

  useEffect(() => {
    // Only connect when authenticated
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocketState(null);
        setConnected(false);
        setOnlineCount(0);
      }
      return;
    }

    // Already connected for this user
    if (socketRef.current?.connected) return;

    // Disconnect stale socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

    const newSocket: TypedSocket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socketRef.current = newSocket;
    setSocketState(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);

      // Request initial online count
      (newSocket as any).emit("chat:online", (count: number) => {
        setOnlineCount(count);
      });
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("connect_error", () => {
      setConnected(false);
    });

    // Track online count updates
    (newSocket as any).on(SERVER_EVENTS.CHAT_ONLINE_COUNT, (count: number) => {
      setOnlineCount(count);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocketState(null);
      setConnected(false);
    };
  }, [user?.id]);

  const value = React.useMemo(
    () => ({ socket: socketState, connected, onlineCount }),
    [socketState, connected, onlineCount]
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
