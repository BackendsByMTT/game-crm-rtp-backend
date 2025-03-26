export enum Events {
    // Control events
    CONTROL_CREDITS = "control:credits",
    CONTROL_ENTER = "control:enter",
    CONTROL_EXIT = "control:exit",
    CONTROL_ALL = "control:all",

    // Playground events
    PLAYGROUND_CREDITS = "playground:credits",
    PLAYGROUND_ENTER = "playground:enter",
    PLAYGROUND_EXIT = "playground:exit",
    PLAYGROUND_GAME_ENTER = "playground:game:enter",
    PLAYGROUND_GAME_EXIT = "playground:game:exit",
    PLAYGROUND_GAME_SPIN = "playground:game:spin",
    PLAYGROUND_GAME_UPDATE = "playground:game:update:payout",
    PLAYGROUND_ALL = "playground:all",
    PLAYGROUND_UPDATE = "playground:update:status",
    PLAYGROUND_GAME_URL = "playground:game:url",
}

export const Channels = {
    CONTROL: (role: string, username: string) => `control:${role}:${username}`,
    PLAYGROUND: (username: string) => `playground:${username}`,
};