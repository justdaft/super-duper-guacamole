import {Component, ChangeDetectionStrategy, Input, Output, EventEmitter} from 'angular2/core';
import {TodoItem} from './game-item';
import {Game} from '../reducers/games';

@Component({
  selector: 'game-list',
  template: `
        <button (click)='visibility.emit('SHOW_ALL')'>All</button>
        <button (click)='visibility.emit('SHOW_COMPLETED')'>Completed</button>
        <button (click)='visibility.emit('SHOW_ACTIVE')'>Active</button>
        <div >
            <label for='name'>Game Description:</label>
            <input #game type='text' placeholder='Enter Game...'>
            <span>Completed Games: {{completedGames}}/{{totalGames}}</span>
        </div>
        <button class='pure-button pure-button-primary'
            (click)='createGame(game)'>
            Add Game
        </button>
        <ul>
            <game-item
                *ngFor='#game of games'
                [game]='game'
                (toggleGame)='toggleGame.emit($event)'>
            </game-item>
        </ul>

    `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  directives: [GameItem]
})
export class GameList {
  @Input() games: IGame[];
  @Input() completedGames: number;
  @Input() totalGames: number;
  @Output() addGame: EventEmitter<string> = new EventEmitter<string>();
  @Output() toggleGame: EventEmitter<IGame> = new EventEmitter<IGame>();
  @Output() visibility: EventEmitter<string> = new EventEmitter<string>();

  createGame(element) {
    this.addGame.emit(element.value);
    element.value = '';
  }
}
