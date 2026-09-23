import { AxisButtonType, PushButtonType, type ButtonType } from "./Joystick";

export type GameButtons = {
    shoot: PushButtonType;
    jump: PushButtonType;
    use: PushButtonType;
    move: AxisButtonType;
    runningMode: PushButtonType;
    dragViewDelta: AxisButtonType;
    screenClick: AxisButtonType;
    virtualCursorPosition: AxisButtonType;
};

export const createGameButtons = (): GameButtons => {
    return {
        shoot: new PushButtonType(),
        jump: new PushButtonType(),
        use: new PushButtonType(),
        move: new AxisButtonType(),
        runningMode: new PushButtonType(),
        dragViewDelta: new AxisButtonType(),
        screenClick: new AxisButtonType(),
        virtualCursorPosition: new AxisButtonType(),
    };
};
