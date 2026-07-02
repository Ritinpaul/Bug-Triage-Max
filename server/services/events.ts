import { EventEmitter } from "events";

// Increase max listeners if needed
class SystemEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

export const systemEvents = new SystemEventEmitter();
