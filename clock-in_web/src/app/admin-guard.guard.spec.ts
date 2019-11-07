import { TestBed, async, inject } from '@angular/core/testing';

import { AdminGuardGuard } from './admin-guard.guard';

describe('AdminGuardGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminGuardGuard]
    });
  });

  it('should ...', inject([AdminGuardGuard], (guard: AdminGuardGuard) => {
    expect(guard).toBeTruthy();
  }));
});
