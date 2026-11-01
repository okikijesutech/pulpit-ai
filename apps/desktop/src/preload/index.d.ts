import { PulpitAPI } from './index.js';

declare global {
  interface Window {
    pulpitAPI: PulpitAPI;
  }
}
