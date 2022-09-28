import { IFrontendApi } from "@frakas/api/public";
import { AbstractMesh, AnimationGroup, InstantiatedEntries, KeyboardEventTypes, Mesh, PointerEventTypes, Scene, SpotLight, StandardMaterial, Vector2, Vector3 } from "babylonjs";
import { Subscription, tap, Subject, interval } from "rxjs";
import { PlayerGameState, PlayerState } from "../../documents/common";
import { EventTypeIn, IEvent } from "../../documents/Event";
import { playerSnapshot } from "../../documents/Events/gameSnapshotEvent";
import { playerActionEvent } from "../../documents/Events/playerActionEvernt";
import { IBall } from "./ball";
import { IHomeZone } from "./homeZone";

export interface IPlayer {
    gamePosition: number;
    model: InstantiatedEntries;
    material: StandardMaterial;
    //spotLight: SpotLight;
    homeZone: IHomeZone;
    ball: IBall;
    hasBall: IBall | undefined;
    playerState: PlayerState;
    playerGameState: PlayerGameState;
    impulse: number;
    impulseY: number;
    celebrateImpulse: number;
}

export function initMyPlayer(scene: Scene, api: IFrontendApi, myPlayer: IPlayer): Subject<playerSnapshot> {

    var pointerStart: Vector2 | undefined = undefined;
    var pointerCurrent: Vector2 | undefined = undefined;
    var keys: { [key: string]: boolean } = {
        "keyUp": false,
        "keyDown": false,
        "keyLeft": false,
        "keyRight": false
    }

    var isTap = true;
    var lerp = 0;

    var myEvent: Subject<playerSnapshot> = new Subject()

    scene.onPointerObservable.add((pointerInfo) => {

        switch (pointerInfo.type) {
            case PointerEventTypes.POINTERDOWN:

                pointerStart = new Vector2(pointerInfo.event.offsetX, -pointerInfo.event.offsetY);
                pointerCurrent = pointerStart;
                myEvent.next(<playerSnapshot>{ playerState: PlayerState.running });

                break;
            case PointerEventTypes.POINTERUP:

                pointerStart = undefined;
                pointerCurrent = undefined;
                myEvent.next(<playerSnapshot>{ playerState: PlayerState.idle });
                //console.log("POINTERUP")
                break;
            case PointerEventTypes.POINTERMOVE:
                pointerCurrent = new Vector2(pointerInfo.event.offsetX, -pointerInfo.event.offsetY);
                break;
            case PointerEventTypes.POINTERWHEEL:
                break;
            case PointerEventTypes.POINTERPICK:
                break;
            case PointerEventTypes.POINTERTAP:
                console.log("POINTERTAP")
                new Promise(resolve => {
                    api.sendToBackend<IEvent>({
                        type: EventTypeIn.playerThrow,
                        data: {}
                    });
                    resolve({});
                });
            case PointerEventTypes.POINTERDOUBLETAP:
                break;
        }

    });

    scene.onKeyboardObservable.add((kbInfo) => {
        switch (kbInfo.type) {
            case KeyboardEventTypes.KEYDOWN:
                //console.log("KEY DOWN: ", kbInfo.event.key);
                if (kbInfo.event.key == "ArrowUp") {
                    if (!keys.keyUp) {
                        lerp = 0;
                        myEvent.next(<playerSnapshot>{ playerState: PlayerState.running });
                    }
                    keys.keyUp = true;
                } else if (kbInfo.event.key == "ArrowDown") {
                    if (!keys.keyDown) {
                        lerp = 0;
                        myEvent.next(<playerSnapshot>{ playerState: PlayerState.running });
                    }
                    keys.keyDown = true;
                } else if (kbInfo.event.key == "ArrowLeft") {
                    if (!keys.keyLeft) {
                        lerp = 0;
                        myEvent.next(<playerSnapshot>{ playerState: PlayerState.running });
                    }
                    keys.keyLeft = true;
                } else if (kbInfo.event.key == "ArrowRight") {
                    if (!keys.keyRight) {
                        lerp = 0;
                        myEvent.next(<playerSnapshot>{ playerState: PlayerState.running });
                    }
                    keys.keyRight = true;
                } else if (kbInfo.event.key == " ") {
                    if (isTap) {
                        isTap = false;
                        api.sendToBackend<IEvent>({
                            type: EventTypeIn.playerThrow,
                            data: {}
                        });
                    }
                }
                break;
            case KeyboardEventTypes.KEYUP:
                // console.log("KEY UP: ", kbInfo.event);
                if (kbInfo.event.key == "ArrowUp") {
                    keys.keyUp = false;
                } else if (kbInfo.event.key == "ArrowDown") {
                    keys.keyDown = false;
                } else if (kbInfo.event.key == "ArrowLeft") {
                    keys.keyLeft = false;
                } else if (kbInfo.event.key == "ArrowRight") {
                    keys.keyRight = false;
                } else if (kbInfo.event.key == " ") {
                    isTap = true;
                }

                var idle = true;
                for (const key in keys) {
                    if (keys[key]) idle = false;
                }
                if (idle) {
                    myEvent.next(<playerSnapshot>{ playerState: PlayerState.idle });
                }
                break;
        }
    })

    var count = 0;

    // setInterval(()=> {
        
    //     console.log(`EventsOut: ${count}`);
    //     count = 0;
    // }, 1000)

    scene.onBeforeRenderObservable.add(() => {
        count++;

        if (myPlayer.playerState == PlayerState.flying || myPlayer.playerState == PlayerState.falling || myPlayer.playerState == PlayerState.celebrating) {
            myPlayer.celebrateImpulse = 0;
            return;
        }

        if (myPlayer.celebrateImpulse <= 0) {
            myPlayer.celebrateImpulse = 0;
        }

        if (keys.keyUp) {
            lerp = Math.min(lerp + 1 / 120, 1);
            myPlayer!!.model.rootNodes[0].rotation = Vector3.Lerp(myPlayer!!.model.rootNodes[0].rotation, new Vector3(0, Math.PI, 0), lerp);
            myPlayer!!.model.rootNodes[0].position.z += 0.06;
        }
        if (keys.keyDown) {
            lerp = Math.min(lerp + 1 / 120, 1);
            myPlayer!!.model.rootNodes[0].rotation = Vector3.Lerp(myPlayer!!.model.rootNodes[0].rotation, new Vector3(0, 0, 0), lerp);
            myPlayer!!.model.rootNodes[0].position.z -= 0.06;
        }
        if (keys.keyLeft) {
            lerp = Math.min(lerp + 1 / 120, 1);
            myPlayer!!.model.rootNodes[0].rotation = Vector3.Lerp(myPlayer!!.model.rootNodes[0].rotation, new Vector3(0, Math.PI / 2, 0), lerp);
            myPlayer!!.model.rootNodes[0].position.x -= 0.06;
        }
        if (keys.keyRight) {
            lerp = Math.min(lerp + 1 / 120, 1);
            var rotation = myPlayer!!.model.rootNodes[0].rotation.y > Math.PI / 2 ? 3 * Math.PI / 2 : -Math.PI / 2;
            myPlayer!!.model.rootNodes[0].rotation = Vector3.Lerp(myPlayer!!.model.rootNodes[0].rotation, new Vector3(0, rotation, 0), lerp);
            myPlayer!!.model.rootNodes[0].position.x += 0.06;
        }

        if (pointerStart && pointerCurrent) {
            var offset = (pointerCurrent).subtract(pointerStart).scale(0.00015);

            var angle = offset.x > 0 ?
                Math.atan(-offset.y / offset.x) - Math.PI / 2 :
                Math.atan(-offset.y / offset.x) + Math.PI / 2;

            myPlayer!!.model.rootNodes[0].position.x += offset.x;
            myPlayer!!.model.rootNodes[0].position.z += offset.y;

            if (angle) {
                myPlayer!!.model.rootNodes[0].rotation = new Vector3(0, angle, 0);
            }
        }

        //console.log(`my current-state:`, myPlayer.currentState);

        // myPlayer!!.model.rootNodes[0].position.x, myPlayer!!.model.rootNodes[0].position.z

        myPlayer.celebrateImpulse -= 0.01;

        // console.log(myPlayer!!.model.rootNodes[0].position.x.toFixed(5), myPlayer!!.model.rootNodes[0].position.z.toFixed(5))

        api.sendToBackend<IEvent>({
            type: EventTypeIn.playerAction,
            data: <playerActionEvent>{
                orientationY: myPlayer!!.model.rootNodes[0].rotation.y,
                playerState: myPlayer.playerState,
                position: new Vector2(myPlayer!!.model.rootNodes[0].position.x, myPlayer!!.model.rootNodes[0].position.z),

            }

        });
    });

    return myEvent;

}