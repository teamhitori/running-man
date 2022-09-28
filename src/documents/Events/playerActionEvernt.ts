import { Vector2 } from "babylonjs";
import { PlayerState } from "../common";

export interface playerActionEvent {
    position: Vector2;
    orientationY: number;
    playerState: PlayerState;
    throw: boolean;
}