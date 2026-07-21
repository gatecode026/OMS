import { CHAT_EVENTS } from './constants';

export interface SocketContract {
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
  connected: boolean;
}
