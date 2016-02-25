import 'zone.js';
import 'reflect-metadata';
import {bootstrap} from 'angular2/platform/browser';
import {App} from './app';
import {provideStore} from '@ngrx/store';
import {APP_REDUCERS} from './reducers/reducers';
import {APP_ACTIONS} from './actions/actions';



bootstrap(App, [
  ELEMENT_PROBE_PROVIDERS,
  APP_ACTIONS,
  provideStore(APP_REDUCERS)
]);
