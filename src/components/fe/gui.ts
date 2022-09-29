import { IFrontendApi } from "@frakas/api/public";
import { Color3, Scene, TextureAspect, Vector3 } from "babylonjs";
import { AdvancedDynamicTexture, BaseSlider, Button, Control, InputText, Slider, TextBlock } from "babylonjs-gui";
import { PlayerGameState, PlayerState } from "../../documents/common";
import { gameEnterEvent } from "../../documents/Events/gameEnterEvent";
import { gameSnapshotEvent } from "../../documents/Events/gameSnapshotEvent";
import { updateWaitingEvent } from "../../documents/Events/updateWaitingEvent";
import { GameState } from "../be/gameState";

export interface gui {

    playersPanel: playersPanel;
    startPanel: startPanel;
    createPanel: createPanel;
    createGamePanel: createGamePanel;
    waitingPanel: waitingPanel;
    dialogButtonPanel: dialogButtonPanel;
    dialogTextPanel: dialogTextPanel;
    dialogTextNoBorderPanel: dialogTextPanel;
    dialogTextNoBorder2Panel: dialogText2Panel;

}

export interface startPanel {

    container: Control,
    buttonStart: Button,
    logoImage: Control
}

export interface createPanel {

    container: Control,
    title: TextBlock,
    buttonGo: Button,
    input: InputText,
    textCountDown: TextBlock
}

export interface createGamePanel {

    container: Control,
    buttonGo: Button,
    textPlayerCount: TextBlock
    slider: Slider,
    textCountDown: TextBlock
}

export interface playersPanel {
    container: Control;
    players: [playerKey: TextBlock, playerValue: TextBlock][],
    textTimer: TextBlock

}

export interface waitingPanel {

    container: Control;
    players: [playerKey: TextBlock, playerValue: TextBlock][]
    textLink: TextBlock;
    textMessage: TextBlock;
    buttonStart: Button;
    textCountDown: TextBlock;
}

export interface dialogButtonPanel {
    container: Control;
    text: TextBlock;
    button: Button;
}

export interface dialogTextPanel {
    container: Control;
    text: TextBlock;
}

export interface dialogText2Panel {
    container: Control;
    text1: TextBlock;
    text2: TextBlock;
}

async function loadDialogNoBorder2Lines(scene: Scene, api: IFrontendApi): Promise<dialogText2Panel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("panel_dialogNoBorder2Lines-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_dialogNoBorder2Lines.json`);

    var panel = <dialogText2Panel>{
        container: guiTexture.getControlByName("container"),
        text1: guiTexture.getControlByName("Textblock1"),
        text2: guiTexture.getControlByName("Textblock2")
    };

    return panel;
}

async function loadDialogNoBorder(scene: Scene, api: IFrontendApi): Promise<dialogTextPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("panel_dialogNoBorder-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_dialogNoBorder.json`);

    var panel = <dialogTextPanel>{
        container: guiTexture.getControlByName("container"),
        text: guiTexture.getControlByName("Textblock")
    };

    return panel;
}


async function loadDialogTextPanel(scene: Scene, api: IFrontendApi): Promise<dialogTextPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("dialogTextPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_dialogText.json`);

    var panel = <dialogTextPanel>{
        container: guiTexture.getControlByName("container"),
        text: guiTexture.getControlByName("Textblock")
    };

    var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    panel.container.width = `${aspectRat * window.innerHeight}px`;

    return panel;

}

async function loadDialogButtonPanel(scene: Scene, api: IFrontendApi): Promise<dialogButtonPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("dialogButtonPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_dialogButton.json`);

    var panel = <dialogButtonPanel>{
        container: guiTexture.getControlByName("container"),
        text: guiTexture.getControlByName("Textblock"),
        button: guiTexture.getControlByName("Button"),
    };

    var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    panel.container.width = `${aspectRat * window.innerHeight}px`;

    return panel;

}

async function loadWaitingPanel(scene: Scene, api: IFrontendApi): Promise<waitingPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("waitingPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_waiting.json`);

    var players = [
        [guiTexture.getControlByName("text_key_gp0"), guiTexture.getControlByName("text_value_gp0")],
        [guiTexture.getControlByName("text_key_gp1"), guiTexture.getControlByName("text_value_gp1")],
        [guiTexture.getControlByName("text_key_gp2"), guiTexture.getControlByName("text_value_gp2")],
        [guiTexture.getControlByName("text_key_gp3"), guiTexture.getControlByName("text_value_gp3")],
        [guiTexture.getControlByName("text_key_gp4"), guiTexture.getControlByName("text_value_gp4")],
        [guiTexture.getControlByName("text_key_gp5"), guiTexture.getControlByName("text_value_gp5")]
    ]

    var panel = <waitingPanel>{
        container: guiTexture.getControlByName("container"),
        players: players,
        textLink: guiTexture.getControlByName("TextblockLink"),
        textMessage: guiTexture.getControlByName("TextblockMessage"),
        buttonStart: guiTexture.getControlByName("ButtonStart"),
        textCountDown: guiTexture.getControlByName("textCountDown")
    };

    panel.players.forEach(([playerKey, playerValue]) => {
        playerKey.text = "";
        playerValue.text = "";
    });

    var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    panel.container.width = `${aspectRat * window.innerHeight}px`;

    return panel;

}

async function loadPlayerPanel(scene: Scene, api: IFrontendApi): Promise<playersPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("playerPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_players.json`);

    var players = [
        [guiTexture.getControlByName("text_key_gp0"), guiTexture.getControlByName("text_value_gp0")],
        [guiTexture.getControlByName("text_key_gp1"), guiTexture.getControlByName("text_value_gp1")],
        [guiTexture.getControlByName("text_key_gp2"), guiTexture.getControlByName("text_value_gp2")],
        [guiTexture.getControlByName("text_key_gp3"), guiTexture.getControlByName("text_value_gp3")],
        [guiTexture.getControlByName("text_key_gp4"), guiTexture.getControlByName("text_value_gp4")],
        [guiTexture.getControlByName("text_key_gp5"), guiTexture.getControlByName("text_value_gp5")]
    ]

    var panel = <playersPanel>{
        container: guiTexture.getControlByName("container"),
        players: players,
        textTimer: guiTexture.getControlByName("TextblockTimer")
    };

    panel.players.forEach(([playerKey, playerValue]) => {
        playerKey.text = "";
        playerValue.text = "";
    });

    // var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    // panel.container.width = `${aspectRat * window.innerHeight}px`;

    return panel;
}

async function loadStartPanel(scene: Scene, api: IFrontendApi): Promise<startPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("startPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_start.json`);

    var panel = <startPanel>{
        container: guiTexture.getControlByName("container"),
        buttonStart: guiTexture.getControlByName("ButtonStart"),
        logoImage: guiTexture.getControlByName("Image"),
    }


    panel.logoImage.isVisible = false;


    return panel;

}

async function loadCreatePanel(scene: Scene, api: IFrontendApi): Promise<createPanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("createPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_create.json`);

    var panel = <createPanel>{
        container: guiTexture.getControlByName("container"),
        title: guiTexture.getControlByName("TextblockTitle"),
        buttonGo: guiTexture.getControlByName("ButtonGo"),
        input: guiTexture.getControlByName("InputText"),
        textCountDown: guiTexture.getControlByName("textCountDown")
    }

    var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    // console.log("Aspect Ratio:", aspectRat);

    panel.container.width = `${aspectRat * window.innerHeight}px`;
    panel.textCountDown.isVisible = false;

    return panel;

}

async function loadCreateGamePanel(scene: Scene, api: IFrontendApi): Promise<createGamePanel> {

    var guiTexture = AdvancedDynamicTexture.CreateFullscreenUI("createPanel-gui", true, scene);

    await guiTexture.parseFromURLAsync(`${api.assetsRoot}/panel_create_game.json`);

    var panel = <createGamePanel>{
        container: guiTexture.getControlByName("container"),
        buttonGo: guiTexture.getControlByName("ButtonGo"),
        slider: guiTexture.getControlByName("sliderPlayerCount"),
        textPlayerCount: guiTexture.getControlByName("TextPlayerCount"),
        textCountDown: guiTexture.getControlByName("textCountDown")
    }

    var aspectRat = Math.min(2 / 3, window.innerWidth / window.innerHeight);

    panel.container.width = `${aspectRat * window.innerHeight}px`;

    panel.slider.step = 1;

    return panel;
}

export async function initGui(scene: Scene, api: IFrontendApi): Promise<gui> {

    var startPanel = await loadStartPanel(scene, api);
    var playerPanel = await loadPlayerPanel(scene, api);
    var createPanel = await loadCreatePanel(scene, api);
    var createGamePanel = await loadCreateGamePanel(scene, api);
    var waitingPanel = await loadWaitingPanel(scene, api);
    var dialogButtonPanel = await loadDialogButtonPanel(scene, api);
    var dialogTextPanel = await loadDialogTextPanel(scene, api);
    var dialogTextNoBorderPanel = await loadDialogNoBorder(scene, api);
    var dialogTextNoBorder2Panel = await loadDialogNoBorder2Lines(scene, api);

    var gui = <gui>{
        startPanel: startPanel,
        playersPanel: playerPanel,
        createPanel: createPanel,
        createGamePanel: createGamePanel,
        waitingPanel: waitingPanel,
        dialogButtonPanel: dialogButtonPanel,
        dialogTextPanel: dialogTextPanel,
        dialogTextNoBorder2Panel: dialogTextNoBorder2Panel,
        dialogTextNoBorderPanel: dialogTextNoBorderPanel
    }

    resetGui(gui);

    return gui;
}

export function resetGui(gui: gui) {

    gui.playersPanel.container.isVisible = false;
    gui.startPanel.container.isVisible = false;
    gui.createPanel.container.isVisible = false;
    gui.createGamePanel.container.isVisible = false;
    gui.waitingPanel.container.isVisible = false;
    gui.dialogButtonPanel.container.isVisible = false;
    gui.dialogTextPanel.container.isVisible = false;
    gui.dialogTextNoBorderPanel.container.isVisible = false;
    gui.dialogTextNoBorder2Panel.container.isVisible = false;

    gui.playersPanel.container.isPointerBlocker = false;
    gui.startPanel.container.isPointerBlocker = false;
    gui.createPanel.container.isPointerBlocker = false;
    gui.createGamePanel.container.isPointerBlocker = false;
    gui.waitingPanel.container.isPointerBlocker = false;
    gui.dialogButtonPanel.container.isPointerBlocker = false;
    gui.dialogTextPanel.container.isPointerBlocker = false;
    gui.dialogTextNoBorderPanel.container.isPointerBlocker = false;
    gui.dialogTextNoBorder2Panel.container.isPointerBlocker = false;

    gui.waitingPanel.buttonStart.isVisible = false;
}

// export function updateCreatePanel(gui: gui, count: string) {
//     gui.createPanel.textCountDown.text = count;
// }

export function setPlayersPanel(gui: gui) {

    resetGui(gui);

    // console.log("Set Players panel")

    gui.playersPanel.container.isVisible = true;
    //gui.createPanel.container.isVisible = true;
}

export function setStartPanel(gui: gui) {

    resetGui(gui);

    // console.log("Set start panel")

    gui.dialogTextNoBorderPanel.text.text = "Running Man";
    gui.dialogTextNoBorderPanel.text.fontFamily = "gooddog";
    gui.dialogTextNoBorderPanel.text.fontSize = "60px";
    gui.dialogTextNoBorderPanel.container.isVisible = true; 

    gui.startPanel.container.isVisible = true;
    gui.startPanel.buttonStart.isVisible = true;
}

export function setCreateGamePanel(gui: gui) {
    resetGui(gui);

    // console.log("Set create game panel")

    gui.createGamePanel.container.isVisible = true;
    gui.createGamePanel.buttonGo.isVisible = true;
}


export function setCreatePanel(gui: gui, title: string) {
    resetGui(gui);

    // console.log("Set create panel");

    gui.createPanel.title.text = title;
    gui.createPanel.container.isVisible = true;
    gui.createPanel.buttonGo.isVisible = true;
}


export function setWaitingPanel(gui: gui) {
    resetGui(gui);

    // console.log("Set waiting panel")

    gui.waitingPanel.container.isVisible = true;
}

export function setGamePanel(gui: gui) {
    resetGui(gui);

    // console.log("Set game panel")

    gui.playersPanel.container.isVisible = true;
}

export function setDialogButtonPanel(gui: gui, text: string) {
    resetGui(gui);

    gui.dialogButtonPanel.container.isVisible = true;
    gui.dialogButtonPanel.text.text = text;
}

export function setDialogTextPanel(gui: gui, text: string, overlay: boolean, withBorder: boolean) {

    if (!overlay) {
        resetGui(gui);
    }

    if (withBorder) {

        gui.dialogTextPanel.container.isVisible = true;
        gui.dialogTextPanel.text.text = text;

    } else {

        gui.dialogTextNoBorderPanel.container.isVisible = true;
        gui.dialogTextNoBorderPanel.text.text = text;

    }

}

// enterEvent

export function initPlayersPanel(gui: gui, event: gameEnterEvent) {

    // console.log("initPlayersPanel", event);

    gui.playersPanel.players.forEach(([playerKey, playerValue], index) => {
        playerKey.text = "";

        var snapshot = event.players[index];

        if (!snapshot) return;

        playerKey.text = snapshot.playerName;
        playerKey.color = snapshot.colorName;

    });

}

export function updatePlayersPanel(gui: gui, event: gameSnapshotEvent) {

    gui.playersPanel.players.forEach(([playerKey, playerValue], index) => {

        event.players[index]?.forEach(snapshot => {
            playerValue.text = `${PlayerGameState[snapshot.playerGameState ?? PlayerGameState.ready]}`;
        });

    });

    gui.playersPanel.textTimer.text = `${event.gameTimer}`;

}

export function updateWaitingPlayers(gui: gui, event: updateWaitingEvent, isCreator: boolean) {

    resetGui(gui);

    gui.waitingPanel.container.isVisible = true;

    gui.waitingPanel.players.forEach(([playerKey, playerValue]) => {
        playerKey.text = "";
        playerValue.text = "";
    });

    gui.waitingPanel.textCountDown.text = `${event.countDown}`;

    // console.log("updateWaitingPlayers", event)

    for (let index = 0; index < event.maxPlayers; index++) {

        var [key, value] = gui.waitingPanel.players[index];

        if (event.players[index] == undefined) {
            key.text = `Player ${index + 1}`;
            value.text = "waiting"
            value.color = "#FF0000FF";
        } else {

            key.text = event.players[index].name;
            key.color = event.players[index].color;
            value.text = "ready"
            value.color = "#00FF00FF";
        }
    }

    if (event.players.length >= 2) {

        gui.waitingPanel.textMessage.color = "#00FF00FF";
        gui.waitingPanel.textMessage.text = "READY!!"

        if (isCreator) {
            gui.waitingPanel.buttonStart.isVisible = true;
        }
    }
}



