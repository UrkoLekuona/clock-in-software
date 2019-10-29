import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root"
})
export class UserService {
  username: string;
  token: string;
  lastLogin: {
    date: string;
    type: string;
  } = {
    date: "",
    type: ""
  };

  constructor() {}

  fillFields(username, token?, lastLogin?: { date: string, type: string }) {
    this.username = username;
    if (token) this.token = token;
    if (lastLogin) {
      if (lastLogin.date) this.lastLogin.date = lastLogin.date;
      if (lastLogin.type) this.lastLogin.type = lastLogin.type;
    }
  }

  logout() {
    this.username = "";
    this.token = "";
    this.lastLogin = { date: "", type: "" };
  }
}
