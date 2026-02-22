import { TestBed } from '@angular/core/testing';

import { UiEventBusService } from './ui-event-bus.service';

describe('UiEventBusService', () => {
  let service: UiEventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UiEventBusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
