import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  username: string;
  token: string;
  lastLogin: {
    type: string,
    date: string
  } = {
    type: '',
    date: ''
  };

  constructor() { }

  fillFields(username, token?, lastLogin?: { type: string, date: string}){
    this.username = username;
    if (token) this.token = token;
    if (lastLogin) {
      if (lastLogin.type) this.lastLogin.type = lastLogin.type;
      if (lastLogin.date) this.lastLogin.date = lastLogin.date;
    }
  }
}
