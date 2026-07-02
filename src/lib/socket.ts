import { io, type Socket } from 'socket.io-client';
import { storage } from './storage';
import { SOCKET_EVENTS } from './socket-events';

// Gateway has no namespace/path override — connect to the API's origin, not the
// Axios baseURL (VITE_API_URL includes the REST-only `/api` prefix).
const SOCKET_ORIGIN = (import.meta.env.VITE_API_URL as string).replace(/\/api\/?$/, '');

export interface AppointmentCreatedPayload {
  appointmentId: string;
  start: string;
  stylistId: string;
  groupId?: string;
}

/** The gateway emits the full persisted Notification doc (dispatchOnce), not just its payload. */
export interface AppointmentCreatedNotif {
  _id: string;
  groupId?: string;
  title: string;
  body: string;
  date: string;
  payload: AppointmentCreatedPayload;
}

let socket: Socket | null = null;

/** Opens the POS realtime connection — call once per signed-in session (mount FrontDeskShell). */
export function connectPosSocket(onAppointmentCreated: (notif: AppointmentCreatedNotif) => void): Socket | null {
  const token = storage.getToken();
  if (!token) return null;

  socket = io(SOCKET_ORIGIN, {
    transports: ['websocket'],
    auth: { token },
  });

  socket.on(SOCKET_EVENTS.APPOINTMENT_CREATED, onAppointmentCreated);

  return socket;
}

export function disconnectPosSocket(): void {
  socket?.disconnect();
  socket = null;
}
