const EventEmitter = require('node:events');
const { threadId } = require('node:worker_threads');

class BTSensor {
    constructor(device) {
        this.device=device    
        this.eventEmitter = new EventEmitter();
    }

    connect(){
        throw new Error("connect() member function must be implemented by subclass")
    }

    disconnect(){
        this.eventEmitter.removeAllListeners()
    }

    //Pass through on(evenName, ...args) to EventEmitter
    on(eventName, ...args){
        this.eventEmitter.on(eventName, ...args)
    }

}

module.exports = BTSensor   