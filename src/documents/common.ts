
export enum PlayerState {
    idle = 1,
    flying = 2,
    falling = 3,
    running = 4,
    celebrating = 5
}

export enum PlayerGameState {
    ready = 1,
    collected = 2,
    win = 3,
    disabled = 4,
    exited = 5
}

export enum BallState {
    free,
    thrown,
    flying,
    held,
    disabled
}