import {
  HttpInterceptor,
  HttpHandler,
  HttpRequest,
  HttpEvent
} from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { UserService } from "./user.service";

@Injectable()
export class RequestInterceptor implements HttpInterceptor {
  constructor(private userService: UserService) {}
  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const idToken = this.userService.token;

    if (idToken) {
      const cloned = req.clone({
        headers: req.headers.set("Authorization", "Bearer " + idToken)
      });

      return next.handle(cloned);
    } else {
      return next.handle(req);
    }
  }
}
