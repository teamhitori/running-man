import { AbstractMesh, Mesh, SpotLight, StandardMaterial, Vector2, Vector3 } from "babylonjs";
import { BallState } from "../../documents/common";

export interface IBall {
    thrownBy: number;
    mesh: Mesh,
    ballState: BallState,
    impulse: number,
    rotationY: number,
    playerRef: number
}

