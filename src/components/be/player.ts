import { Color3, Mesh } from "babylonjs";
import { PlayerGameState, PlayerState } from "../../documents/common";
import { IBall } from "./ball";
import { IHomeZone } from "./homeZone";

export interface IPlayer {
    playerPosition: number;
    color: Color3;
    colorName: string;
    mesh: Mesh;
    playerName: string;
    homeZone: IHomeZone;
    ball: IBall;
    hasBall: IBall | undefined;
    playerState: PlayerState;
    playerGameState: PlayerGameState;
    flyingImpulse: number;
    flyingImpulseY: number;
    fallingImpulse: number;
    victoryImpulse: number;
    force: boolean;
}

