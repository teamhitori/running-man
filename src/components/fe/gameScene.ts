import { AbstractMesh, ArcRotateCamera, Camera, GroundMesh, IPointerEvent, KeyboardInfo, Matrix, Nullable, PickingInfo, PointerEventTypes, PointerInfo, Ray, TrianglePickingPredicate, Vector2 } from "babylonjs";
import { Observable } from "rxjs";
import { gameEnterEvent } from "../../documents/Events/gameEnterEvent";
import { gameSnapshotEvent } from "../../documents/Events/gameSnapshotEvent";
import { playerActionEvent } from "../../documents/Events/playerActionEvernt";
import { SceneType as SceneType } from "../../documents/SceneType";
import { IArena } from "./arena";
import { IPlayer } from "./player";

export interface IGameScene {

    // temp
    scene: any

    gameLoop: Observable<void>;
    arena: IArena;
    //onEnterGame(): Observable<gameEnterEvent>,
    onGameSnapshot(): Observable<gameSnapshotEvent>,
    playerAction: (positionAction: playerActionEvent) => void;
    throw: () => void;

    activeCamera: ArcRotateCamera;

    onPointerDown: (evt: IPointerEvent, pickInfo: PickingInfo, type: PointerEventTypes) => void;
    onPointerUp: (evt: IPointerEvent, pickInfo: Nullable<PickingInfo>, type: PointerEventTypes) => void
    createPickingRay(x: number, y: number, world: Nullable<Matrix>, camera: Nullable<Camera>, cameraViewSpace?: boolean | undefined): Ray;
    pickWithRay(ray: Ray, predicate?: ((mesh: AbstractMesh) => boolean) | undefined, fastCheck?: boolean | undefined, trianglePredicate?: TrianglePickingPredicate | undefined): Nullable<PickingInfo>
    onPointerObservable: Observable<PointerInfo>
    onKeyboardObservable: Observable<KeyboardInfo>

    pointerX: number;
    pointerY: number;

}