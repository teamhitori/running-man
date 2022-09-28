import { mergeObj } from "./components/utils/mergeObj";


var logs = [
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 3, 3 ] ],
    [ 'player-1 touching ball-1!!', [ 1, 0 ] ],
    [ 'player-1 touching ball-1!!', [ 1, 0 ] ],
    [ 'player-1 touching ball-1!!', [ 1, 0 ] ]
  ]

  var logObjs = {};

  for (const log of logs) {

      logObjs = mergeObj(logObjs, log)
  }


console.log("res", logObjs);

