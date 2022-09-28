import { GroundMesh } from "babylonjs";
import { IPlayer } from "./player";

export interface IArena {
    ground: GroundMesh,
    players: IPlayer[];
}