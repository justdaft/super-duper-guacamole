
import {Reducer, Action} from '@ngrx/store';


export interface IGame {
  id: number;
  playerName: string;
  tiles: any;
  matchedPairs: number;
  turnsTaken: number;
  dateCreated: any;
  completed: boolean;
};

export const ADD_GAME = 'ADD_GAME';
export const TOGGLE_GAME = 'TOGGLE_GAME';

const game: Reducer<IGame> = (state: IGame, action: Action) => {
  switch (action.type) {
    case ADD_GAME:
      return {
        id: action.payload.id,
        playerName: action.payload.playerName,
        tiles: action.payload.tiles,
        matchedPairs: action.payload.matchedPairs,
        turnsTaken: action.payload.turnsTaken,
        dateCreated: Date.now(),
        completed: action.payload.completed
      };
    case TOGGLE_GAME:
      if (state.id !== action.payload.id) {
        return state;
      }
      return Object.assign({}, state, {
        completed: !state.completed
      });
    default:
      return state;
  }
};

export const games: Reducer<IGame[]> = (state: IGame[] = [], action: Action) => {
  switch (action.type) {
    case ADD_GAME:
      return [
        ...state,
        game(undefined, action)
      ];
    case TOGGLE_GAME:
      return state.map(t => game(t, action));
    default:
      return state;
  }
};
