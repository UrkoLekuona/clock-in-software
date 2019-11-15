import { NativeDateAdapter } from "@angular/material";
import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class MyDateAdapter extends NativeDateAdapter {
  getFirstDayOfWeek(): number {
    return 1;
  }
}
