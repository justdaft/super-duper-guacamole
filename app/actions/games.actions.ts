import {Injectable} from 'angular2/core';
import {Store, Action} from '@ngrx/store';
import {IGame, ADD_GAME, TOGGLE_GAME} from '../reducers/games';
import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/Rx';

@Injectable()
export class GamesActions {
  private actions$: BehaviorSubject<Action> = new BehaviorSubject({ type: null, payload: null });
  private id: number = 1;


  constructor(private store: Store<any>) {
    const addGame = this.actions$
      .filter((action: Action) => action.type === ADD_GAME);

    const toggleGame = this.actions$
      .filter((action: Action) => action.type === TOGGLE_GAME);

    Observable
      .merge(addGame, toggleGame)
      .subscribe((action: Action) => store.dispatch(action));

  }

  addGame(text: string){
       this.actions$.next({type: ADD_GAME, payload: {id: this.id, text, completed: false}});
       this.id++;
   }

   toggleGame(game: IGame){
       this.actions$.next({type: TOGGLE_GAME, payload: game});
   }

}
