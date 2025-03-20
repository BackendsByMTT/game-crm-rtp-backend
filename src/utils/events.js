"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Channels = exports.Events = void 0;
var Events;
(function (Events) {
    // Control events
    Events["CONTROL_CREDITS"] = "control:credits";
    Events["CONTROL_ENTER"] = "control:enter";
    Events["CONTROL_EXIT"] = "control:exit";
    Events["CONTROL_ALL"] = "control:all";
    // Playground events
    Events["PLAYGROUND_CREDITS"] = "playground:credits";
    Events["PLAYGROUND_ENTER"] = "playground:enter";
    Events["PLAYGROUND_EXIT"] = "playground:exit";
    Events["PLAYGROUND_GAME_ENTER"] = "playground:game:enter";
    Events["PLAYGROUND_GAME_EXIT"] = "playground:game:exit";
    Events["PLAYGROUND_GAME_SPIN"] = "playground:game:spin";
    Events["PLAYGROUND_GAME_UPDATE"] = "playground:game:update:payout";
    Events["PLAYGROUND_ALL"] = "playground:all";
    Events["PLAYGROUND_UPDATE"] = "playground:update:status";
})(Events || (exports.Events = Events = {}));
exports.Channels = {
    CONTROL: (role, username) => `control:${role}:${username}`,
    PLAYGROUND: (username) => `playground:${username}`,
};
