import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

import * as moment from 'moment';

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

  issue(value) {
    let body = new URLSearchParams();
    body.set('id', value.id);
    body.set('date', value.date);
    body.set('text', value.text);
    body.set('nInDate', value.nInDate);
    body.set('nOutDate', value.nOutDate);
    console.log(value);
    console.log(body.toString());
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/issue', body.toString(), options);
  }

  issueform(value) {
    let body = new URLSearchParams();
    body.set('issue', value.text);
    body.set('date', moment(value.date).format('DD/MM/YYYY'));
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/issueform', body.toString(), options);
  }

  allUsers() {
    return this.http.get(this.protocol + this.webserver + this.api + '/allUsers', this.httpOptions);
  }

  clocksBetweenDates(value) {
    let body = new URLSearchParams();
    body.set('minDate', moment(value.clock_since).format('DD/MM/YYYY'));
    body.set('maxDate', moment(value.clock_until).format('DD/MM/YYYY'));
    body.set('user', value.user);
    let options = this.httpOptions;
    options.observe = 'response' as "body";
    return this.http.post(this.protocol + this.webserver + this.api + '/clocksBetweenDates', body.toString(), options);
  }
}
