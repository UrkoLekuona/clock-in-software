import { Injectable } from "@angular/core";
import { CanActivate, Router } from "@angular/router";

import { UserService } from "./user.service";

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) {}

  canActivate() {
    if (this.userService.token !== undefined && this.userService.lastLogin.admin) {
      return true;
    } else {
      this.router.navigate(["/login"]);
      return false;
    }
  }
}
