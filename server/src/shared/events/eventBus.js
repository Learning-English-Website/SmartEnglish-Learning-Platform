const EventEmitter = require('events');

/**
 * Singleton EventBus for decoupled communication between modules.
 * Usage:
 *   eventBus.emit('user:registered', { userId, email });
 *   eventBus.on('user:registered', handler);
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
