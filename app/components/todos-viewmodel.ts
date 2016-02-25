import {Injectable} from 'angular2/core';
import {Store} from '@ngrx/store';
import {Observable} from 'rxjs/Observable';
import {Game} from '../reducers/games';

export interface GamesVm {
  games: IGame[],
  totalGames: number,
  completedGames: number
}

@Injectable()
export class GamesViewModel {
  public viewModel$: Observable<GamesVm>;
  constructor(
    private store: Store<any>
    ) {
    this.viewModel$ = Observable.combineLatest(
      store.select('games'),
      store.select('visibilityFilter'),
      (games: Array<IGame>, visibilityFilter: string) => {
        return {
          games: this.visibleGames(games, visibilityFilter),
          totalGames: games.length,
          completedGames: games.filter((game: Game) => game.completed).length
        }
      }
      );
  }

  private visibleGames(games: Array<IGame>, filter: string): IGame[] {
    switch (filter) {
      case 'SHOW_ALL':
        return games;
      case 'SHOW_COMPLETED':
        return games.filter(t => t.completed);
      case 'SHOW_ACTIVE':
        return games.filter(t => !t.completed);
    }
  }
}
