import { Vector2 } from "babylonjs";
import { GameState } from "../../components/be/gameState";
import { BallState, PlayerGameState, PlayerState } from "../common";

export interface gameSnapshotEvent {
    players: { [gamePosition: number]: playerSnapshot[] },
    gameState: GameState,
    gameTimer: number;
}

export interface playerSnapshot {
    position: Vector2 | undefined;
    orientationY: number | undefined;
    playerState: PlayerState | undefined;
    playerGameState: PlayerGameState | undefined;
    hasBallIndex: number | undefined;
    ballPosition: Vector2 | undefined;
    ballState: BallState | undefined;
    force: boolean | undefined; 
}