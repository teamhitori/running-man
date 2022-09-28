import { IBackendApi, PlayerEventContent } from "@frakas/api/public";
import { BoundingInfo, Color3, MeshBuilder, NullEngine, Scene, Vector2, Vector3 } from "babylonjs";
import { interval, Subject, tap } from "rxjs";
import { BallState, PlayerGameState, PlayerState } from "../../documents/common";
import { EventTypeIn, EventTypeOut, IEvent } from "../../documents/Event";
import { gameEnterEvent, playerSetup } from "../../documents/Events/gameEnterEvent";
import { gameSnapshotEvent, playerSnapshot } from "../../documents/Events/gameSnapshotEvent";
import { playerActionEvent } from "../../documents/Events/playerActionEvernt";
import { IBall } from "./ball";
import { GameState } from "./gameState";
import { IHomeZone } from "./homeZone";
import { IPlayer } from "./player";
import { updateWaitingEvent } from "../../documents/Events/updateWaitingEvent";
import { createPlayerEvent } from "../../documents/Events/createPlayerEvent";

var ___maxPlayerCount = 6;
var __timeout_create_game = 20;
var __timeout_wait_players = 60;

const ballImpulseDim = 0.025;
const ballThrowFac = 0.5;
const ballBounceFac = 0.15;
const playerFlyFac = 0.25;

const mapSize = 7;

const flyingImpulseDim = 0.05;
const fallingImpulseDim = 0.01;

const fallFac = 0.3;
export class babylonSceneServer {

    private _engine = new NullEngine();
    private _scene = new Scene(this._engine);
    private _events: (PlayerEventContent<IEvent> | IEvent)[] = [];
    private _requestEnterQueue: { playerPosition: number, playerName: string }[] = [];
    private _gamePlayers: IPlayer[] = [];
    private _gamePositionRef: { [playerPosition: number]: number | undefined } = {};

    private _logSubject = new Subject<[topic: string, value: { [key: string]: any }]>();
    private _complete: number[] = [];

    private _currentGameState: GameState = GameState.noGame;

    private _colorList: [name: string, color: Color3][] = [
        ["blue", new Color3(0, 0, 1)],
        ["red", new Color3(1, 0, 0)],
        ["green", new Color3(0, 1, 0)],
        ["white", new Color3(1, 1, 1)],
        ["yellow", new Color3(1, 1, 0)],
        ["purple", new Color3(0.8, 0, 1)],
    ];

    private _timerCreateGame: number = 0;
    private _timerWaitPlayers: number = 0;
    private _timerGameOver: number = 0;
    private _timerStart: number = 0;
    private _timerGame: number = 120;
    private _createGamePlayerPosition: number | undefined;
    //private _createGamePlayerName: string = "Player One";

    private _playerCount = 0;
    private _allPlayers: playerSetup[] = [];

    constructor(private _api: IBackendApi) {
        this._setup();
        this._init();
    }

    private async _init() {
        this._api.onPlayerEnter()
            .subscribe(playerPosition => {
                this._gamePositionRef[playerPosition] = undefined;
            })

        this._api.onPlayerEvent<IEvent>()
            .subscribe((event) => {
                this._events.push(event);
            });

        this._api.onPlayerExit().subscribe(
            playerPosition => {
                this._events.push({
                    playerPosition: playerPosition,
                    playerState: {
                        type: EventTypeIn.playerExit,
                        data: {}
                    }
                });
            });

        // interval(this.__loop_speed)
        //     .subscribe(() => {

        //         this._preLoopLogic();
        //     });


        interval(1000)
            .pipe(
                tap(_ => {
                    if (this._currentGameState != GameState.creatingGame) return;
                    if (this._timerCreateGame) {
                        this._timerCreateGame--

                        this._api.sendToPlayer<IEvent>({
                            playerPosition: this._createGamePlayerPosition!!,
                            playerState: {
                                type: EventTypeOut.updateCreate,
                                data: {
                                    count: this._timerCreateGame
                                }
                            }
                        });
                    } else {
                        if (!this._events.some(x => (x as IEvent).type == EventTypeIn.timeoutCreate)) {
                            this._events.push(<IEvent>{
                                type: EventTypeIn.timeoutCreate,
                                data: {}
                            })
                        }
                    }

                }),
                tap(_ => {
                    if (this._currentGameState != GameState.gameInProgress) return;
                    if (this._timerGame) {
                        this._timerGame--;
                    } else {
                        // console.log("timeout game")
                        if (!this._events.some(x => (x as IEvent).type == EventTypeIn.timeoutGame)) {
                            this._events.push(<IEvent>{
                                type: EventTypeIn.timeoutGame,
                                data: {}
                            })
                        }
                    }
                }),
                tap(_ => {
                    if (this._currentGameState != GameState.gameOver) return;
                    if (this._timerGameOver) {
                        this._timerGameOver--;
                    } else {
                        // console.log("timeouot gameover")
                        if (!this._events.some(x => (x as IEvent).type == EventTypeIn.timeoutGameOver)) {
                            this._events.push(<IEvent>{
                                type: EventTypeIn.timeoutGameOver,
                                data: {}
                            })
                        }
                    }
                }),
                tap(_ => {
                    if (this._currentGameState != GameState.gameStart) return;
                    if (this._timerStart) {
                        this._timerStart--;
                    } else {
                        // console.log("timeouot gameStart")
                        if (!this._events.some(x => (x as IEvent).type == EventTypeIn.timeoutGameStart)) {
                            this._events.push(<IEvent>{
                                type: EventTypeIn.timeoutGameStart,
                                data: {}
                            })
                        }
                    }
                }),
                tap(_ => {
                    if (this._currentGameState != GameState.watingForPlayers) return;
                    if (this._timerWaitPlayers) {
                        this._timerWaitPlayers--

                        // ("updatePlayers", this._gamePositionRef);

                        for (const playerPosition in this._gamePositionRef) {

                            var myGamePosition = this._gamePositionRef[playerPosition];

                            if (myGamePosition == undefined) continue;

                            var event = <updateWaitingEvent>{
                                players: this._gamePlayers.filter(f => f.playerGameState == PlayerGameState.ready).map(m => { return { name: m.playerName, color: m.colorName } }),
                                maxPlayers: this._playerCount,
                                countDown: this._timerWaitPlayers,
                                myPlayerColorName: this._gamePlayers[myGamePosition]?.colorName ?? 'blue'
                            };

                            //console.log("updateWaitingEvent", event)

                            this._api.sendToPlayer<IEvent>({
                                playerPosition: +playerPosition,
                                playerState: {
                                    type: EventTypeOut.updateAwaitPlayers,
                                    data: event
                                }
                            });

                        }
                    } else {
                        if (!this._events.some(x => (x as IEvent).type == EventTypeIn.timeoutCreate)) {
                            this._events.push(<IEvent>{
                                type: EventTypeIn.timeoutCreate,
                                data: {}
                            })
                        }
                    }
                })
            )
            .subscribe();
    }

    _setup() {
        this._scene.createDefaultCamera();


        this._createPlayers(___maxPlayerCount);

        // Babylonjs render loop
        this._engine.runRenderLoop(() => {
            this._scene?.render();
            this._loopLogic();
        });
    }

    _loopLogic = () => {

        var gameSnapshot = <gameSnapshotEvent>{
            players: {},
            gameTimer: this._timerGame
        }

        for (const playerPosition in this._gamePositionRef) {

            var gamePosition = this._gamePositionRef[playerPosition];

            if (gamePosition == undefined) continue;

            var player = this._gamePlayers[gamePosition];

            player.force = false;

            gameSnapshot.players[gamePosition] = [];
        }

        while (this._events.length) {
            var rawEvent = this._events[0];
            var playerEvent = rawEvent as PlayerEventContent<IEvent>;
            var event = rawEvent as IEvent;

            if (playerEvent.playerPosition != undefined) {
                switch (playerEvent!!.playerState.type) {
                    case EventTypeIn.playerStart:
                        // console.log("EventType.enter", playerEvent);
                        this._playerPressStart(playerEvent!!.playerPosition);
                        break;
                    case EventTypeIn.playerExit:
                        // console.log("EventType.exit", event);
                        this._playerExit(playerEvent!!.playerPosition);
                        break;
                    case EventTypeIn.requestEnterGame:
                        // console.log("EventType.requestEnterGame", event);
                        this._playerRequestEnterGame(playerEvent!!.playerPosition, playerEvent!!.playerState.data.playerName);
                        break;
                    case EventTypeIn.requestStartGame:
                        // console.log("EventType.requestStart", event);
                        this._startGame(playerEvent!!.playerPosition);
                        break;
                    case EventTypeIn.playerAction:
                        //  console.log("EventType.playerAction", event!!.playerState.data);
                        this._setPlayerState(playerEvent!!.playerPosition, playerEvent!!.playerState.data);
                        this._gameEventLogic();
                        this._updateSnapshot(playerEvent!!.playerPosition, gameSnapshot);
                        break;
                    case EventTypeIn.playerThrow:
                        this._throwBall(playerEvent!!.playerPosition);
                        this._gameEventLogic();
                        this._updateSnapshot(playerEvent!!.playerPosition, gameSnapshot);
                        break;
                    // case EventTypeIn.requestCreate:
                    //     this._requestCreate(playerEvent!!.playerPosition, playerEvent.playerState.data)

                        break;
                }
            } else if (event) {

                switch (event.type) {
                    case EventTypeIn.timeoutAwaitPlayer:
                        break;
                    case EventTypeIn.timeoutCreate:
                        this._showIntro()
                        break;
                    case EventTypeIn.timeoutEnter:
                        break;
                    case EventTypeIn.timeoutGame:
                        this._currentGameState = GameState.gameOver;
                        break;
                    case EventTypeIn.timeoutGameOver:
                        this._showIntro()
                        break;
                    case EventTypeIn.timeoutGameStart:
                        this._currentGameState = GameState.gameInProgress
                        break;

                }

            }

            this._events.shift();
        }

        this._gameLogicUpdate(gameSnapshot);

        if (Object.keys(gameSnapshot.players)?.length) {

            for (const gamePosition in gameSnapshot.players) {
                const snapshots = gameSnapshot.players[gamePosition];

                snapshots.forEach(s => {

                    // if(s.force) {
                    //     console.log("***", s);
                    // }

                    // this._logSubject.next([`GameSnapshot`, {
                    //     ">": [`player-${gamePosition}`, "x", s.position.x.toFixed(1), s.position.y.toFixed(1), `p-state:${PlayerState[s.playerState]}`,
                    //     s.ballPosition.x.toFixed(1), s.ballPosition.y.toFixed(1), BallState[s.ballState]]
                    // }]);
                })
            }

            this._api.sendToAll<IEvent>({
                type: EventTypeOut.gameSnapshot,
                data: gameSnapshot
            });
        }
    }

    _gameLogicUpdate(gameSnapshot: gameSnapshotEvent) {
        for (const playerPosition in this._gamePositionRef) {

            var gamePosition = this._gamePositionRef[playerPosition];

            if (gamePosition == undefined) continue;

            var player = this._gamePlayers[gamePosition];

            if (player.playerState == PlayerState.flying) {
                player.force = true;
                player.flyingImpulse -= flyingImpulseDim;

                player.mesh.position.x -= Math.cos(player.flyingImpulseY) * playerFlyFac;
                player.mesh.position.z += Math.sin(player.flyingImpulseY) * playerFlyFac;

                if (player.flyingImpulse <= 0) {
                    player.playerState = PlayerState.idle;
                }
            }

            if (player.playerState == PlayerState.falling) {
                player.force = true;
                player.fallingImpulse -= fallingImpulseDim;
                player.playerGameState = PlayerGameState.ready;
                player.mesh.position.y -= fallFac;

                if (player.fallingImpulse <= 0) {

                    player.playerState = PlayerState.idle;
                    player.mesh.position = player.homeZone.mesh.position.clone();
                    player.force = true;

                    // console.log(`Player-${gamePosition} STOP falling ${player.fallingImpulse}!!`, player.mesh.position, PlayerState[player.playerState]);
                }
            }

            // update balls
            if (player.ball.mesh.position.x > mapSize) {
                player.force = true;
                player.ball.mesh.position.x = mapSize - 0.5;
                player.ball.impulse = 0;
            }
            if (player.ball.mesh.position.x < -mapSize) {
                player.force = true;
                player.ball.mesh.position.x = -mapSize + 0.5;
                player.ball.impulse = 0;
            }
            if (player.ball.mesh.position.z > mapSize) {
                player.force = true;
                player.ball.mesh.position.z = mapSize - 0.5;
                player.ball.impulse = 0;
            }
            if (player.ball.mesh.position.z < -mapSize) {
                player.force = true;
                player.ball.mesh.position.z = -mapSize + 0.5;
                player.ball.impulse = 0;
            }

            if (player.ball.ballState == BallState.thrown || player.ball.ballState == BallState.flying) {

                player.force = true;
                player.ball.impulse -= ballImpulseDim;

                var ballMoveFactor = player.ball.ballState == BallState.thrown ? ballThrowFac : ballBounceFac;

                if (player.ball.impulse > 0) {
                    player.ball.mesh.position.x -= Math.cos(player.ball.rotationY) * ballMoveFactor;
                    player.ball.mesh.position.z += Math.sin(player.ball.rotationY) * ballMoveFactor;

                    //this._logSubject.next([`Ball-${player.ball.playerRef}`, { "impulse": player.ball.impulse, rotation: player.ball.rotationY, cos: Math.cos(player.ball.rotationY), sin: Math.sin(player.ball.rotationY), x: player.ball.mesh.position.x, z: player.ball.mesh.position.z }]);
                } else {
                    // console.log(`Ball stopped`);
                    player.ball.ballState = BallState.free;
                }
            }

            if (player.force) {
                gameSnapshot.players[gamePosition] = [];

                this._updateSnapshot(+playerPosition, gameSnapshot);
            }
        }

        gameSnapshot.gameState = this._currentGameState;

    }

    _gameEventLogic() {

        for (const playerPosition in this._gamePositionRef) {

            var gamePosition = this._gamePositionRef[playerPosition];

            if (gamePosition == undefined) continue;

            gamePosition = gamePosition!!;

            var player = this._gamePlayers[gamePosition];

            if (player.force) continue;

            if (player.hasBall) {
                player.hasBall.mesh.position = new Vector3(player.mesh.position.x, player.mesh.position.y + 1, player.mesh.position.z);

                // console.log(`player-${gamePosition} has ball ${player.hasBall.playerRef}`, player.hasBall.mesh.position)
            }

            var isBaseTouch = player.mesh.intersectsMesh(player.homeZone.mesh);

            var boxInfo = player.mesh.getBoundingInfo();

            // this._logSubject.next([`player-${gamePosition}`, {
            //     "position": [player.mesh.position.x.toFixed(1), player.mesh.position.y.toFixed(1), player.mesh.position.z.toFixed(1), PlayerState[player.currentState]],
            //     //"b-min": [boxInfo.boundingBox.minimumWorld.x.toFixed(1), boxInfo.boundingBox.minimumWorld.y.toFixed(1), boxInfo.boundingBox.minimumWorld.z.toFixed(1)],
            //     //"b-max": [boxInfo.boundingBox.maximumWorld.x.toFixed(1), boxInfo.boundingBox.maximumWorld.y.toFixed(1), boxInfo.boundingBox.maximumWorld.z.toFixed(1)],
            //     "ball-position": [player.ball.mesh.position.x.toFixed(1), player.ball.mesh.position.y.toFixed(1), player.ball.mesh.position.z.toFixed(1), BallState[player.ball.ballState]]
            // }]);

            var data: any[] = [];
            data.push(...["x", player.mesh.position.x.toFixed(1), player.mesh.position.z.toFixed(1),
                "l", boxInfo.boundingBox.minimumWorld.x.toFixed(1), boxInfo.boundingBox.minimumWorld.y.toFixed(1), boxInfo.boundingBox.minimumWorld.z.toFixed(1),
                "u", boxInfo.boundingBox.maximumWorld.x.toFixed(1), boxInfo.boundingBox.maximumWorld.y.toFixed(1), boxInfo.boundingBox.maximumWorld.z.toFixed(1)],
                `p-state:${PlayerState[player.playerState]}`);

            // check collisions
            for (const otherPlayerGamePosition in this._gamePlayers) {

                var otherPlayer = this._gamePlayers[otherPlayerGamePosition];

                if (otherPlayer.playerGameState == PlayerGameState.disabled) {
                    continue;
                }

                var isballtouch = player.mesh.intersectsMesh(otherPlayer.ball.mesh);

                data.push(...[otherPlayer.ball.mesh.position.x.toFixed(1), otherPlayer.ball.mesh.position.z.toFixed(1), BallState[otherPlayer.ball.ballState], isballtouch]);

                if (isballtouch) {
                    //this._logSubject.next([`player:${gamePosition} touching player ball:${otherPlayerGamePosition}!!`, { ballstate: BallState[otherPlayer.ball.ballState], playerState: PlayerState[player.currentState] }]);

                    switch (otherPlayer.ball.ballState) {
                        case BallState.free:
                            if (!player.hasBall && (player.playerState == PlayerState.running || player.playerState == PlayerState.idle)) {
                                // console.log(`player ${gamePosition} has ball ${otherPlayerGamePosition}!!`);
                                player.hasBall = otherPlayer.ball;
                                otherPlayer.ball.ballState = BallState.held;

                                if (player.playerPosition == otherPlayer.playerPosition) {
                                    player.playerGameState = PlayerGameState.collected;

                                    // console.log(`Player-${player.playerPosition}`, PlayerGameState[player.playerGameState]);
                                }

                            }
                            break;
                        case BallState.held:
                            break;
                        case BallState.thrown:

                            // console.log([`player-${gamePosition} hit`, { ball: otherPlayerGamePosition, thrown: otherPlayer.ball.thrownBy, currentState: PlayerState[player.playerState], iThrew: +gamePosition == +otherPlayer.ball.thrownBy }]);

                            if ((player.playerState == PlayerState.idle || player.playerState == PlayerState.running) && !(+gamePosition == +otherPlayer.ball.thrownBy)) {
                                player.playerState = PlayerState.flying;
                                player.flyingImpulse = 1;
                                player.flyingImpulseY = otherPlayer.ball.rotationY;

                                this._gamePlayers[otherPlayer.ball.thrownBy].victoryImpulse = 1;

                                otherPlayer.ball.ballState = BallState.free
                                otherPlayer.ball.impulse = 0;

                                player.playerGameState = PlayerGameState.ready;

                                if (player.hasBall) {
                                    var ball = player.hasBall;
                                    player.hasBall = undefined;

                                    ball.ballState = BallState.flying
                                    ball.impulse = 1;
                                    ball.rotationY = otherPlayer.ball.rotationY + Math.PI / 2;

                                    player.force = true;

                                }
                            }
                            break;
                    }
                }
            }

            data.push(`p-state:${PlayerState[player.playerState]}`);

            // this._logSubject.next([`player-${gamePosition}`, {
            //     "data": data
            // }]);

            // check Win condition
            if (isBaseTouch && player.hasBall?.playerRef == gamePosition) {

                if (!this._complete.filter(p => p == gamePosition).length) {

                    player.victoryImpulse = 1;
                    player.playerState = PlayerState.celebrating;
                    player.playerGameState = PlayerGameState.win;
                    player.force = true;

                    this._complete.push(gamePosition);

                    // console.log(`player-${gamePosition} has just won!!`, this._playerCount, this._complete.length);

                    if (this._playerCount - this._complete.length <= 1) {
                        this._currentGameState = GameState.gameOver;
                        this._timerGameOver = 5;
                    }
                }
            }


            if (player.mesh.position.x > (mapSize + 0.5) || player.mesh.position.x < -(mapSize + 0.5) ||
                player.mesh.position.z > (mapSize + 0.5) || player.mesh.position.z < -(mapSize + 0.5)) {

                if (player.hasBall) {
                    player.hasBall.ballState = BallState.free;
                }

                player.hasBall = undefined;

                if (player.playerState != PlayerState.falling) {
                    player.fallingImpulse = 1;
                }

                player.playerState = PlayerState.falling;
                player.force = true;
            }
        }
    }

    _setPlayerState(playerPosition: number, playerAction: playerActionEvent) {

        var gamePosition = this._gamePositionRef[playerPosition];

        if (gamePosition == undefined) return;
        if (this._currentGameState != GameState.gameInProgress) return;

        gamePosition = gamePosition!!;

        var player = this._gamePlayers[gamePosition];

        if (player.playerGameState == PlayerGameState.disabled || player.playerGameState == PlayerGameState.exited || player.playerGameState == PlayerGameState.win) return;

        if ((playerAction.playerState == PlayerState.idle || playerAction.playerState == PlayerState.running) &&
            (player.playerState == PlayerState.idle || player.playerState == PlayerState.running)) {

            if (Math.pow(player.mesh.position.x - playerAction.position.x, 2) + Math.pow(player.mesh.position.z - playerAction.position.y, 2) > 1) {

                // console.log(`Player-${player.playerPosition} invalid move`, player.mesh.position, playerAction.position);

                player.force = true;
                return;
            } else {

                player.mesh.position.x = playerAction.position.x;
                player.mesh.position.z = playerAction.position.y;
                player.mesh.rotation = new Vector3(0, playerAction.orientationY, 0)
                player.playerState = playerAction.playerState;
            }
        }
    }

    _updateSnapshot(playerPosition: number, gameSnapshot: gameSnapshotEvent) {

        var gamePosition = this._gamePositionRef[playerPosition];

        if (gamePosition == undefined) return;

        gamePosition = gamePosition!!;

        const player = this._gamePlayers[gamePosition];

        if (!player) {
            // console.log(`player[p:${playerPosition}] not in game`);
            return;
        }

        var playerSnapshot = <playerSnapshot>{
            position: new Vector2(player.mesh.position.x, player.mesh.position.z),
            orientationY: player.mesh.rotation.y,
            playerState: player.playerState,
            playerGameState: player.playerGameState,
            hasBallIndex: player!!.hasBall?.playerRef,
            ballPosition: new Vector2(player.ball.mesh.position.x, player.ball.mesh.position.z),
            ballState: player.ball.ballState,
            force: player.force
        }

        if (!gameSnapshot.players[gamePosition]) {
            gameSnapshot.players[gamePosition] = []
        }

        gameSnapshot.players[gamePosition].push(playerSnapshot);

        // if(player.force) {
        //     console.log(`Force gamePosition:${gamePosition}`, gameSnapshot.players[gamePosition]);
        // }
    }

    _playerPressStart(playerPosition: number) {

        // console.log(`_playerStart ${playerPosition}`, GameState[this._currentGameState]);

        switch (this._currentGameState) {
            case GameState.noGame:
                this._showCreateGame(playerPosition)
                break;
            case GameState.creatingGame:
                this._showCreatePlayer(playerPosition);
                break;
            case GameState.watingForPlayers:
                this._showNewPlayer(playerPosition);
                break;
            case GameState.gameStart:
            case GameState.gameInProgress:
                this._api.sendToPlayer<IEvent>({
                    playerPosition: +playerPosition,
                    playerState: {
                        type: EventTypeOut.showGameInProgress,
                        data: <gameEnterEvent>{
                            players: this._allPlayers

                        }
                    }
                });
                break;
            default:
                break;
        }

    }

    _showNewPlayer(playerPosition: number) {

        this._api.sendToPlayer<IEvent>({
            playerPosition: playerPosition,
            playerState: {
                type: EventTypeOut.showCreatePlayer,
                data: <createPlayerEvent>{
                    isGameCreator: false
                }
            }
        });
    }

    _showIntro() {

        console.log("_showIntro")
        this._currentGameState = GameState.noGame;

        for (const playerPosition in this._gamePositionRef) {
            this._api.sendToPlayer<IEvent>({
                playerPosition: +playerPosition,
                playerState: {
                    type: EventTypeOut.showIntro,
                    data: {}
                }
            });
        }

        this._resetGame();
    }

    _showAwaitCreateGame(myPlayerPosition: number) {
        this._api.sendToPlayer<IEvent>({
            playerPosition: myPlayerPosition,
            playerState: {
                type: EventTypeOut.showAwaitCreate,
                data: {}
            }
        });
    }

    _showCreatePlayer(myPlayerPosition: number) {
        this._api.sendToPlayer<IEvent>({
            playerPosition: myPlayerPosition,
            playerState: {
                type: EventTypeOut.showCreatePlayer,
                data: <createPlayerEvent>{
                    isGameCreator: false
                }
            }
        });
    }

    _showCreateGame(myPlayerPosition: number) {
        this._currentGameState = GameState.creatingGame;

        this._timerCreateGame = __timeout_create_game;
        this._timerWaitPlayers = __timeout_wait_players;
        this._requestEnterQueue = [];
        for (const playerPosition in this._gamePositionRef) {
            this._gamePositionRef[playerPosition] = undefined;
        }

        this._resetGame();

        this._currentGameState = GameState.watingForPlayers;

        while (this._requestEnterQueue.length) {
            var q = this._requestEnterQueue.shift()!!;

            this._playerRequestEnterGame(q.playerPosition, q.playerName);
        }

        this._api.sendToPlayer<IEvent>({
            playerPosition: myPlayerPosition,
            playerState: {
                type: EventTypeOut.showCreatePlayer,
                data: <createPlayerEvent>{
                    isGameCreator: true
                }
            }
        });
    }

    _playerExit(playerPosition: number) {

        

        // delete this._gamePositionRef[playerPosition];

        // console.log(`Player-${playerPosition} Exited, createGamePlayerPosition: ${this._createGamePlayerPosition} remaining players:`, this._gamePositionRef);

        switch (this._currentGameState) {
            case GameState.noGame:
                break;
            case GameState.watingForPlayers:
            case GameState.creatingGame:

                if (playerPosition == this._createGamePlayerPosition) {
                    this._showIntro();

                } else {

                    for (const playerPosition in this._gamePositionRef) {

                        var myGamePosition = this._gamePositionRef[playerPosition];

                        if (myGamePosition == undefined) continue;

                        this._api.sendToPlayer<IEvent>({
                            playerPosition: +playerPosition,
                            playerState: {
                                type: EventTypeOut.updateAwaitPlayers,
                                data: <updateWaitingEvent>{
                                    players: this._gamePlayers.filter(f => f.playerGameState == PlayerGameState.ready).map(m => { return { name: m.playerName, color: m.colorName } }),
                                    maxPlayers: this._playerCount,
                                    countDown: this._timerWaitPlayers,
                                    myPlayerColorName: this._gamePlayers[myGamePosition]?.colorName ?? 'blue'
                                }
                            }
                        });
                    }

                }
                break;
            case GameState.gameInProgress:
            case GameState.gameStart:

                var gamePosition = this._gamePositionRef[playerPosition];

                if (gamePosition == undefined) {
                    // console.log(`Player-${playerPosition} does not exist`);
                    return;
                }
        
                this._gamePlayers[gamePosition].playerGameState = PlayerGameState.disabled;

                this._gamePlayers[gamePosition].playerGameState = PlayerGameState.exited;
                this._gamePlayers[gamePosition].playerState = PlayerState.celebrating;
                this._gamePlayers[gamePosition].force = true;

                break;
            default:
                break;
        }

        // this._resetGame();
    }

    // _requestCreate(playerPosition: number, createGameEvent: createGameEvent) {

    //     console.log(`_requestCreate, createPlayerPosition: ${this._createGamePlayerPosition}, myPlayerPosition: ${playerPosition}`, createGameEvent);

    //     if (playerPosition != this._createGamePlayerPosition) {
    //         console.log("Cannot create game")
    //         return;
    //     }



    // }

    _playerRequestEnterGame(playerPosition: number, playerName: string) {

        if (this._currentGameState != GameState.watingForPlayers) {

            this._requestEnterQueue.push({ playerPosition: playerPosition, playerName: playerName });

            this._showAwaitCreateGame(playerPosition);

            return;
        }

        var existingGamePlayer = this._gamePositionRef[playerPosition] != undefined;
        var gamePosition = this._getNextGamePosition();

        if (gamePosition == undefined) {

            // console.log(`Could not enter game, GamePosition: ${gamePosition}`);

            this._api.sendToPlayer<IEvent>({
                playerPosition: playerPosition,
                playerState: {
                    type: EventTypeOut.showNoEntry,
                    data: {}
                }
            });

            return;
        }

        if(gamePosition == 0){
            this._createGamePlayerPosition = playerPosition;
        }

        var [colorName, color] = this._colorList[gamePosition];

        //console.log(`PlayerList`, this._players);
        // console.log(`player-${playerPosition}[${playerName}] color: `, colorName);

        if (!existingGamePlayer) {

            this._gamePositionRef[playerPosition] = gamePosition;
            this._gamePlayers[gamePosition].color = color;
            this._gamePlayers[gamePosition].colorName = colorName;
            this._gamePlayers[gamePosition].playerName = playerName;
            this._gamePlayers[gamePosition].playerState = PlayerState.idle;
            this._gamePlayers[gamePosition].playerGameState = PlayerGameState.ready;
            this._gamePlayers[gamePosition].playerPosition = playerPosition;
            this._gamePlayers[gamePosition].hasBall = undefined;

            console.log("_playerRef", this._gamePositionRef);
        }


        for (const playerPosition in this._gamePositionRef) {

            var myGamePosition = this._gamePositionRef[playerPosition];

            if (myGamePosition == undefined) continue;

            this._api.sendToPlayer<IEvent>({
                playerPosition: +playerPosition,
                playerState: {
                    type: EventTypeOut.updateAwaitPlayers,
                    data: <updateWaitingEvent>{
                        players: this._gamePlayers.filter(f => f.playerGameState == PlayerGameState.ready).map(m => { return { name: m.playerName, color: m.colorName } }),
                        maxPlayers: this._playerCount,
                        countDown: this._timerWaitPlayers,
                        myPlayerColorName: this._gamePlayers[myGamePosition]?.colorName ?? 'blue'

                    }
                }
            });
        }

    }

    _resetGame() {

        for (const gamePosition in this._gamePlayers) {
            const player = this._gamePlayers[gamePosition];
            player.playerGameState = PlayerGameState.disabled;
        }

        for (const key in this._gamePositionRef) {
            this._gamePositionRef[key] = undefined;
        }

        this._complete = [];
    }

    _startGame(createGamePlayerPosition: number) {

        if (createGamePlayerPosition != this._createGamePlayerPosition) {
            // console.log("This player cannot start game", createGamePlayerPosition)
            return;
        }

        if (this._currentGameState != GameState.watingForPlayers) {
            // console.log("Game Status not ready to start", GameState[this._currentGameState])
            return;
        }

        // if (this._gamePlayers.filter(f => f.playerGameState == PlayerGameState.ready).map(m => m.playerName).length != this._playerCount) {
        //     console.log("Incorrect number of players to start game", this._gamePlayers, this._playerCount)
        //     return;
        // }

        this._currentGameState = GameState.gameStart;
        this._timerStart = 4;
        this._timerGame = 120;

        for (const playerPosition in this._gamePositionRef) {
            var gamePosition = this._gamePositionRef[playerPosition];

            // console.log(`Setup player ${gamePosition}`);

            if (gamePosition == undefined) {
                continue;
            }

            gamePosition = gamePosition!!;

            var player = this._gamePlayers[gamePosition];

            // player.playerPosition = playerPosition;
            player.playerState = PlayerState.idle;

            var arc = 2 * (+gamePosition) * Math.PI / this._playerCount;
            var radius = 4;

            // console.log(`Setup player`, gamePosition, arc, Math.sin(arc), Math.cos(arc));

            // console.log(`_resetGame: gameplayer-${gamePosition}, state: ${PlayerState[player.playerState]}, color: ${player.colorName}`);

            player.mesh.position = new Vector3(Math.sin(arc) * radius, 0, Math.cos(arc) * radius)
            player.homeZone.mesh.position = player.mesh.position.clone();
            player.ball.mesh.position = new Vector3(Math.sin((arc - Math.PI)) * (radius + 2), 0, Math.cos((arc - Math.PI)) * (radius + 2));
            player.ball.ballState = BallState.free;
        }

        this._allPlayers = [];

        for (const gamePosition in this._gamePlayers) {
            const gamePlayer = this._gamePlayers[gamePosition];

            if (gamePlayer.playerGameState != PlayerGameState.disabled) {
                this._allPlayers.push(<playerSetup>{
                    color: gamePlayer.color,
                    colorName: gamePlayer.colorName,
                    gamePosition: +gamePosition,
                    playerName: gamePlayer.playerName,
                    homePosition: new Vector2(gamePlayer.mesh.position.x, gamePlayer.mesh.position.z),
                    ballStartPosition: new Vector2(gamePlayer.ball.mesh.position.x, gamePlayer.ball.mesh.position.z)
                });
            }
        }

        for (const playerPosition in this._gamePositionRef) {
            var gamePosition = this._gamePositionRef[playerPosition];

            if (gamePosition == undefined) {

                this._api.sendToPlayer<IEvent>({
                    playerPosition: +playerPosition,
                    playerState: {
                        type: EventTypeOut.showGameInProgress,
                        data: <gameEnterEvent>{
                            players: this._allPlayers

                        }
                    }
                });
            } else {

                gamePosition = gamePosition!!;

                // console.log(`**send enterGame to player-${playerPosition}`, gamePosition, this._allPlayers);

                this._api.sendToPlayer<IEvent>({
                    playerPosition: +playerPosition,
                    playerState: {
                        type: EventTypeOut.showGame,
                        data: <gameEnterEvent>{
                            myGamePosition: +gamePosition,
                            players: this._allPlayers

                        }
                    }
                });
            }
        }
    }

    _createPlayers(playerCount: number) {

        for (let gamePosition = 0; gamePosition < playerCount; gamePosition++) {

            var playerMesh = MeshBuilder.CreateBox(`player-${gamePosition}-box`, { height: 4, width: 1.5 }, this._scene);

            // console.log(`player-${gamePosition}-homezone-sphere`);

            // create Player Home Zone
            var homeZoneSphere = MeshBuilder.CreateSphere(`player-${gamePosition}-homezone-sphere`, { diameter: 1.25 }, this._scene);
            homeZoneSphere.position.z = 1;

            var homeZone = <IHomeZone>{
                mesh: homeZoneSphere
            }

            // create Player Ball
            var ballSphere = MeshBuilder.CreateSphere(`player-${gamePosition}-ball-sphere`, { diameter: 0.35 }, this._scene);

            let sphereMin = ballSphere.getBoundingInfo().boundingBox.minimum;
            let sphereMax = ballSphere.getBoundingInfo().boundingBox.maximum;

            // console.log("Sphere old bounding", sphereMin, sphereMax);

            let newMin = sphereMin.scale(3);
            let newMax = sphereMax.scale(3)

            // console.log("Sphere new bounding", newMin, newMax);


            ballSphere.setBoundingInfo(new BoundingInfo(newMin, newMax));

            var ball = <IBall>{
                mesh: ballSphere,
                ballState: BallState.disabled,
                playerRef: gamePosition,
                rotationY: 0
            }

            this._gamePlayers[gamePosition] = <IPlayer>{
                mesh: playerMesh,
                homeZone: homeZone,
                ball: ball,
                playerGameState: PlayerGameState.disabled,
            };
        }
    }

    _getNextGamePosition(): number | undefined {

        var allGamePositions = [];
        var takenGamePositions: number[] = [];

        for (let index = 0; index < ___maxPlayerCount; index++) {
            allGamePositions.push(index);
        }

        for (const playerPosition in this._gamePositionRef) {
            var gamePosition = this._gamePositionRef[playerPosition];

            //console.log(">> gamePosition: ", gamePosition);

            if (gamePosition == undefined) {
                //console.log(">>> continue: ", gamePosition ?? -1);
                continue;
            }


            gamePosition = gamePosition!!;

            takenGamePositions.push(gamePosition);
        }

        //console.log(`taken position: `, takenPositions);

        var nextPosition = allGamePositions
            .filter(pos => !takenGamePositions.filter(t => t == pos).length)[0];

        // console.log(`NextGamePosition: ${nextPosition}, taken position: `, takenGamePositions, this._gamePositionRef);

        if(nextPosition != undefined) {
            this._playerCount = takenGamePositions.length + 1
        }

        return nextPosition;
    }

    _throwBall(playerPosition: number) {
        var gamePosition = this._gamePositionRef[playerPosition];

        if (gamePosition == undefined) {
            // console.log(`Player-${playerPosition} does not exist`);
            return;
        }

        if (this._currentGameState != GameState.gameInProgress) return;

        var player = this._gamePlayers[gamePosition];

        if (player.hasBall?.ballState == BallState.held) {
            var ball = player.hasBall;

            player.hasBall = undefined;
            ball.ballState = BallState.thrown;
            ball.thrownBy = gamePosition;
            ball.impulse = 1;
            ball.rotationY = player.mesh.rotation.y - Math.PI / 2;

            player.playerGameState = PlayerGameState.ready;

            //console.log(`player-${gamePosition} threw ball-${ball.playerRef} rotation:${ball.rotationY}`);
        }
    }

}