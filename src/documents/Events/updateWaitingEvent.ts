

export interface updateWaitingEvent {
    players: {name:string, color: string}[];
    maxPlayers: number;
    myPlayerColorName: string;
    countDown: number;
}