import { Color3 } from "babylonjs";

export interface IntroEvent {
    playerPosition: number,
    availableColors: { [name: string] : Color3 }
}