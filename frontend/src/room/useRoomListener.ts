import { Accessor, Setter, createSignal } from "solid-js";
import { DOMAIN } from "../App";
import { Payload, JOIN_CODE, PlayerMsg, Player } from "./messages";

type RoomEvent = (payload: Payload) => void;
type RoomStatus = "opened" | "closed" | "error" | "unopened" | "noexist";

export interface RoomConn {
    send: <T extends Payload>(payload: T) => void;
    subscribe: (code: number, event: RoomEvent) => void;
    players: Accessor<Player[]>;
    status: Accessor<RoomStatus>;
}

function getLocalPlayer() {
    return localStorage.getItem("player") ?? "";
}

export const useRoomConnection = (roomCode: string): RoomConn => {
    let name = getLocalPlayer();

    let socket = new WebSocket(`ws://${DOMAIN}/rooms/join?code=${roomCode}&name=${name}`);
    socket.addEventListener("message", e => console.log("Receiving message", e.data));

    const [status, setStatus] = createSignal<RoomStatus>("unopened");
    socket.addEventListener("close", () => {
        if (status() !== "opened") {
            setStatus("noexist");
        } else {
            setStatus("closed");
        }
    });
    socket.addEventListener("open", () => setStatus("opened"))

    const send = (payload: Payload) => {
        console.log("Sending message", payload);
        socket.send(JSON.stringify(payload));
    };

    const subscribe = (code: number, event: RoomEvent) => {
        socket.addEventListener("message", (e) => {
            const payload = JSON.parse(e.data) as Payload;
            if (payload.code === code) {
                event(payload);
            }
        });
    };

    const [players, setPlayers] = createSignal<Player[]>([]);
    subscribe(JOIN_CODE, (payload) => {
        const msg = payload.msg as PlayerMsg;
        const newPlayers = [...players()];
        newPlayers[msg.playerIndex] = msg.player;
        setPlayers(newPlayers);
    });

    return {send, subscribe, players, status};
}