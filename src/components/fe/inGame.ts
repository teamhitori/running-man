import { IFrontendApi } from "@frakas/api/public";
import { ArcRotateCamera, Axis, Color3, Color4, KeyboardEventTypes, Matrix, PointerEventTypes, Scene, Space, SpotLight, StandardMaterial, Vector2, Vector3 } from "babylonjs";
import { SceneType } from "../../documents/SceneType";
import { initMyPlayer, IPlayer } from "./player";
import { IGameScene } from "./gameScene";
import { IArena } from "./arena";
import { filter, Subject, Subscription, bufferTime, tap, map, mergeMap, from } from "rxjs";
import { BallState, PlayerState } from "../../documents/common";
import { gameEnterEvent } from "../../documents/Events/gameEnterEvent";
import { gameSnapshotEvent, playerSnapshot } from "../../documents/Events/gameSnapshotEvent";
import { mergeObj } from "../utils/mergeObj";
import { EventTypeOut, IEvent } from "../../documents/Event";
import { IObservable } from "rx";
import { GameState } from "../be/gameState";

export class inGame {

    private _players: { [gamePosition: number]: IPlayer } = {}
    private _playerSnapshots: { [gamePosition: number]: playerSnapshot[] } = {}
    private _myGamePosition: number | undefined;
    private _logSubject = new Subject<[topic: string, value: { [key: string]: any }]>();
    private _trigger = false;

    constructor(private _gameScene: Scene, _api: IFrontendApi, private _arena: IArena, gameLoop: Subject<void>, gameEnterEvent: gameEnterEvent) {

        // console.log("OnEnterGame", gameEnterEvent);

        this._myGamePosition = gameEnterEvent.myGamePosition;

        this._players = _arena.players;

        this._setupPlayers(gameEnterEvent);

        var blockUserEvents = false;

        if(this._myGamePosition != undefined) {
            initMyPlayer(_gameScene, _api, this._players[this._myGamePosition])
            .pipe(
                tap(snapshot => {
                    if (!blockUserEvents && this._myGamePosition!= undefined) {
                        this._playerSnapshots[this._myGamePosition].push(snapshot)
                    }
                })

            )
            .subscribe()

        }


        _api.onPublicEvent<IEvent>()
            .pipe(
                filter(e => e.type == EventTypeOut.gameSnapshot),
                map(e => e.data as gameSnapshotEvent),
                tap(snapshot => {

                    for (const gamePosition in snapshot.players) {
                        const snapshots = snapshot.players[gamePosition];

                        for (const s of snapshots) {
                            if (s.force) {
                                // console.log(`> gamePlayer[${gamePosition}] ${PlayerState[s.playerState!!]}`, s);
                            }
                        }

                        if (+gamePosition == this._myGamePosition) {
                            for (const s of snapshots) {

                                if (s.force) {
                                    blockUserEvents = true;
                                } else {
                                    blockUserEvents = false;
                                    s.playerState = undefined;
                                }
                            }
                        }

                        this._playerSnapshots[gamePosition].push(...snapshots);
                    }

                }),
                // audit
                mergeMap(snapshot => {
                    return from(snapshot.players[0]);
                }),
                // bufferTime(1000),
                // tap(events => console.log(`EventsIn: ${events.length}`))
            ).subscribe();


        _gameScene.onBeforeRenderObservable.add(async () => {

            for (const gamePosition in this._playerSnapshots) {

                var snapshot = this._playerSnapshots[gamePosition].shift()!!;

                while (this._playerSnapshots[gamePosition].length > 15) {
                    var ms: any = this._playerSnapshots[gamePosition].shift()!!;

                    for (const key in ms) {
                        if (ms[key] != undefined) {
                            (snapshot as any)[key] = ms[key]
                        }
                    }
                }

                if (!snapshot) continue;

                var player = this._players[gamePosition]!!;

                if (+gamePosition == 0 && this._trigger) {
                    this._trigger = false
                    // console.log(gamePosition, PlayerState[player.playerState], snapshot, this._playerSnapshots[gamePosition])
                }

                snapshot.ballPosition = snapshot.ballPosition ?? new Vector2(player.ball.mesh.position.x, player.ball.mesh.position.z);
                snapshot.ballState = snapshot.ballState ?? player.ball.ballState;
                //snapshot.hasBallIndex = snapshot.hasBallIndex;
                snapshot.orientationY = snapshot.orientationY ?? player.model.rootNodes[0].rotation.y;
                snapshot.playerGameState = snapshot.playerGameState ?? player.playerGameState;
                snapshot.playerState = snapshot.playerState ?? player.playerState;
                snapshot.position = snapshot.position ?? new Vector2(player.model.rootNodes[0].position.x, player.model.rootNodes[0].position.z)

                if (snapshot?.hasBallIndex != undefined) {
                    var hasBall = this._players[snapshot.hasBallIndex]!!.ball;
                    player.hasBall = hasBall;
                } else {
                    player.hasBall = undefined;
                }


                if (+gamePosition != this._myGamePosition || snapshot.force) {

                    player.model.rootNodes[0].position.x = snapshot.position?.x;
                    player.model.rootNodes[0].position.z = snapshot.position?.y;
                    player.model.rootNodes[0].rotation = new Vector3(0, snapshot.orientationY, 0);
                }

                // update balls
                if (this._myGamePosition && this._players[this._myGamePosition].hasBall?.playerRef != +gamePosition) {
                    player.ball.mesh.position.x = snapshot!!.ballPosition.x;
                    player.ball.mesh.position.z = snapshot!!.ballPosition.y;
                }

                player.ball.ballState = snapshot.ballState;

                if (player.ball.ballState == BallState.free) {
                    var groundHeight = _arena.ground.getHeightAtCoordinates(player.ball.mesh.position.x, player.ball.mesh.position.z);
                    player.ball.mesh.position.y = groundHeight + 0.25;
                }


                var groundHeight = _arena.ground.getHeightAtCoordinates(player.model.rootNodes[0].position.x, player.model.rootNodes[0].position.z);


                // player.spotLight.position.x = player.model.rootNodes[0].position.x;
                // player.spotLight.position.z = player.model.rootNodes[0].position.z;


                if (player.hasBall) {

                    player.hasBall.mesh.position = new Vector3(player.model.rootNodes[0].position.x, player.model.rootNodes[0].position.y + 1, player.model.rootNodes[0].position.z);

                    // console.log(`player-${gamePosition} has ball ${player.hasBall.playerRef}`, player.hasBall.mesh.position);

                }

                if (player.playerState == PlayerState.falling) {

                    player.model.rootNodes[0].position.y -= 0.2;

                } else {
                    player.model.rootNodes[0].position.y = groundHeight;
                }

                if (snapshot.playerState != player.playerState || player.celebrateImpulse == 1) {

                    // console.log(`GamePlayer[${gamePosition}] ChangeState:${PlayerState[snapshot.playerState]}`, snapshot);

                    if (player.celebrateImpulse > 0) {
                        // console.log(`Player-${player.gamePosition} victory-impulse: ${player.celebrateImpulse}`);
                        player.model.animationGroups.forEach(f => f.stop());
                        var anim = player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-victory`)?.start(true, 1.0);
                        player.celebrateImpulse -= 0.05;
                    } else {

                        switch (snapshot.playerState) {
                            case PlayerState.falling:
                                player.model.animationGroups.forEach(f => f.stop());
                                player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-falling`)?.start(true, 1.0);
                                break;
                            case PlayerState.flying:
                                player.model.animationGroups.forEach(f => f.stop());
                                player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-falling`)?.start(true, 1.0);
                                break;
                            case PlayerState.celebrating:
                                player.model.animationGroups.forEach(f => f.stop());
                                player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-victory`)?.start(true, 1.0);
                                break;
                            case PlayerState.running:
                                player.model.animationGroups.forEach(f => f.stop());
                                player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-running`)?.start(true, 1.0);
                                break;
                            case PlayerState.idle:
                                player.model.animationGroups.forEach(f => f.stop());
                                player.model.animationGroups.find(f => f.name == `player-${player.gamePosition}-idle`)?.start(true, 1.0);
                                break;
                        }

                    }

                    player.playerState = snapshot.playerState;
                }

                //console.log(gamePosition, PlayerState[snapshot.playerState]);
            }
        });


        this._logSubject
            .pipe(
                bufferTime(5000),
                filter(logs => logs.length > 0),
                tap(logs => {
                    var logObjs: any = {};

                    for (const log of logs) {
                        var [key, value] = log;
                        var obj = logObjs[key] ? logObjs[key] : {}
                        obj = mergeObj(obj, value);
                        logObjs[key] = obj;
                    }

                    for (const key in logObjs) {
                        const element = logObjs[key];
                        // console.log(key, element);
                    }
                })
            )
            .subscribe();
    }

    private _setupPlayers(event: gameEnterEvent) {

        for (const gamePosition in this._players) {
            var player = this._players[gamePosition];

            player.playerState = PlayerState.idle;
            player.ball.material.alpha = 0;
            player.material.alpha = 0;
            player.homeZone.mesh.material!!.alpha = 0;
            player.ball.ballState = BallState.disabled;

            this._playerSnapshots[gamePosition] = [];

        }

        for (var playerConfig of event.players) {

            var player = this._players[playerConfig.gamePosition];

            // console.log(`Creating player`, playerConfig.gamePosition, playerConfig);

            player.model.rootNodes[0].position = new Vector3(playerConfig.homePosition.x, 0, playerConfig.homePosition.y)
            player.homeZone.mesh.position = player.model.rootNodes[0].position;
            player.homeZone.spotLight.position = player.homeZone.mesh.position

            player.ball.mesh.position = new Vector3(playerConfig.ballStartPosition.x, 0, playerConfig.ballStartPosition.y);

            var groundHeight = this._arena.ground.getHeightAtCoordinates(player.ball.mesh.position.x, player.ball.mesh.position.z);

            player.ball.mesh.position.y = groundHeight + 0.25;

            player.ball.material.alpha = 1;
            player.material.alpha = 1;
            player.homeZone.mesh.material!!.alpha = 0.5;

            player.ball.material.diffuseColor = playerConfig.color;
            (player.homeZone.mesh.material as StandardMaterial)!!.diffuseColor = playerConfig.color;
            // console.log("playerConfig.color", playerConfig.color)
            //player.spotLight.diffuse = new Color3(playerConfig.color.r, playerConfig.color.g, playerConfig.color.b);

            // player.spotLight.position = new Vector3(0, 3, playerConfig.gamePosition);

            //player.homeZone.spotLight.intensity = 0.6;
            //player.spotLight.intensity = 0.6
            player.ball.spotLight.intensity = 1;

            //console.log(`player-${playerConfig.gamePosition} spotlight`, player.spotLight);


            this._players[playerConfig.gamePosition] = player;

            // console.log(`player-${player.gamePosition}`,
            //     player.model.rootNodes[0].position,
            //     player.ball.mesh.position,
            //     player.model.rootNodes[0].getChildMeshes()[0].getBoundingInfo().boundingBox.centerWorld,
            //     player.ball.mesh.getBoundingInfo().boundingBox.centerWorld);
        }

        if(this._myGamePosition != undefined) {
            (this._gameScene.activeCamera!! as ArcRotateCamera).lockedTarget = this._players[this._myGamePosition!!].model.rootNodes[0];
            (this._gameScene.activeCamera!! as ArcRotateCamera).inputs.clear();
        }
        
        this._gameScene.activeCamera!!.minZ = 0.1

    }
}