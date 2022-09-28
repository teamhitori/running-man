import { Animation, Engine, Scene, Vector3, HemisphericLight, ShadowGenerator, MeshBuilder, StandardMaterial, ArcRotateCamera, Matrix, Color3, SceneLoader, AbstractMesh, SpotLight, Texture, PointerInfo, CubeTexture, Color4, BoundingInfo, AnimationGroup, Quaternion, CircleEase, EasingFunction, Material, Vector2, GroundMesh, AssetContainer, Sound } from "babylonjs";
import 'babylonjs-loaders';
import { IFrontendApi } from "@frakas/api/public";

import { IGameScene } from "./gameScene";
import { SceneType } from "../../documents/SceneType";
import { IPlayer } from "./player";
import { IArena } from "./arena";
import { inGame } from "./inGame";
import { filter, interval, map, Subject, take, tap } from "rxjs";
import { IBall } from "./ball";
import { IHomeZone } from "./homeZone";
import { BallState, PlayerGameState, PlayerState } from "../../documents/common";
import { EventTypeIn, EventTypeOut, IEvent } from "../../documents/Event";
import { gameEnterEvent } from "../../documents/Events/gameEnterEvent";
import { requestEnterEvent } from "../../documents/Events/requestEnterEvent";
import { gameSnapshotEvent } from "../../documents/Events/gameSnapshotEvent";
import { initPlayersPanel as initPlayersPanel, gui, initGui, resetGui, setCreateGamePanel, setCreatePanel, setDialogTextPanel, setPlayersPanel, setStartPanel, setWaitingPanel, updatePlayersPanel, updateWaitingPlayers } from "./gui";
import { AdvancedDynamicTexture } from "babylonjs-gui";
import { createGameEvent } from "../../documents/Events/createGameEvent";
import { GameState } from "../be/gameState";
import { updateWaitingEvent } from "../../documents/Events/updateWaitingEvent";

export class babylonSceneClient {
    private _currentSceneType: SceneType = SceneType.None;

    private readonly _canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    private readonly _engine = new Engine(this._canvas, true, { preserveDrawingBuffer: true, stencil: true });
    private _activeScene: Scene | undefined;
    private _introScene: Scene | undefined;
    private _gameScene: Scene | undefined;
    private _gameLoop = new Subject<void>();
    private _nextSceneType: SceneType = SceneType.Intro;
    private _guiIntro: gui | undefined;
    private _guiGame: gui | undefined;
    private _isCreator: boolean = false;
    private _playerName: string = `Player One`;
    private _players: number = 2;
    private _startPressed = false;
    private _arena!: IArena;

    private _start: Sound | undefined = undefined;

    private _colorList: [name: string, color: Color3][] = [
        ["blue", new Color3(0, 0, 1)],
        ["red", new Color3(1, 0, 0)],
        ["green", new Color3(0, 1, 0)],
        ["white", new Color3(1, 1, 1)],
        ["yellow", new Color3(1, 1, 0)],
        ["purple", new Color3(0.8, 0, 1)],
    ];
    private _currentGameState: GameState = GameState.noGame;
    private _timerStart: number = 2;
    private _introPlayerMaterial!: StandardMaterial;
    private _myGamePosition: number | undefined = undefined;

    constructor(private _api: IFrontendApi) {

        // Babylonjs render loop
        this._engine.runRenderLoop(() => {
            this._gameLoop.next();
            this._activeScene?.render();
            this._setScene();
        });

        // the canvas/window resize event handler
        window.addEventListener('resize', () => {
            this._engine.resize();
        });

    }

    public async init() {

        interval(1000)
            .pipe(
                tap(_ => {
                    if (this._currentGameState != GameState.gameStart) return;
                    if (this._timerStart) {
                        this._timerStart--;
                    }
                })
            )
            .subscribe()

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.showCreatePlayer && this._startPressed),
                //tap(e => { console.log("EventType.showCreate", e) }),
                tap(event => {
                    this._isCreator = event.data.isGameCreator;
                    var title = 'Join Game';
                    setCreatePanel(this._guiIntro!!, title);
                })
            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.showAwaitCreate && this._startPressed),
                //tap(e => { console.log("EventType.showAwaitCreate", e) }),
                tap(event => {
                    this._isCreator = false;
                    setDialogTextPanel(this._guiIntro!!, "Please wait", false, true);
                })
            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.updateAwaitPlayers && this._startPressed),
                //tap(e => { console.log("EventType.updateAwaitPlayers", e) }),
                map(e => e.data as updateWaitingEvent),
                tap(event => {
                    updateWaitingPlayers(this._guiIntro!!, event, this._isCreator)
                }),
                tap(e => {
                    this._introPlayerMaterial.diffuseTexture = new Texture(`${this._api.assetsRoot}/man-${e.myPlayerColorName}.png`, this._introScene);
                })
            ).subscribe();


        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.showIntro),
                //tap(e => { console.log("EventType.showIntro", e) }),
                tap(event => {
                    this._startPressed = false;
                    this._nextSceneType = SceneType.Intro;
                    setStartPanel(this._guiIntro!!);
                })
            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.updateCreate && this._startPressed),
                //tap(e => { console.log("EventType.updateCreate", e) }),
                tap(event => {

                    if (!this._guiIntro) return;

                    this._guiIntro.createPanel.textCountDown.text = `${event.data.count}`;
                    this._guiIntro.createGamePanel.textCountDown.text = `${event.data.count}`;

                })
            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.showNoEntry && this._startPressed),
                //tap(e => { console.log("EventType.showNoEntry", e) }),
                tap(event => {
                    setDialogTextPanel(this._guiIntro!!, "GAME FULL", false, false);
                }),

            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter(e => e.type == EventTypeOut.showGameInProgress),
                //tap(e => { console.log("EventType.showGameInProgress", e) }),
                map(e => e.data as gameEnterEvent),
                tap(e => {
                    setPlayersPanel(this._guiGame!!);
                    initPlayersPanel(this._guiGame!!, e);
                    setDialogTextPanel(this._guiGame!!, "GAME IN PROGRESS", false, false);

                    this._nextSceneType = SceneType.InGame;
                    this._timerStart = 2;

                    this._setGameScene(e)

                })

            ).subscribe();

        this._api.onPrivateEvent<IEvent>()
            .pipe(
                filter((e) => e.type == EventTypeOut.showGame),
                //tap(e => { console.log("EventType.showGame", e) }),
                map(e => e.data as gameEnterEvent),
                tap(e => {
                    setPlayersPanel(this._guiGame!!);
                    initPlayersPanel(this._guiGame!!, e);

                    this._myGamePosition = e.myGamePosition;

                    this._guiGame!!.dialogTextPanel.container.isVisible = true;
                    this._guiGame!!.dialogTextPanel.text.text = `Collect ${e.players[e.myGamePosition].colorName} ball and return to base to win!`;
                    this._guiGame!!.dialogTextPanel.text.color = e.players[e.myGamePosition].colorName

                    this._nextSceneType = SceneType.InGame;
                    this._timerStart = 2;

                    this._setGameScene(e)

                })
            ).subscribe();

        this._api.onPublicEvent<IEvent>()
            .pipe(
                filter(e => e.type == EventTypeOut.gameSnapshot),
                map(e => e.data as gameSnapshotEvent),
                //tap(e => console.log(e)),
                //filter(e => Object.keys(e.players).length > 0),
                tap(snapshot => {

                    this._currentGameState = snapshot.gameState;

                    if (snapshot.gameState == GameState.gameStart && this._myGamePosition != undefined) {
                        this._guiGame!!.dialogTextPanel.container.isVisible = true;
                    } else {
                        this._guiGame!!.dialogTextPanel.container.isVisible = false;

                    }


                    updatePlayersPanel(this._guiGame!!, snapshot);

                    if (snapshot.gameState == GameState.gameOver) {
                        setDialogTextPanel(this._guiGame!!, "Game Over", true, false)
                    }
                })
            ).subscribe();

        var sceneGame = new Scene(this._engine);
        var sceneIntro = new Scene(this._engine);

        this._guiIntro = await initGui(sceneIntro, this._api);
        this._guiGame = await initGui(sceneGame, this._api);

        await this._createGameScene(sceneGame);
        await this._createIntroScene(sceneIntro);

        // this._start = new Sound("start", `${this._api.assetsRoot}/m.intro.mp3`, sceneIntro, undefined, {
        //     loop: true,
        //     autoplay: true
        // });

        //this._start?.setVolume(0.01);

    }

    private async _createIntroScene(scene: Scene) {

        var camera = new ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-100), BABYLON.Tools.ToRadians(60), 1.8, new Vector3(0, 0.3, 0), scene);
        scene.activeCamera = camera;
        camera.fov = 1.1;

        // #8c9797
        scene.clearColor = Color4.FromHexString("#8c9797");

        camera.attachControl(this._canvas, true);

        camera.minZ = 0.1;
        camera.wheelPrecision = 100;

        var light = new SpotLight(`player-spotlight`, new Vector3(0, 3, 0), Vector3.Down(), Math.PI / 6, 50, scene);
        light.intensity = 0;

        var playerAssetContainer = await this._loadPlayerAsset(scene);

        this._createGround(scene);
        var { playerModel, playerMaterial } = this._createPlayer(scene, playerAssetContainer, 0, light);

        playerMaterial.alpha = 1;

        this._introPlayerMaterial = playerMaterial;

        var mesh = playerModel.rootNodes[0];

        mesh.rotation = new Vector3(0, 2 * Math.PI, 0);

        mesh.position.y = 0.1;

        //playerModel.animationGroups.forEach(f => f.stop());
        playerModel.animationGroups.find(f => f.name == `player-0-running`)?.start(true, 1.0);

        this._introScene = scene;

        this._configureGui();

        setStartPanel(this._guiIntro!!);

        this._nextSceneType = SceneType.Intro;

    }

    private async _createGameScene(scene: Scene) {

        var camera = new ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-90), BABYLON.Tools.ToRadians(50), 8, new Vector3(0, 0.3, 0), scene);
        scene.activeCamera = camera;
        camera.fov = 1.1;

        // #8c9797
        scene.clearColor = Color4.FromHexString("#8c9797");

        camera.attachControl(this._canvas, true);

        camera.minZ = 0.1;
        camera.wheelPrecision = 100;

        var playerAssetContainer = await this._loadPlayerAsset(scene);

        this._arena = this._createArena(scene, playerAssetContainer, 6);
        this._gameScene = scene;

    }

    private _setGameScene(gameEnterEvent: gameEnterEvent) {

        new inGame(this._gameScene!!, this._api, this._arena!!, this._gameLoop!!, gameEnterEvent);
    }

    private _setScene() {
        if (this._nextSceneType != this._currentSceneType) {

            switch (this._nextSceneType) {
                case SceneType.Intro:
                    this._activeScene = this._introScene;
                    
                    break;
                case SceneType.InGame:
                    this._activeScene = this._gameScene;
                    break;
                case SceneType.Gameover:
                    break;
            }

            if (this._activeScene == undefined) {
                // console.log("activeScene == undefined", SceneType[this._currentSceneType], SceneType[this._nextSceneType])
                return;
            }

            this._currentSceneType = this._nextSceneType;
        }
    }



    private async _loadPlayerAsset(scene: Scene): Promise<AssetContainer> {

        return new Promise(resolve => {

            SceneLoader.LoadAssetContainer(`${this._api.assetsRoot}/`, "running-man.glb", scene, (container) => {

                container.addAllToScene();

                resolve(container);
            });

        });

    }

    private _configureGui() {

        var startPanel = this._guiIntro!!.startPanel;
        var createGamePanel = this._guiIntro!!.createGamePanel;
        var createPanel = this._guiIntro!!.createPanel;
        var waitingPanel = this._guiIntro!!.waitingPanel;

        startPanel.buttonStart.onPointerClickObservable.add(() => {
            this._isCreator = false;
            this._startPressed = true;

            this._api.playerEnter();

            this._api.sendToBackend(<IEvent>{
                type: EventTypeIn.playerStart,
                data: {}
            });

            

        });

        // await panel

        waitingPanel.buttonStart.onPointerClickObservable.add(() => {
            if (this._isCreator) {
                this._api.sendToBackend(<IEvent>{
                    type: EventTypeIn.requestStartGame,
                    data: {}
                });
            }
        })

        // create panel

        createPanel.buttonGo.onPointerClickObservable.add(() => {

            if (this._guiIntro?.createPanel.input.text) {
                this._playerName = this._guiIntro?.createPanel.input.text;
            }

            this._api.sendToBackend(<IEvent>{
                type: EventTypeIn.requestEnterGame,
                data: <requestEnterEvent>{
                    playerName: this._playerName
                }
            });

        });

        // create game panel

        createGamePanel.slider.onValueChangedObservable.add(data => {

            createGamePanel.textPlayerCount.text = `${data}`;

            // console.log(`Slider text: ${createGamePanel.textPlayerCount.text}, slider value: ${createGamePanel.slider.value}`);

        })

        // createGamePanel.buttonGo.onPointerClickObservable.add(() => {

        //     this._players = this._guiIntro?.createGamePanel.slider.value ?? 2;

        //     if (this._isCreator) {

        //         console.log("RequestCreate", this._playerName, this._players)
        //         this._api.sendToBackend(<IEvent>{
        //             type: EventTypeIn.requestCreate,
        //             data: <createGameEvent>{
        //                 playerName: this._playerName,
        //                 playerCount: this._players
        //             }
        //         })

        //     }
        // });

    }

    private _createPlayers(scene: Scene, playerAssetContainer: AssetContainer, playerCount: number): IPlayer[] {


        var playerLights: { [gamePosition: number]: SpotLight } = this._createPlayerLights(scene, playerCount);


        // console.log(`createPlayers`, playerCount)

        var players: IPlayer[] = [];

        for (let gamePosition = 0; gamePosition < playerCount; gamePosition++) {

            var { playerModel, playerMaterial } = this._createPlayer(scene, playerAssetContainer, gamePosition, playerLights[gamePosition]);

            var mesh = playerModel.rootNodes[0].getChildMeshes()[0];

            // create Player Home Zone
            var homeZoneSphere = MeshBuilder.CreateSphere(`player-${gamePosition}-homezone-sphere`, { diameter: 1.25 }, scene);
            homeZoneSphere.position.z = 1;

            var hzMaterial = new StandardMaterial(`player-${gamePosition}-homezone-sphereMaterial`, scene);
            //hzMaterial.diffuseColor = this._getColor(playerPosition);
            hzMaterial.alpha = 0;
            homeZoneSphere.material = hzMaterial;

            var homeZoneLight = new SpotLight(`player-${gamePosition}-homezone-sphere-spotlight`, new Vector3(0, 3, 1), Vector3.Down(), Math.PI / 6, 50, scene!!);
            homeZoneLight.diffuse = new Color3(1, 1, 0);
            homeZoneLight.intensity = 0;

            var homeZone = <IHomeZone>{
                mesh: homeZoneSphere,
                spotLight: homeZoneLight
            }

            // create Player Ball
            var ballSphere = MeshBuilder.CreateSphere(`player-${gamePosition}-ball-sphere`, { diameter: 0.35 }, scene);
            var ballMaterial = new StandardMaterial(`player-${gamePosition}-ball-sphereMaterial`, scene);
            //ballMaterial.diffuseColor = this._getColor(playerPosition);
            ballMaterial.alpha = 0;
            ballSphere.material = ballMaterial;

            var ballLight = new SpotLight(`player-${gamePosition}-ball-sphere-spotlight`, new Vector3(0, 3, 1), Vector3.Down(), Math.PI / 6, 50, scene!!);
            //ballLight.diffuse = new Color3(1, 1, 0);
            ballLight.intensity = 0;

            var info = ballSphere.getBoundingInfo();

            //console.log("minimum", info.minimum);
            //console.log("maximum", info.maximum);

            let min = new Vector3(-2, -2, -6);
            let max = new Vector3(2, 2, 2);

            mesh.setBoundingInfo(new BoundingInfo(min, max));

            var ball = <IBall>{
                mesh: ballSphere,
                material: ballMaterial,
                spotLight: ballLight,
                ballState: BallState.disabled,
                playerRef: gamePosition,
                rotationY: 0
            }

            //mesh.position.y = -100;
            ballSphere.position.y = -100;

            players.push(<IPlayer>{
                gamePosition: gamePosition,
                material: playerMaterial,
                model: playerModel,
                //spotLight: this._playerLights[gamePosition],
                homeZone: homeZone,
                ball: ball,
                playerState: PlayerState.idle,
                playerGameState: PlayerGameState.disabled
                // playerExit: (
                //     (ballMaterial, hzMaterial, mesh) => {
                //         return () => {
                //             console.log("Exit player");
                //             hzMaterial.alpha = 0;
                //             ballMaterial.alpha = 0;
                //             mesh.scaling.scaleInPlace(0);

                //             var activeCamera = new ArcRotateCamera("camera", BABYLON.Tools.ToRadians(-90), BABYLON.Tools.ToRadians(40), 10, Vector3.Zero(), scene);
                //             activeCamera.setTarget(Vector3.Zero());
                //             activeCamera.wheelPrecision = 10;
                //             activeCamera.attachControl(this._canvas, true);
                //             scene.activeCamera = activeCamera;
                //         }

                //     })(ballMaterial, hzMaterial, mesh)
            });
        }


        return players;
    }

    private _createPlayer(scene: Scene, playerAssetContainer: AssetContainer, gamePosition: number, playerLight: SpotLight) {

        var [colorName, color] = this._colorList[gamePosition];

        var playerMaterial = new StandardMaterial(`player-${gamePosition}-playerMaterial`, scene);
        playerMaterial.diffuseTexture = new Texture(`${this._api.assetsRoot}/man-${colorName}.png`, scene);
        playerMaterial.specularColor = color;

        var playerModel = playerAssetContainer.instantiateModelsToScene(name => `player-${gamePosition}-${name}`, true);

        playerMaterial.alpha = 0;

        var mesh = playerModel.rootNodes[0].getChildMeshes()[0];

        // console.log(playerModel.rootNodes);
        // console.log(mesh.name);
        mesh.scaling.scaleInPlace(20);
        mesh.material = playerMaterial;

        //Get the run animation Group
        const idleAnim = playerModel.animationGroups.find(x => x.name == `player-${gamePosition}-idle`);

        // console.log(idleAnim);
        //Play the run animation  
        idleAnim?.start(true, 1.0, idleAnim.from, idleAnim.to, false);

        // Create Shadows
        var shadowGenerator = new ShadowGenerator(1024, playerLight);
        shadowGenerator.addShadowCaster(mesh);
        shadowGenerator.useExponentialShadowMap = true;

        return { playerModel, playerMaterial };
    }

    private _createPlayerLights(scene: Scene, playerCount: number): { [gamePosition: number]: SpotLight } {

        var playerLights: { [gamePosition: number]: SpotLight } = {};

        for (let gamePosition = 0; gamePosition < playerCount; gamePosition++) {

            var light = new SpotLight(`player-${gamePosition}-spotlight`, new Vector3(gamePosition, 3, 0), Vector3.Down(), Math.PI / 6, 50, scene);
            light.intensity = 0;

            playerLights[gamePosition] = light;
        }

        return playerLights
    }

    private _createArena(scene: Scene, playerAssetContainer: AssetContainer, playerCount: number): IArena {

        console.log(`CreateArena; playerCount: ${playerCount}`);

        var ground = this._createGround(scene);

        var hemi1 = new HemisphericLight("HemiLight", new Vector3(0, -1, 0), scene);
        hemi1.intensity = 1;
        hemi1.groundColor = new BABYLON.Color3(1, 1, 1);
        hemi1.specular = BABYLON.Color3.Black();

        hemi1.excludedMeshes.push(ground);

        var players = this._createPlayers(scene, playerAssetContainer, playerCount)

        return <IArena>{
            ground: ground,
            players: players
        }
    }

    private _createGround(scene: Scene) {

        var ground = MeshBuilder.CreateGroundFromHeightMap("ground", `${this._api.assetsRoot}/floor_bump.PNG`, { width: 15, height: 15, minHeight: 0, maxHeight: 1, subdivisions: 100 }, scene);
        var groundMaterial = new StandardMaterial("groundMaterial", scene);
        groundMaterial.diffuseTexture = new Texture(`${this._api.assetsRoot}/ground.jpg`, scene);
        ground.material = groundMaterial;
        (groundMaterial.diffuseTexture as any).uScale = 6;
        (groundMaterial.diffuseTexture as any).vScale = 6;
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
        ground.material = groundMaterial;
        ground.receiveShadows = true;
        ground.position.y = -0.55;

        var lightH1 = new HemisphericLight("light1", new Vector3(0, 0, -1), scene);
        lightH1.intensity = 1;

        // var lightH2 = new HemisphericLight("light1", new Vector3(0, 0, 0), scene!!);
        // lightH2.intensity = 0.3;

        return ground;
    }
}