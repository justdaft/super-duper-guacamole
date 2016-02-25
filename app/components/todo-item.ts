import {Component, ChangeDetectionStrategy, Output, Input, EventEmitter} from 'angular2/core';
import {IGame} from '../reducers/games';


@Component({
    selector: 'game-item',
    template: `
    <li >
        <strong [class.complete]='game.completed'>{{game.id}}</strong>
        <button
            (click)='toggleGame.emit(game)'>
            {{game.completed ? 'Undo' : 'Complete'}}
        </button>
    </li>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class GameItem {
    @Input() game: IGame;
    @Output() toggleGame: EventEmitter<IGame> = new EventEmitter<IGame>();
}
