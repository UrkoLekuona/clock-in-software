import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ClockHistoryComponent } from './clock-history.component';

describe('ClockHistoryComponent', () => {
  let component: ClockHistoryComponent;
  let fixture: ComponentFixture<ClockHistoryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ClockHistoryComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ClockHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
