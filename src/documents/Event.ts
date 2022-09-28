
export enum EventTypeIn {
    playerStart = 1,
    requestEnterGame = 3,
    //requestCreate = 5,
    requestStartGame = 7,
    playerAction = 9,
    playerThrow = 11,
    playerExit = 13,
    timeoutCreate = 15,
    timeoutEnter = 18,
    timeoutGame = 19,
    timeoutGameOver = 21,
    timeoutAwaitPlayer = 23,   
    timeoutGameStart = 25
}

export enum EventTypeOut {
    showIntro = 2,
    showCreatePlayer = 4,
    showAwaitCreate = 6,
    updateAwaitPlayers = 8,
    showGame = 10,
    showGameInProgress = 12,
    gameSnapshot = 14,
    updateCreate = 16,
    showNoEntry = 18
}

export interface IEvent {
    type: EventTypeIn | EventTypeOut;
    data: any;
}