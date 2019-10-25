import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class UserService {
  username: string;
  token: string;
  lastLogin: {
    date: string;
  } = {
    date: ""
  };

  constructor() {}

  fillFields(username, token?, lastLogin?: { date: string }) {
    this.username = username;
    if (token) this.token = token;
    if (lastLogin) {
      if (lastLogin.date) this.lastLogin.date = lastLogin.date;
    }
  }

  logout() {
    this.username = "";
    this.token = "";
    this.lastLogin = { date: "" };
  }
}
