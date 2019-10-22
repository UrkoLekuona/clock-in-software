import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  protocol = 'http://';
  webserver = 'localhost:8080';
  api = '';
  httpOptions: any = {
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded'),
    observe: 'body' as "body"
  };

  constructor(private http: HttpClient) { }

  login(value) {
    let body = new URLSearchParams();
    body.set('username', value.username);
    body.set('password', value.password);
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/login', body.toString(), options);
  }

  lastclock(value) {
    let body = new URLSearchParams();
    body.set('type', value);
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/lastclock', body.toString(), options);
  }

  clock(value) {
    let body = new URLSearchParams();
    body.set('type', value);
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/clock', body.toString(), options);
  }
}
