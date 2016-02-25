import {Component} from 'angular2/core
import {GameList} from './components/game-list';
import {GamesViewModel, GamesVm} from './components/games-viewmodel';
import {VisibilityFilterActions} from './actions/visibility-filter.actions';
import {GamesActions} from './actions/games.actions';
@Component({
    selector: 'my-app',
    templateUrl: './app/app.html',
    directives: [GameList],
 providers: [GamesViewModel]
})
export class App {
  viewModel: GamesVm;

    constructor(
      public gamesVm: GamesViewModel,
      public gamesActions: GamesActions,
      public visibilityFilterActions: VisibilityFilterActions
      ) {
      this.gamesVm.viewModel$.subscribe(vm => this.viewModel = vm);
    }
  }
