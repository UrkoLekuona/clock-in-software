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
    admin: boolean
  } = {
    date: "",
    type: "",
    admin: false
  };

  constructor() {}

  fillFields(username, token?, lastLogin?: { date: string, type: string, admin: boolean }) {
    this.username = username;
    if (token) this.token = token;
    if (lastLogin) {
      if (lastLogin.date) this.lastLogin.date = lastLogin.date;
      if (lastLogin.type) this.lastLogin.type = lastLogin.type;
      if (lastLogin.admin) this.lastLogin.admin = lastLogin.admin;
    }
  }

  logout() {
    this.username = "";
    this.token = "";
    this.lastLogin = { date: "", type: "", admin: false };
  }
}
