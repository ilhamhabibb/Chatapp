import { io, type Socket } from "socket.io-client";
import { getApiUrl } from "./api";

export function createRealtimeSocket(namespace: string): Socket {
  return io(`${getApiUrl()}${namespace}`, {
    autoConnect: false,
    transports: ["websocket"],
    withCredentials: true,
  });
}
