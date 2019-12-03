import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminClockDialogComponent } from './admin-clock-dialog.component';

describe('AdminClockDialogComponent', () => {
  let component: AdminClockDialogComponent;
  let fixture: ComponentFixture<AdminClockDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AdminClockDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminClockDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
