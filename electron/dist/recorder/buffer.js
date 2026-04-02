"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushEvent = pushEvent;
exports.getEvents = getEvents;
exports.getEventCount = getEventCount;
exports.clearBuffer = clearBuffer;
let events = [];
function pushEvent(event) {
    events.push(event);
}
function getEvents() {
    return [...events];
}
function getEventCount() {
    return events.length;
}
function clearBuffer() {
    events = [];
}
//# sourceMappingURL=buffer.js.map