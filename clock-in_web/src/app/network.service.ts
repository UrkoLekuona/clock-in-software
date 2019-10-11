import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {

  protocol = 'http://';
  webserver = 'localhost:8080';
  api = '';
  httpOptions = {
    headers: new HttpHeaders().set('Content-Type', 'application/x-www-form-urlencoded')
  };

  constructor(private http: HttpClient) { }

  login(value) {
    let body = new URLSearchParams();
    body.set('username', value.username);
    body.set('password', value.password);
    return this.http.post(this.protocol + this.webserver + this.api + '/login', body.toString(), this.httpOptions);
  }
}
