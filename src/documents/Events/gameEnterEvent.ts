import { Color3, Vector2 } from "babylonjs";

export interface gameEnterEvent {
    myGamePosition: number,
    players: playerSetup[]
}

export interface playerSetup {
    gamePosition: number;
    homePosition: Vector2;
    ballStartPosition: Vector2;
    color: Color3;
    colorName: string;
    playerName: string;
}