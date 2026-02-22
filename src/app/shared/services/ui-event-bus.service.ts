import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

interface UiEvent {
  type: string;
  payload?: any;
}

@Injectable()
export class UiEventBus {
  private events$ = new Subject<UiEvent>();

  emit(type: string, payload?: any) {
    this.events$.next({ type, payload });
  }

  on<T>(type: string): Observable<T> {
    return this.events$.pipe(
      filter(e => e.type === type),
      map(e => e.payload as T)
    );
  }

  clear() {
    this.events$.complete();
  }
}