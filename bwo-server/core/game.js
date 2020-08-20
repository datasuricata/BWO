import {saveState, loadState} from '../resources/data/state_manager.js'
import * as enemysController from "./entity/enemy/enemys.js";
import * as playerController from "./entity/player/players.js";

export default function startServer() {
    const state = loadState();
    setInterval(() => {
        saveState(state);
    }, 10000);

    playerController.setup(state, notifyAllOnRangeOfPlayer, notifyAllOnRangeOfArea, enemysController, notifyAll, removeSocket);

    // make enemy random walk
    setInterval(() => enemysController.patrolArea(state, (enemysMoved) => {
        Object.entries(enemysMoved).forEach(enemy => {
            var mPoint = {x: enemy[1].x, y: enemy[1].y};
            notifyAllOnRangeOfArea({
                type: 'onEnemysWalk',
                point: mPoint,
                enemys: enemysMoved
            },false)
        });
        
    }), 3500);

    // make enemys attack players
    setInterval(() => enemysController.attackPlayerIfInRange(state, (command) =>{
        notifyAllOnRangeOfPlayer({
            ...command,
            type: 'onEnemyTargetingPlayer',
        })
    }), 500);

    setInterval(() => enemysController.simulateMove(state, (command, point) =>{
        notifyAllOnRangeOfArea({
            type: 'onEnemysWalk',
            point: point,
            enemys: command
        })
    }), 500);

    // setInterval(() => {
    //     playerController.update();
    // }, 2000);

    const observers = []

    function subscribe(observerFunction) {
        observers.push(observerFunction)
    }

    function notifyAll(command) {
        for (const observerFunction of observers) {
            observerFunction(command)
        }
    }

    const socketList = []
    function addSocket(socket) {
        socketList.push(socket)
    }
    function removeSocket(id) {
        delete socketList[id]
    }
    function notifyAllOnRangeOfPlayer(command, ignoreSelf = false) {
        //console.log(`> notifyAllOnRangeOfPlayer:`, command, `(${state.statistics.msgRecived}) `)
        var type = command.type;
        var allPlayers = getAllPlayersAround(command.playerId, ignoreSelf);
        command.action == undefined? delete command.action: null;
        
        for (const skt of socketList) {
            if (allPlayers[skt.id] != undefined) {
                delete command.type
                skt.emit(type, command)
                
                state.statistics.msgSent ++
            }
        }
    }
    function notifyAllOnRangeOfArea(command, showlog = false) {
        showlog? console.log(`> `,command) : null;
        var type = command.type
        var allPlayers = getAllPlayersAroundPoint(command.point)
        delete command.point
        
        for (const skt of socketList) {
            if (allPlayers[skt.id] != undefined) {
                delete command.type
                skt.emit(type, command)

                state.statistics.msgSent ++
            }

        }
    }

    function getAllPlayersAround(playerId, ignoreSelf = true) {
        var mPlayer = state.players[playerId]
        var width = 350
        var height = 500

        var playersArray = Object.entries(state.players).filter((player) => {
            var isSelf = player[1].playerId == playerId;

            return ((isSelf && ignoreSelf == false) || !isSelf)
                && player[1].x > mPlayer.x - width
                && player[1].y > mPlayer.y - height
                && player[1].x < mPlayer.x + width
                && player[1].y < mPlayer.y + height;
        });

        var playersObject = Object.fromEntries(playersArray);
        return playersObject;
    }

    function getAllPlayersAroundPoint(point) {
        var width = 350
        var height = 500

        var playersArray = Object.entries(state.players).filter((player) => {
            return player[1].x > point.x - width
                && player[1].y > point.y - height
                && player[1].x < point.x + width
                && player[1].y < point.y + height;
        });

        var playersObject = Object.fromEntries(playersArray);
        return playersObject;
    }

    function getAllEnemysAround(playerId){
        var mPlayer = state.players[playerId]
        var width = 350
        var height = 500

        var enemyListAroundPlayer = enemysController.getEnemysAroundPlayer(mPlayer, state.enemys, width, height)

        return enemyListAroundPlayer;
    }

    return {
        getAllPlayersAround,
        getAllEnemysAround,
        subscribe,
        state,
        addSocket,
        playerController
    }
}

